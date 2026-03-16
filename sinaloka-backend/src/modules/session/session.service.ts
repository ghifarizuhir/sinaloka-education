import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
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
import { addDays, getDay, isAfter, isBefore, isEqual } from 'date-fns';

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
  constructor(private readonly prisma: PrismaService) {}

  private readonly sessionInclude = {
    class: {
      include: { tutor: { include: { user: { select: { id: true, name: true } } } } },
    },
  };

  private flattenSession(session: any) {
    return {
      ...session,
      class: session.class
        ? {
            ...session.class,
            fee: Number(session.class.fee),
            tutor: session.class.tutor
              ? { id: session.class.tutor.id, name: session.class.tutor.user.name }
              : null,
          }
        : null,
    };
  }

  async create(institutionId: string, userId: string, dto: CreateSessionDto) {
    const classRecord = await this.prisma.class.findUnique({
      where: { id: dto.class_id, institution_id: institutionId },
    });

    if (!classRecord) {
      throw new NotFoundException(`Class with id ${dto.class_id} not found`);
    }

    const session = await this.prisma.session.create({
      data: {
        ...dto,
        institution_id: institutionId,
        created_by: userId,
      },
      include: this.sessionInclude,
    });

    return this.flattenSession(session);
  }

  async findAll(institutionId: string, query: SessionQueryDto) {
    const { page, limit, class_id, status, date_from, date_to, sort_by, sort_order } = query;

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
    const session = await this.prisma.session.findUnique({
      where: { id, institution_id: institutionId },
      include: {
        class: {
          include: { tutor: { include: { user: { select: { id: true, name: true, email: true } } } } },
        },
        attendances: {
          include: { student: { select: { id: true, name: true, grade: true } } },
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
            fee: Number(session.class.fee),
            tutor: session.class.tutor
              ? { id: session.class.tutor.id, name: session.class.tutor.user.name, email: session.class.tutor.user.email }
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
    await this.findOne(institutionId, id);

    const session = await this.prisma.session.update({
      where: { id, institution_id: institutionId },
      data: dto,
      include: this.sessionInclude,
    });

    return this.flattenSession(session);
  }

  async delete(institutionId: string, id: string) {
    await this.findOne(institutionId, id);

    return this.prisma.session.delete({
      where: { id, institution_id: institutionId },
    });
  }

  async generateSessions(
    institutionId: string,
    userId: string,
    dto: GenerateSessionsDto,
  ) {
    const classRecord = await this.prisma.class.findUnique({
      where: { id: dto.class_id, institution_id: institutionId },
    });

    if (!classRecord) {
      throw new NotFoundException(`Class with id ${dto.class_id} not found`);
    }

    if (isAfter(dto.date_from, dto.date_to)) {
      throw new BadRequestException('date_from must be before or equal to date_to');
    }

    // Get target day-of-week numbers from class schedule_days
    const targetDays = (classRecord.schedule_days as string[]).map(
      (day) => DAY_MAP[day],
    );

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

    // Iterate each date in range, collect matching days
    const sessionsToCreate: Array<{
      class_id: string;
      institution_id: string;
      date: Date;
      start_time: string;
      end_time: string;
      status: SessionStatus;
      created_by: string;
    }> = [];

    let current = new Date(dto.date_from);
    const end = new Date(dto.date_to);

    while (isBefore(current, end) || isEqual(current, end)) {
      const dayOfWeek = getDay(current);

      if (targetDays.includes(dayOfWeek)) {
        const dateStr = current.toISOString().split('T')[0];

        if (!existingDates.has(dateStr)) {
          sessionsToCreate.push({
            class_id: dto.class_id,
            institution_id: institutionId,
            date: new Date(dateStr),
            start_time: classRecord.schedule_start_time,
            end_time: classRecord.schedule_end_time,
            status: SessionStatus.SCHEDULED,
            created_by: userId,
          });
        }
      }

      current = addDays(current, 1);
    }

    if (sessionsToCreate.length === 0) {
      return { count: 0, sessions: [] };
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

    const { page, limit, status, date_from, date_to, sort_by, sort_order } = query;

    const where: any = {
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
    userId: string,
    sessionId: string,
    dto: RequestRescheduleDto,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: this.sessionInclude,
    });

    if (!session) {
      throw new NotFoundException(`Session with id ${sessionId} not found`);
    }

    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId },
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
      where: { id: sessionId },
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

  async cancelSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: this.sessionInclude,
    });

    if (!session) {
      throw new NotFoundException(`Session with id ${sessionId} not found`);
    }

    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId },
    });

    if (!tutor || session.class.tutor_id !== tutor.id) {
      throw new ForbiddenException('You can only cancel your own sessions');
    }

    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED' },
      include: this.sessionInclude,
    });

    return this.flattenSession(updated);
  }

  async getSessionStudents(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: this.sessionInclude,
    });

    if (!session) {
      throw new NotFoundException(`Session with id ${sessionId} not found`);
    }

    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId },
    });

    if (!tutor || session.class.tutor_id !== tutor.id) {
      throw new ForbiddenException('You can only view students for your own sessions');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        class_id: session.class_id,
        status: 'ACTIVE',
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
      where: { session_id: sessionId },
    });

    const attendanceMap = new Map(
      attendances.map((a) => [a.student_id, a]),
    );

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

  async completeSession(userId: string, sessionId: string, dto: CompleteSessionDto) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: this.sessionInclude,
    });

    if (!session) {
      throw new NotFoundException(`Session with id ${sessionId} not found`);
    }

    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId },
    });

    if (!tutor || session.class.tutor_id !== tutor.id) {
      throw new ForbiddenException('You can only complete your own sessions');
    }

    if (session.status !== 'SCHEDULED') {
      throw new BadRequestException(
        'Only sessions with status SCHEDULED can be completed',
      );
    }

    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        topic_covered: dto.topic_covered,
        session_summary: dto.session_summary ?? null,
      },
      include: this.sessionInclude,
    });

    return this.flattenSession(updated);
  }
}
