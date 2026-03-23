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
} from './attendance.dto.js';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceGenerator: InvoiceGeneratorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async batchCreate(userId: string, dto: BatchCreateAttendanceDto) {
    const session = await this.prisma.session.findUnique({
      where: { id: dto.session_id },
      include: { class: true },
    });

    if (!session) {
      throw new NotFoundException(
        `Session with id ${dto.session_id} not found`,
      );
    }

    // Verify tutor owns the session
    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId },
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

    // Auto-generate per-session payments for present/late students
    const presentRecords = dto.records.filter(
      (r) => r.status === 'PRESENT' || r.status === 'LATE',
    );
    for (const record of presentRecords) {
      await this.invoiceGenerator.generatePerSessionPayment({
        institutionId: session.institution_id,
        studentId: record.student_id,
        sessionId: dto.session_id,
        classId: session.class_id,
      });
    }

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
    const attendance = await this.prisma.attendance.findUnique({
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

    return result;
  }

  async updateByTutor(userId: string, id: string, dto: UpdateAttendanceDto) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
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
      where: { user_id: userId },
    });

    if (!tutor || attendance.session.class.tutor_id !== tutor.id) {
      throw new ForbiddenException(
        'You can only update attendance for your own sessions',
      );
    }

    const result = await this.prisma.attendance.update({
      where: { id },
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

    return result;
  }

  async getSummary(institutionId: string, query: AttendanceSummaryQueryDto) {
    const { class_id, date_from, date_to } = query;

    const records = await this.prisma.attendance.findMany({
      where: {
        institution_id: institutionId,
        session: {
          class_id,
          date: { gte: date_from, lte: date_to },
        },
      },
    });

    const total_records = records.length;
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const homework_done = records.filter((r) => r.homework_done).length;

    const attendance_rate =
      total_records > 0 ? ((present + late) / total_records) * 100 : 0;

    return {
      total_records,
      present,
      absent,
      late,
      homework_done,
      attendance_rate: Math.round(attendance_rate * 100) / 100,
    };
  }

  async findByStudent(
    institutionId: string,
    studentId: string,
    query: StudentAttendanceQueryDto,
  ) {
    const { date_from, date_to } = query;

    const records = await this.prisma.attendance.findMany({
      where: {
        institution_id: institutionId,
        student_id: studentId,
        session: {
          date: { gte: date_from, lte: date_to },
        },
      },
      include: {
        session: {
          select: {
            id: true,
            date: true,
            start_time: true,
            end_time: true,
            status: true,
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { session: { date: 'desc' } },
    });

    const total_sessions = records.length;
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const attendance_rate =
      total_sessions > 0
        ? Math.round(((present + late) / total_sessions) * 100 * 100) / 100
        : 0;

    return {
      summary: { total_sessions, present, absent, late, attendance_rate },
      records,
    };
  }
}
