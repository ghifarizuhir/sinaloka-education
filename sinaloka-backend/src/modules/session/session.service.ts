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
} from './session.dto.js';
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

  async create(institutionId: string, userId: string, dto: CreateSessionDto) {
    const classRecord = await this.prisma.class.findUnique({
      where: { id: dto.class_id, institution_id: institutionId },
    });

    if (!classRecord) {
      throw new NotFoundException(`Class with id ${dto.class_id} not found`);
    }

    return this.prisma.session.create({
      data: {
        ...dto,
        institution_id: institutionId,
        created_by: userId,
      },
      include: { class: true },
    });
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
        include: { class: true },
      }),
      this.prisma.session.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(institutionId: string, id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id, institution_id: institutionId },
      include: { class: true },
    });

    if (!session) {
      throw new NotFoundException(`Session with id ${id} not found`);
    }

    return session;
  }

  async update(institutionId: string, id: string, dto: UpdateSessionDto) {
    await this.findOne(institutionId, id);

    return this.prisma.session.update({
      where: { id, institution_id: institutionId },
      data: dto,
      include: { class: true },
    });
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
      status: string;
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
            status: 'SCHEDULED',
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
        include: { class: true },
      }),
      this.prisma.session.count({ where }),
    ]);

    return {
      data,
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
      include: { class: true },
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

    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'RESCHEDULE_REQUESTED',
        proposed_date: dto.proposed_date,
        proposed_start_time: dto.proposed_start_time,
        proposed_end_time: dto.proposed_end_time,
        reschedule_reason: dto.reschedule_reason,
      },
      include: { class: true },
    });
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
      return this.prisma.session.update({
        where: { id: sessionId, institution_id: institutionId },
        data: {
          date: session.proposed_date,
          start_time: session.proposed_start_time,
          end_time: session.proposed_end_time,
          status: 'SCHEDULED',
          approved_by: userId,
          proposed_date: null,
          proposed_start_time: null,
          proposed_end_time: null,
          reschedule_reason: null,
        },
        include: { class: true },
      });
    } else {
      return this.prisma.session.update({
        where: { id: sessionId, institution_id: institutionId },
        data: {
          status: 'SCHEDULED',
          proposed_date: null,
          proposed_start_time: null,
          proposed_end_time: null,
          reschedule_reason: null,
        },
        include: { class: true },
      });
    }
  }

  async cancelSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { class: true },
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

    return this.prisma.session.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED' },
      include: { class: true },
    });
  }
}
