import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { isBefore, startOfDay } from 'date-fns';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { InvoiceGeneratorService } from '../payment/invoice-generator.service.js';
import { NOTIFICATION_EVENTS } from '../notification/notification.events.js';
import type {
  BatchCreateAttendanceDto,
  UpdateAttendanceDto,
  AttendanceSummaryQueryDto,
  StudentAttendanceQueryDto,
  FinalizeSessionDto,
} from './attendance.dto.js';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceGenerator: InvoiceGeneratorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async batchCreate(institutionId: string, userId: string, dto: BatchCreateAttendanceDto) {
    const session = await this.prisma.session.findFirst({
      where: { id: dto.session_id, institution_id: institutionId },
      include: { class: true },
    });

    if (!session) {
      throw new NotFoundException(
        `Session with id ${dto.session_id} not found`,
      );
    }

    // Verify tutor owns the session
    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId, institution_id: institutionId },
    });

    if (!tutor || session.class.tutor_id !== tutor.id) {
      throw new ForbiddenException(
        'You can only create attendance for your own sessions',
      );
    }

    // Check for existing attendance records
    const studentIds = dto.records.map((r) => r.student_id);
    const existing = await this.prisma.attendance.findMany({
      where: {
        session_id: dto.session_id,
        student_id: { in: studentIds },
      },
    });

    if (existing.length > 0) {
      const duplicateIds = existing.map((e) => e.student_id).join(', ');
      throw new ConflictException(
        `Attendance already exists for students: ${duplicateIds}`,
      );
    }

    // Create attendance records
    const data = dto.records.map((record) => ({
      session_id: dto.session_id,
      institution_id: session.institution_id,
      student_id: record.student_id,
      status: record.status,
      homework_done: record.homework_done ?? false,
      notes: record.notes ?? null,
    }));

    await this.prisma.attendance.createMany({ data });

    // Auto-generate per-session payments for present/late students (parallel)
    const presentRecords = dto.records.filter(
      (r) => r.status === 'PRESENT' || r.status === 'LATE',
    );
    await Promise.all(
      presentRecords.map((record) =>
        this.invoiceGenerator.generatePerSessionPayment({
          institutionId: session.institution_id,
          studentId: record.student_id,
          sessionId: dto.session_id,
          classId: session.class_id,
        }),
      ),
    );

    // Emit attendance submitted event
    const tutorUser = tutor
      ? await this.prisma.user.findUnique({
          where: { id: tutor.user_id },
          select: { name: true },
        })
      : null;
    this.eventEmitter.emit(NOTIFICATION_EVENTS.ATTENDANCE_SUBMITTED, {
      institutionId: session.institution_id,
      sessionId: dto.session_id,
      className: session.class?.name ?? 'Unknown',
      tutorName: tutorUser?.name ?? 'Unknown',
      studentCount: dto.records.length,
    });

    // Return created records
    return this.prisma.attendance.findMany({
      where: {
        session_id: dto.session_id,
        student_id: { in: studentIds },
      },
      include: { student: true },
    });
  }

  async finalizeSession(
    institutionId: string,
    userId: string,
    dto: FinalizeSessionDto,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Validate tutor
      const tutor = await tx.tutor.findFirst({
        where: { user_id: userId, institution_id: institutionId },
      });
      if (!tutor) throw new NotFoundException('Tutor not found');

      // 2. Validate session — must be SCHEDULED and owned by this tutor
      const session = await tx.session.findFirst({
        where: {
          id: dto.session_id,
          institution_id: institutionId,
        },
        include: {
          class: {
            include: {
              subject: true,
              tutor: { include: { user: true } },
            },
          },
        },
      });

      if (!session) throw new NotFoundException('Session not found');
      if (session.class.tutor_id !== tutor.id) {
        throw new ForbiddenException('Not your session');
      }
      if (session.status !== 'SCHEDULED') {
        throw new ConflictException(`Session status is ${session.status}, expected SCHEDULED`);
      }

      // 3. Check for duplicate attendance
      const existing = await tx.attendance.findMany({
        where: { session_id: dto.session_id },
        select: { student_id: true },
      });
      if (existing.length > 0) {
        throw new ConflictException('Attendance already exists for this session');
      }

      // 4. Create attendance records
      await tx.attendance.createMany({
        data: dto.records.map((r) => ({
          session_id: dto.session_id,
          student_id: r.student_id,
          institution_id: institutionId,
          status: r.status,
          homework_done: r.homework_done ?? false,
          notes: r.notes,
        })),
      });

      // 5. Complete session with snapshot data
      const tutorFee = Number(session.class.tutor_fee ?? 0);
      const snapshotData = {
        snapshot_tutor_id: session.class.tutor_id ?? null,
        snapshot_tutor_name: session.class.tutor?.user?.name ?? null,
        snapshot_subject_name: session.class.subject?.name ?? null,
        snapshot_class_name: session.class.name ?? null,
        snapshot_class_fee: session.class.fee ?? null,
        snapshot_class_room: session.class.room ?? null,
        snapshot_tutor_fee_mode: session.class.tutor_fee_mode ?? null,
        snapshot_tutor_fee_per_student: session.class.tutor_fee_per_student ?? null,
      };

      await tx.session.update({
        where: { id: dto.session_id },
        data: {
          status: 'COMPLETED',
          topic_covered: dto.topic_covered,
          session_summary: dto.session_summary ?? null,
          ...(tutorFee > 0 ? { tutor_fee_amount: session.class.tutor_fee } : {}),
          ...snapshotData,
        },
      });

      // 6. Generate tutor payout (with dedup check)
      const presentRecords = dto.records.filter(
        (r) => r.status === 'PRESENT' || r.status === 'LATE',
      );

      const feeMode = session.class.tutor_fee_mode ?? 'FIXED_PER_SESSION';
      const sessionDate = new Date(session.date);
      const dateStr = sessionDate.toISOString().split('T')[0];

      const hasPayout = await tx.payout.findFirst({
        where: {
          institution_id: institutionId,
          tutor_id: tutor.id,
          period_start: sessionDate,
          period_end: sessionDate,
          description: { contains: dateStr },
        },
      });

      if (!hasPayout) {
        if (feeMode === 'FIXED_PER_SESSION' && tutorFee > 0) {
          await tx.payout.create({
            data: {
              institution_id: institutionId,
              tutor_id: tutor.id,
              amount: tutorFee,
              date: sessionDate,
              status: 'PENDING',
              description: `Session: ${session.class.name} - ${dateStr}`,
              period_start: sessionDate,
              period_end: sessionDate,
            },
          });
        } else if (feeMode === 'PER_STUDENT_ATTENDANCE') {
          const feePerStudent = Number(session.class.tutor_fee_per_student ?? 0);
          if (feePerStudent > 0 && presentRecords.length > 0) {
            await tx.payout.create({
              data: {
                institution_id: institutionId,
                tutor_id: tutor.id,
                amount: feePerStudent * presentRecords.length,
                date: sessionDate,
                status: 'PENDING',
                description: `Session: ${session.class.name} - ${dateStr} (${presentRecords.length} students)`,
                period_start: sessionDate,
                period_end: sessionDate,
              },
            });
          }
        }
      }
      // MONTHLY_SALARY: no per-session payout

      return {
        session_id: dto.session_id,
        class_id: session.class_id,
        class_name: session.class.name ?? 'Unknown',
        tutor_name: session.class.tutor?.user?.name ?? 'Unknown',
        attendance_count: dto.records.length,
        present_count: presentRecords.length,
      };
    });

    // 7. Generate per-session payments (best-effort, outside transaction)
    const presentRecords = dto.records.filter(
      (r) => r.status === 'PRESENT' || r.status === 'LATE',
    );
    for (const record of presentRecords) {
      await this.invoiceGenerator.generatePerSessionPayment({
        institutionId,
        studentId: record.student_id,
        sessionId: dto.session_id,
        classId: result.class_id,
      });
    }

    // 8. Emit notification (best-effort)
    this.eventEmitter.emit(NOTIFICATION_EVENTS.ATTENDANCE_SUBMITTED, {
      institutionId,
      sessionId: dto.session_id,
      className: result.class_name,
      tutorName: result.tutor_name,
      studentCount: dto.records.length,
    });

    return {
      session_id: result.session_id,
      attendance_count: result.attendance_count,
      present_count: result.present_count,
    };
  }

  async adminBatchCreate(institutionId: string, dto: BatchCreateAttendanceDto) {
    const session = await this.prisma.session.findFirst({
      where: { id: dto.session_id, institution_id: institutionId },
      include: { class: true },
    });

    if (!session) {
      throw new NotFoundException(
        `Session with id ${dto.session_id} not found`,
      );
    }

    // Check for existing attendance records
    const studentIds = dto.records.map((r) => r.student_id);
    const existing = await this.prisma.attendance.findMany({
      where: {
        session_id: dto.session_id,
        student_id: { in: studentIds },
      },
    });

    if (existing.length > 0) {
      const duplicateIds = existing.map((e) => e.student_id).join(', ');
      throw new ConflictException(
        `Attendance already exists for students: ${duplicateIds}`,
      );
    }

    // Create attendance records
    const data = dto.records.map((record) => ({
      session_id: dto.session_id,
      institution_id: session.institution_id,
      student_id: record.student_id,
      status: record.status,
      homework_done: record.homework_done ?? false,
      notes: record.notes ?? null,
    }));

    await this.prisma.attendance.createMany({ data });

    // Auto-generate per-session payments for present/late students (parallel)
    const presentRecords = dto.records.filter(
      (r) => r.status === 'PRESENT' || r.status === 'LATE',
    );
    await Promise.all(
      presentRecords.map((record) =>
        this.invoiceGenerator.generatePerSessionPayment({
          institutionId: session.institution_id,
          studentId: record.student_id,
          sessionId: dto.session_id,
          classId: session.class_id,
        }),
      ),
    );

    // Return created records
    return this.prisma.attendance.findMany({
      where: {
        session_id: dto.session_id,
        student_id: { in: studentIds },
      },
      include: { student: true },
    });
  }

  async findBySession(institutionId: string, sessionId: string) {
    return this.prisma.attendance.findMany({
      where: {
        session_id: sessionId,
        institution_id: institutionId,
      },
      include: { student: true },
    });
  }

  async update(institutionId: string, id: string, dto: UpdateAttendanceDto) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, institution_id: institutionId },
      include: { session: true },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance record with id ${id} not found`);
    }

    if (attendance.session.status === 'COMPLETED') {
      throw new BadRequestException(
        'Cannot edit attendance for a completed session',
      );
    }

    const sessionDate = new Date(attendance.session.date);
    if (isBefore(sessionDate, startOfDay(new Date()))) {
      throw new BadRequestException(
        'Cannot edit attendance for a session whose date has already passed',
      );
    }

    const result = await this.prisma.attendance.update({
      where: { id, institution_id: institutionId },
      data: dto,
      include: { student: true },
    });

    // If status changed to PRESENT or LATE, generate per-session payment
    if (dto.status === 'PRESENT' || dto.status === 'LATE') {
      await this.invoiceGenerator.generatePerSessionPayment({
        institutionId,
        studentId: attendance.student_id,
        sessionId: attendance.session_id,
        classId: attendance.session.class_id,
      });
    }

    // If status changed to ABSENT, cancel the per-session payment
    if (dto.status === 'ABSENT') {
      await this.invoiceGenerator.cancelPerSessionPayment({
        institutionId,
        studentId: attendance.student_id,
        sessionId: attendance.session_id,
        classId: attendance.session.class_id,
      });
    }

    return result;
  }

  async updateByTutor(institutionId: string, userId: string, id: string, dto: UpdateAttendanceDto) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, institution_id: institutionId },
      include: {
        session: {
          include: { class: true },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance record with id ${id} not found`);
    }

    // Verify tutor owns the session
    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId, institution_id: institutionId },
    });

    if (!tutor || attendance.session.class.tutor_id !== tutor.id) {
      throw new ForbiddenException(
        'You can only update attendance for your own sessions',
      );
    }

    const result = await this.prisma.attendance.update({
      where: { id, institution_id: institutionId },
      data: dto,
      include: { student: true },
    });

    // If status changed to PRESENT or LATE, generate per-session payment
    if (dto.status === 'PRESENT' || dto.status === 'LATE') {
      await this.invoiceGenerator.generatePerSessionPayment({
        institutionId: attendance.institution_id,
        studentId: attendance.student_id,
        sessionId: attendance.session_id,
        classId: attendance.session.class_id,
      });
    }

    // If status changed to ABSENT, cancel the per-session payment
    if (dto.status === 'ABSENT') {
      await this.invoiceGenerator.cancelPerSessionPayment({
        institutionId: attendance.institution_id,
        studentId: attendance.student_id,
        sessionId: attendance.session_id,
        classId: attendance.session.class_id,
      });
    }

    return result;
  }

  async getSummary(institutionId: string, query: AttendanceSummaryQueryDto) {
    const { class_id, date_from, date_to } = query;

    const where = {
      institution_id: institutionId,
      session: {
        class_id,
        date: { gte: date_from, lte: date_to },
      },
    };

    const [statusCounts, homeworkCount] = await Promise.all([
      this.prisma.attendance.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.attendance.count({
        where: { ...where, homework_done: true },
      }),
    ]);

    const present =
      statusCounts.find((s) => s.status === 'PRESENT')?._count._all ?? 0;
    const absent =
      statusCounts.find((s) => s.status === 'ABSENT')?._count._all ?? 0;
    const late =
      statusCounts.find((s) => s.status === 'LATE')?._count._all ?? 0;
    const total_records = present + absent + late;

    const attendance_rate =
      total_records > 0 ? ((present + late) / total_records) * 100 : 0;

    return {
      total_records,
      present,
      absent,
      late,
      homework_done: homeworkCount,
      attendance_rate: Math.round(attendance_rate * 100) / 100,
    };
  }

  async findByStudent(
    institutionId: string,
    studentId: string,
    query: StudentAttendanceQueryDto,
  ) {
    const { date_from, date_to } = query;

    const where = {
      institution_id: institutionId,
      student_id: studentId,
      session: {
        date: { gte: date_from, lte: date_to },
      },
    };

    const [statusCounts, records] = await Promise.all([
      this.prisma.attendance.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.attendance.findMany({
        where,
        include: {
          session: {
            select: {
              id: true,
              date: true,
              start_time: true,
              end_time: true,
              status: true,
              snapshot_class_name: true,
              class: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { session: { date: 'desc' } },
      }),
    ]);

    const present =
      statusCounts.find((s) => s.status === 'PRESENT')?._count._all ?? 0;
    const absent =
      statusCounts.find((s) => s.status === 'ABSENT')?._count._all ?? 0;
    const late =
      statusCounts.find((s) => s.status === 'LATE')?._count._all ?? 0;
    const total_sessions = present + absent + late;
    const attendance_rate =
      total_sessions > 0
        ? Math.round(((present + late) / total_sessions) * 100 * 100) / 100
        : 0;

    const mappedRecords = records.map((r) => ({
      ...r,
      session: {
        ...r.session,
        class: {
          id: r.session.class?.id ?? '',
          name: r.session.snapshot_class_name ?? r.session.class?.name ?? '',
        },
      },
    }));

    return {
      summary: { total_sessions, present, absent, late, attendance_rate },
      records: mappedRecords,
    };
  }
}
