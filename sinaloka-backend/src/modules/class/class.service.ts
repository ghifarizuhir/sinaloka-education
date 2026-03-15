import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import {
  buildPaginationMeta,
  PaginatedResponse,
} from '../../common/dto/pagination.dto.js';
import { CreateClassDto, UpdateClassDto, ClassQueryDto } from './class.dto.js';

@Injectable()
export class ClassService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, dto: CreateClassDto) {
    return this.prisma.class.create({
      data: {
        institution_id: institutionId,
        tutor_id: dto.tutor_id,
        name: dto.name,
        subject: dto.subject,
        capacity: dto.capacity,
        fee: dto.fee,
        schedule_days: dto.schedule_days,
        schedule_start_time: dto.schedule_start_time,
        schedule_end_time: dto.schedule_end_time,
        room: dto.room ?? null,
        status: dto.status ?? 'ACTIVE',
      },
    });
  }

  async findAll(
    institutionId: string,
    query: ClassQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const { page, limit, search, subject, status, sort_by, sort_order } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      institution_id: institutionId,
    };

    if (subject) {
      where.subject = subject;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.class.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort_by]: sort_order },
      }),
      this.prisma.class.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(institutionId: string, id: string) {
    const classRecord = await this.prisma.class.findFirst({
      where: { id, institution_id: institutionId },
    });

    if (!classRecord) {
      throw new NotFoundException(`Class with ID "${id}" not found`);
    }

    const enrolledCount = await this.prisma.enrollment.count({
      where: {
        class_id: id,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
    });

    return {
      ...classRecord,
      enrolled_count: enrolledCount,
    };
  }

  async update(institutionId: string, id: string, dto: UpdateClassDto) {
    const existing = await this.prisma.class.findFirst({
      where: { id, institution_id: institutionId },
    });

    if (!existing) {
      throw new NotFoundException(`Class with ID "${id}" not found`);
    }

    return this.prisma.class.update({
      where: { id },
      data: dto,
    });
  }

  async delete(institutionId: string, id: string) {
    const existing = await this.prisma.class.findFirst({
      where: { id, institution_id: institutionId },
    });

    if (!existing) {
      throw new NotFoundException(`Class with ID "${id}" not found`);
    }

    return this.prisma.class.delete({
      where: { id },
    });
  }
}
