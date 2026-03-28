import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { NOTIFICATION_EVENTS } from '../notification/notification.events.js';
import type {
  CreateSessionDto,
  UpdateSessionDto,
  SessionQueryDto,
  GenerateSessionsDto,
  ApproveRescheduleDto,
  RequestRescheduleDto,
  TutorScheduleQueryDto,
  CompleteSessionDto,
} from './session.dto.js';
import { SessionStatus } from '../../../generated/prisma/client.js';
import { PayoutService } from '../payout/payout.service.js';
import {
  addDays,
  getDay,
  isAfter,
  isBefore,
  isEqual,
  startOfDay,
} from 'date-fns';

const DAY_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payoutService: PayoutService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private readonly sessionInclude = {
    class: {
      include: {
        subject: true,
        tutor: { include: { user: { select: { id: true, name: true } } } },
      },
    },
  };

  private buildSnapshotData(classRecord: any) {
    return {
      snapshot_tutor_id: classRecord.tutor_id ?? null,
      snapshot_tutor_name: classRecord.tutor?.user?.name ?? null,
      snapshot_subject_name: classRecord.subject?.name ?? null,
      snapshot_class_name: classRecord.name ?? null,
      snapshot_class_fee: classRecord.fee ?? null,
      snapshot_class_room: classRecord.room ?? null,
      snapshot_tutor_fee_mode: classRecord.tutor_fee_mode ?? null,
      snapshot_tutor_fee_per_student: classRecord.tutor_fee_per_student ?? null,
    };
  }

  private async hasExistingSessionPayout(
    institutionId: string,
    tutorId: string,
    sessionId: string,
    sessionDate: Date,
  ): Promise<boolean> {
    const dateStr = sessionDate.toISOString().split('T')[0];
    const existing = await this.prisma.payout.findFirst({
      where: {
        institution_id: institutionId,
        tutor_id: tutorId,
        period_start: sessionDate,
        period_end: sessionDate,
        description: { contains: dateStr },
      },
    });
    return !!existing;
  }

  private flattenSession(session: any) {
    return {
      ...session,
      class: session.class
        ? {
            ...session.class,
            subject:
              session.snapshot_subject_name ??
              session.class.subject?.name ??
              null,
            name: session.snapshot_class_name ?? session.class.name,
            fee: Number(session.snapshot_class_fee ?? session.class.fee),
            room: session.snapshot_class_room ?? session.class.room ?? null,
            tutor_fee_mode:
              session.snapshot_tutor_fee_mode ?? session.class.tutor_fee_mode,
            tutor: session.snapshot_tutor_id
              ? {
                  id: session.snapshot_tutor_id,
                  name:
                    session.snapshot_tutor_name ??
                    session.class.tutor?.user?.name ??
                    null,
                }
              : session.class.tutor
                ? {
                    id: session.class.tutor.id,
                    name: session.class.tutor.user.name,
                  }
                : null,
          }
        : null,
    };
  }

  private async validateClassForSession(
    classId: string,
    institutionId: string,
  ) {
    const classRecord = await this.prisma.class.findFirst({
      where: { id: classId, institution_id: institutionId },
      include: {
        schedules: true,
        tutor: { include: { user: { select: { name: true } } } },
        subject: { select: { name: true } },
      },
    });

    if (!classRecord) {
      throw new NotFoundException(`Class with id ${classId} not found`);
    }

    if (classRecord.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Cannot create sessions for an archived class',
      );
    }

    return classRecord;
  }

  async create(institutionId: string, userId: string, dto: CreateSessionDto) {
    await this.validateClassForSession(dto.class_id, institutionId);

    const session = await this.prisma.session.create({
      data: {
        ...dto,
        institution_id: institutionId,
        created_by: userId,
      },
      include: this.sessionInclude,
    });

    this.eventEmitter.emit(NOTIFICATION_EVENTS.SESSION_CREATED, {
      institutionId,
      sessionId: session.id,
      className: session.class?.name ?? 'Unknown',
      date: session.date.toISOString().split('T')[0],
    });

    return this.flattenSession(session);
  }

  async findAll(institutionId: string, query: SessionQueryDto) {
    const {
      page,
      limit,
      class_id,
      status,
      date_from,
      date_to,
      sort_by,
      sort_order,
    } = query;

    const where: any = { institution_id: institutionId };

    if (class_id) {
      where.class_id = class_id;
    }

    if (status) {
      where.status = status;
    }

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = date_from;
      if (date_to) where.date.lte = date_to;
    }

    const [data, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort_by]: sort_order },
        include: this.sessionInclude,
      }),
      this.prisma.session.count({ where }),
    ]);

    return {
      data: data.map((s) => this.flattenSession(s)),
      total,
      page,
      limit,
    };
  }

  async findOne(institutionId: string, id: string) {
    const session = await this.prisma.session.findFirst({
      where: { id, institution_id: institutionId },
      include: {
        class: {
          include: {
            subject: { select: { name: true } },
            tutor: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        attendances: {
          include: {
            student: { select: { id: true, name: true, grade: true } },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session with id ${id} not found`);
    }

    return {
      ...session,
      class: session.class
        ? {
            ...session.class,
            subject:
              session.snapshot_subject_name ??
              session.class.subject?.name ??
              null,
            name: session.snapshot_class_name ?? session.class.name,
            fee: Number(session.snapshot_class_fee ?? session.class.fee),
            room: session.snapshot_class_room ?? session.class.room ?? null,
            tutor_fee_mode:
              session.snapshot_tutor_fee_mode ?? session.class.tutor_fee_mode,
            tutor: session.snapshot_tutor_id
              ? {
                  id: session.snapshot_tutor_id,
                  name:
                    session.snapshot_tutor_name ??
                    session.class.tutor?.user?.name ??
                    null,
                  email: session.class.tutor?.user?.email ?? null,
                }
              : session.class.tutor
                ? {
                    id: session.class.tutor.id,
                    name: session.class.tutor.user.name,
                    email: session.class.tutor.user.email,
                  }
                : null,
          }
        : null,
      attendances: session.attendances.map((a) => ({
        id: a.id,
        status: a.status,
        homework_done: a.homework_done,
        notes: a.notes,
        student: a.student,
      })),
    };
  }

  async update(institutionId: string, id: string, dto: UpdateSessionDto) {
    const existing = await this.findOne(institutionId, id);

    if (existing.status === 'COMPLETED') {
      throw new BadRequestException('Cannot edit a completed session');
    }

    const sessionDate = new Date(existing.date);
    if (
      isBefore(sessionDate, startOfDay(new Date())) &&
      dto.status !== 'COMPLETED'
    ) {
      throw new BadRequestException(
        'Cannot edit a session whose date has already passed',
      );
    }

    const data: any = { ...dto };

    // Copy tutor fee when session is marked COMPLETED
    if (dto.status === 'COMPLETED') {
      const sessionClass = await this.prisma.class.findFirst({
        where: { id: existing.class?.id ?? '', institution_id: institutionId },
        include: {
          subject: { select: { name: true } },
          tutor: { include: { user: { select: { name: true } } } },
        },
      });
      if (sessionClass) {
        if (sessionClass.tutor_fee) {
          data.tutor_fee_amount = sessionClass.tutor_fee;
        }
        Object.assign(data, this.buildSnapshotData(sessionClass));
      }

      const session = await this.prisma.session.update({
        where: { id, institution_id: institutionId },
        data,
        include: this.sessionInclude,
      });

      // Auto-create payout based on tutor fee mode (with dedup check)
      const feeMode = sessionClass?.tutor_fee_mode ?? 'FIXED_PER_SESSION';
      const sessionDateForPayout = new Date(existing.date);
      const hasPayout = sessionClass?.tutor_id
        ? await this.hasExistingSessionPayout(
            institutionId,
            sessionClass.tutor_id,
            id,
            sessionDateForPayout,
          )
        : false;

      if (!hasPayout) {
        if (feeMode === 'FIXED_PER_SESSION' && sessionClass?.tutor_id) {
          const tutorFee = Number(sessionClass.tutor_fee ?? 0);
          if (tutorFee > 0) {
            await this.payoutService.create(institutionId, {
              tutor_id: sessionClass.tutor_id,
              amount: tutorFee,
              date: sessionDateForPayout,
              status: 'PENDING',
              description: `Session: ${sessionClass.name} - ${sessionDateForPayout.toISOString().split('T')[0]}`,
              period_start: sessionDateForPayout,
              period_end: sessionDateForPayout,
            });
          }
        } else if (
          feeMode === 'PER_STUDENT_ATTENDANCE' &&
          sessionClass?.tutor_id
        ) {
          const feePerStudent = Number(sessionClass.tutor_fee_per_student ?? 0);
          if (feePerStudent > 0) {
            const attendingCount = await this.prisma.attendance.count({
              where: { session_id: id, status: { in: ['PRESENT', 'LATE'] } },
            });
            if (attendingCount > 0) {
              await this.payoutService.create(institutionId, {
                tutor_id: sessionClass.tutor_id,
                amount: feePerStudent * attendingCount,
                date: sessionDateForPayout,
                status: 'PENDING',
                description: `Session: ${sessionClass.name} - ${sessionDateForPayout.toISOString().split('T')[0]} (${attendingCount} students)`,
                period_start: sessionDateForPayout,
                period_end: sessionDateForPayout,
              });
            }
          }
        }
      }
      // MONTHLY_SALARY: no per-session payout

      return this.flattenSession(session);
    }

    const session = await this.prisma.session.update({
      where: { id, institution_id: institutionId },
      data,
      include: this.sessionInclude,
    });

    return this.flattenSession(session);
  }

  async delete(institutionId: string, id: string) {
    const existing = await this.findOne(institutionId, id);

    if (existing.status === 'COMPLETED') {
      throw new BadRequestException('Cannot delete a completed session');
    }

    return this.prisma.session.delete({
      where: { id, institution_id: institutionId },
    });
  }

  async generateSessions(
    institutionId: string,
    userId: string,
    dto: GenerateSessionsDto,
  ) {
    const classRecord = await this.validateClassForSession(
      dto.class_id,
      institutionId,
    );

    if (isAfter(dto.date_from, dto.date_to)) {
      throw new BadRequestException(
        'date_from must be before or equal to date_to',
      );
    }

    // Build a map of day-of-week number → schedule (with start_time/end_time)
    const scheduleByDay = new Map(
      classRecord.schedules.map((s: any) => [DAY_MAP[s.day], s]),
    );
    const targetDays = [...scheduleByDay.keys()];

    // Find existing sessions for this class in the date range to skip them
    const existingSessions = await this.prisma.session.findMany({
      where: {
        class_id: dto.class_id,
        institution_id: institutionId,
        date: { gte: dto.date_from, lte: dto.date_to },
      },
      select: { date: true },
    });

    const existingDates = new Set(
      existingSessions.map((s) => new Date(s.date).toISOString().split('T')[0]),
    );

    // Build snapshot data from current class state
    const snapshotData = this.buildSnapshotData(classRecord);

    // Iterate each date in range, collect matching days
    const sessionsToCreate: any[] = [];

    let current = new Date(dto.date_from);
    const end = new Date(dto.date_to);

    while (isBefore(current, end) || isEqual(current, end)) {
      const dayOfWeek = getDay(current);

      if (targetDays.includes(dayOfWeek)) {
        const dateStr = current.toISOString().split('T')[0];

        if (!existingDates.has(dateStr)) {
          const schedule = scheduleByDay.get(dayOfWeek)!;
          sessionsToCreate.push({
            class_id: dto.class_id,
            institution_id: institutionId,
            date: new Date(dateStr),
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            status: SessionStatus.SCHEDULED,
            created_by: userId,
            ...snapshotData,
          });
        }
      }

      current = addDays(current, 1);
    }

    if (sessionsToCreate.length === 0) {
      return { count: 0, sessions: [] };
    }

    const SESSION_GENERATE_LIMIT = 200;
    if (sessionsToCreate.length > SESSION_GENERATE_LIMIT) {
      throw new BadRequestException(
        `Cannot generate more than ${SESSION_GENERATE_LIMIT} sessions at once (requested: ${sessionsToCreate.length}). Please use a smaller date range.`,
      );
    }

    const result = await this.prisma.session.createMany({
      data: sessionsToCreate,
      skipDuplicates: true,
    });

    return { count: result.count, sessions: sessionsToCreate };
  }

  async getTutorSchedule(userId: string, query: TutorScheduleQueryDto) {
    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId },
    });

    if (!tutor) {
      throw new NotFoundException('Tutor profile not found');
    }

    const { page, limit, status, date_from, date_to, sort_by, sort_order } =
      query;

    const where: any = {
      institution_id: tutor.institution_id,
      class: { tutor_id: tutor.id },
    };

    if (status) {
      where.status = status;
    }

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = date_from;
      if (date_to) where.date.lte = date_to;
    }

    const [data, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort_by]: sort_order },
        include: this.sessionInclude,
      }),
      this.prisma.session.count({ where }),
    ]);

    return {
      data: data.map((s) => this.flattenSession(s)),
      total,
      page,
      limit,
    };
  }

  async requestReschedule(
    institutionId: string,
    userId: string,
    sessionId: string,
    dto: RequestRescheduleDto,
  ) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, institution_id: institutionId },
      include: this.sessionInclude,
    });

    if (!session) {
      throw new NotFoundException(`Session with id ${sessionId} not found`);
    }

    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId, institution_id: institutionId },
    });

    if (!tutor || session.class.tutor_id !== tutor.id) {
      throw new ForbiddenException('You can only reschedule your own sessions');
    }

    if (session.status !== 'SCHEDULED') {
      throw new BadRequestException(
        'Only sessions with status SCHEDULED can be rescheduled',
      );
    }

    const updated = await this.prisma.session.update({
      where: { id: sessionId, institution_id: institutionId },
      data: {
        status: 'RESCHEDULE_REQUESTED',
        proposed_date: dto.proposed_date,
        proposed_start_time: dto.proposed_start_time,
        proposed_end_time: dto.proposed_end_time,
        reschedule_reason: dto.reschedule_reason,
      },
      include: this.sessionInclude,
    });

    return this.flattenSession(updated);
  }

  async approveReschedule(
    institutionId: string,
    userId: string,
    sessionId: string,
    dto: ApproveRescheduleDto,
  ) {
    const session = await this.findOne(institutionId, sessionId);

    if (session.status !== 'RESCHEDULE_REQUESTED') {
      throw new BadRequestException(
        'Only sessions with status RESCHEDULE_REQUESTED can be approved or rejected',
      );
    }

    if (dto.approved) {
      const updated = await this.prisma.session.update({
        where: { id: sessionId, institution_id: institutionId },
        data: {
          date: session.proposed_date!,
          start_time: session.proposed_start_time!,
          end_time: session.proposed_end_time!,
          status: 'SCHEDULED',
          approved_by: userId,
          proposed_date: null,
          proposed_start_time: null,
          proposed_end_time: null,
          reschedule_reason: null,
        },
        include: this.sessionInclude,
      });

      return this.flattenSession(updated);
    } else {
      const updated = await this.prisma.session.update({
        where: { id: sessionId, institution_id: institutionId },
        data: {
          status: 'SCHEDULED',
          proposed_date: null,
          proposed_start_time: null,
          proposed_end_time: null,
          reschedule_reason: null,
        },
        include: this.sessionInclude,
      });

      return this.flattenSession(updated);
    }
  }

  async cancelSession(institutionId: string, userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, institution_id: institutionId },
      include: this.sessionInclude,
    });

    if (!session) {
      throw new NotFoundException(`Session with id ${sessionId} not found`);
    }

    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId, institution_id: institutionId },
    });

    if (!tutor || session.class.tutor_id !== tutor.id) {
      throw new ForbiddenException('You can only cancel your own sessions');
    }

    if (session.status !== 'SCHEDULED') {
      throw new BadRequestException(
        'Only sessions with status SCHEDULED can be cancelled',
      );
    }

    const updated = await this.prisma.session.update({
      where: { id: sessionId, institution_id: institutionId },
      data: { status: 'CANCELLED' },
      include: this.sessionInclude,
    });

    this.eventEmitter.emit(NOTIFICATION_EVENTS.SESSION_CANCELLED, {
      institutionId: updated.class.institution_id,
      sessionId: updated.id,
      className: updated.class?.name ?? 'Unknown',
      date: updated.date.toISOString().split('T')[0],
    });

    return this.flattenSession(updated);
  }

  async getSessionStudents(institutionId: string, userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, institution_id: institutionId },
      include: this.sessionInclude,
    });

    if (!session) {
      throw new NotFoundException(`Session with id ${sessionId} not found`);
    }

    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId, institution_id: institutionId },
    });

    if (!tutor || session.class.tutor_id !== tutor.id) {
      throw new ForbiddenException(
        'You can only view students for your own sessions',
      );
    }

    // Use end-of-day so enrollments created on the session date are included
    const sessionDateEnd = new Date(session.date);
    sessionDateEnd.setUTCHours(23, 59, 59, 999);

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        institution_id: institutionId,
        class_id: session.class_id,
        status: 'ACTIVE',
        enrolled_at: { lte: sessionDateEnd },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
      },
    });

    const attendances = await this.prisma.attendance.findMany({
      where: { session_id: sessionId, institution_id: institutionId },
    });

    const attendanceMap = new Map(attendances.map((a) => [a.student_id, a]));

    return {
      students: enrollments.map((e) => {
        const att = attendanceMap.get(e.student.id);
        return {
          id: e.student.id,
          name: e.student.name,
          grade: e.student.grade,
          attendance: att?.status ?? null,
          homework_done: att?.homework_done ?? false,
          notes: att?.notes ?? null,
        };
      }),
    };
  }

  async getAdminSessionStudents(institutionId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, institution_id: institutionId },
    });

    if (!session) {
      throw new NotFoundException(`Session with id ${sessionId} not found`);
    }

    // Use end-of-day so enrollments created on the session date are included
    const sessionDateEnd = new Date(session.date);
    sessionDateEnd.setUTCHours(23, 59, 59, 999);

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        institution_id: institutionId,
        class_id: session.class_id,
        status: 'ACTIVE',
        enrolled_at: { lte: sessionDateEnd },
      },
      include: {
        student: {
          select: { id: true, name: true, grade: true },
        },
      },
    });

    const attendances = await this.prisma.attendance.findMany({
      where: { session_id: sessionId },
    });

    const attendanceMap = new Map(attendances.map((a) => [a.student_id, a]));

    return {
      students: enrollments.map((e) => {
        const att = attendanceMap.get(e.student.id);
        return {
          id: e.student.id,
          name: e.student.name,
          grade: e.student.grade,
          attendance_id: att?.id ?? null,
          status: att?.status ?? null,
          homework_done: att?.homework_done ?? false,
          notes: att?.notes ?? null,
        };
      }),
    };
  }

  async completeSession(
    institutionId: string,
    userId: string,
    sessionId: string,
    dto: CompleteSessionDto,
  ) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, institution_id: institutionId },
      include: this.sessionInclude,
    });

    if (!session) {
      throw new NotFoundException(`Session with id ${sessionId} not found`);
    }

    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId, institution_id: institutionId },
    });

    if (!tutor || session.class.tutor_id !== tutor.id) {
      throw new ForbiddenException('You can only complete your own sessions');
    }

    if (session.status !== 'SCHEDULED') {
      throw new BadRequestException(
        'Only sessions with status SCHEDULED can be completed',
      );
    }

    // Copy tutor fee from class
    const classForFee = await this.prisma.class.findFirst({
      where: { id: session.class_id, institution_id: institutionId },
      include: {
        subject: { select: { name: true } },
        tutor: { include: { user: { select: { name: true } } } },
      },
    });

    const tutorFee = Number(classForFee?.tutor_fee ?? 0);
    const snapshotData = classForFee ? this.buildSnapshotData(classForFee) : {};

    const updated = await this.prisma.session.update({
      where: { id: sessionId, institution_id: institutionId },
      data: {
        status: 'COMPLETED',
        topic_covered: dto.topic_covered,
        session_summary: dto.session_summary ?? null,
        ...(tutorFee > 0 ? { tutor_fee_amount: classForFee!.tutor_fee } : {}),
        ...snapshotData,
      },
      include: this.sessionInclude,
    });

    // Auto-create payout based on tutor fee mode (with dedup check)
    const feeMode = classForFee?.tutor_fee_mode ?? 'FIXED_PER_SESSION';
    const sessionDateForPayout = new Date(session.date);
    const hasPayout = await this.hasExistingSessionPayout(
      session.institution_id,
      tutor.id,
      sessionId,
      sessionDateForPayout,
    );

    if (!hasPayout) {
      if (feeMode === 'FIXED_PER_SESSION') {
        if (tutorFee > 0) {
          await this.payoutService.create(session.institution_id, {
            tutor_id: tutor.id,
            amount: tutorFee,
            date: sessionDateForPayout,
            status: 'PENDING',
            description: `Session: ${classForFee!.name} - ${sessionDateForPayout.toISOString().split('T')[0]}`,
            period_start: sessionDateForPayout,
            period_end: sessionDateForPayout,
          });
        }
      } else if (feeMode === 'PER_STUDENT_ATTENDANCE') {
        const feePerStudent = Number(classForFee?.tutor_fee_per_student ?? 0);
        if (feePerStudent > 0) {
          const attendingCount = await this.prisma.attendance.count({
            where: {
              session_id: sessionId,
              status: { in: ['PRESENT', 'LATE'] },
            },
          });
          if (attendingCount > 0) {
            const totalFee = feePerStudent * attendingCount;
            await this.payoutService.create(session.institution_id, {
              tutor_id: tutor.id,
              amount: totalFee,
              date: sessionDateForPayout,
              status: 'PENDING',
              description: `Session: ${classForFee!.name} - ${sessionDateForPayout.toISOString().split('T')[0]} (${attendingCount} students)`,
              period_start: sessionDateForPayout,
              period_end: sessionDateForPayout,
            });
          }
        }
      }
    }
    // MONTHLY_SALARY: no per-session payout — handled by cron/manual endpoint

    return this.flattenSession(updated);
  }
}
