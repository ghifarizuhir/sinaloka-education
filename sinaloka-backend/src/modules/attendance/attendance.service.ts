import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type {
  BatchCreateAttendanceDto,
  UpdateAttendanceDto,
  AttendanceSummaryQueryDto,
} from './attendance.dto.js';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async batchCreate(userId: string, dto: BatchCreateAttendanceDto) {
    const session = await this.prisma.session.findUnique({
      where: { id: dto.session_id },
      include: { class: true },
    });

    if (!session) {
      throw new NotFoundException(`Session with id ${dto.session_id} not found`);
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
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance record with id ${id} not found`);
    }

    return this.prisma.attendance.update({
      where: { id, institution_id: institutionId },
      data: dto,
      include: { student: true },
    });
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

    return this.prisma.attendance.update({
      where: { id },
      data: dto,
      include: { student: true },
    });
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
      total_records > 0
        ? ((present + late) / total_records) * 100
        : 0;

    return {
      total_records,
      present,
      absent,
      late,
      homework_done,
      attendance_rate: Math.round(attendance_rate * 100) / 100,
    };
  }
}
