import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { buildPaginationMeta } from '../../common/dto/pagination.dto.js';
import { NOTIFICATION_EVENTS } from '../notification/notification.events.js';
import { CreateStudentSchema } from './student.dto.js';
import type {
  CreateStudentDto,
  UpdateStudentDto,
  StudentQueryDto,
} from './student.dto.js';

@Injectable()
export class StudentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(institutionId: string, dto: CreateStudentDto) {
    const student = await this.prisma.student.create({
      data: {
        institution_id: institutionId,
        name: dto.name,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        grade: dto.grade,
        status: dto.status ?? 'ACTIVE',
        parent_name: dto.parent_name ?? null,
        parent_phone: dto.parent_phone ?? null,
        parent_email: dto.parent_email ?? null,
        enrolled_at: dto.enrolled_at ?? new Date(),
      },
    });

    this.eventEmitter.emit(NOTIFICATION_EVENTS.STUDENT_REGISTERED, {
      institutionId,
      studentId: student.id,
      studentName: student.name,
    });

    return student;
  }

  async findAll(
    institutionId: string,
    query: StudentQueryDto,
  ) {
    const { page, limit, search, grade, status, sort_by, sort_order } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      institution_id: institutionId,
    };

    if (grade) {
      where.grade = grade;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total, activeCount, inactiveCount] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort_by]: sort_order },
      }),
      this.prisma.student.count({ where }),
      this.prisma.student.count({
        where: { institution_id: institutionId, status: 'ACTIVE' },
      }),
      this.prisma.student.count({
        where: { institution_id: institutionId, status: 'INACTIVE' },
      }),
    ]);

    return {
      data,
      meta: {
        ...buildPaginationMeta(total, page, limit),
        active_count: activeCount,
        inactive_count: inactiveCount,
      },
    };
  }

  async findOne(institutionId: string, id: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, institution_id: institutionId },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID "${id}" not found`);
    }

    return student;
  }

  async update(institutionId: string, id: string, dto: UpdateStudentDto) {
    await this.findOne(institutionId, id);

    return this.prisma.student.update({
      where: { id },
      data: dto,
    });
  }

  async delete(institutionId: string, id: string) {
    await this.findOne(institutionId, id);

    const result = await this.prisma.student.delete({
      where: { id },
    });

    // Reset plan grace period if count drops below limit
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { plan_type: true, plan_limit_reached_at: true },
    });

    if (institution?.plan_limit_reached_at) {
      const { PLAN_LIMITS } = await import('../../common/constants/plans.js');
      const planConfig = PLAN_LIMITS[institution.plan_type as any];

      // Check BOTH resources before clearing shared grace period
      const studentsBelowLimit =
        planConfig.maxStudents === null ||
        (await this.prisma.student.count({
          where: { institution_id: institutionId, status: 'ACTIVE' },
        })) < planConfig.maxStudents;

      const tutorsBelowLimit =
        planConfig.maxTutors === null ||
        (await this.prisma.tutor.count({
          where: { institution_id: institutionId },
        })) < planConfig.maxTutors;

      if (studentsBelowLimit && tutorsBelowLimit) {
        await this.prisma.institution.update({
          where: { id: institutionId },
          data: { plan_limit_reached_at: null },
        });
      }
    }

    return result;
  }

  async importFromCsv(buffer: Buffer, institutionId: string) {
    const records: Record<string, string>[] = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    const valid: any[] = [];
    const errors: { row: number; message: string }[] = [];

    records.forEach((rec, i) => {
      // Convert empty strings to undefined for optional fields
      const cleaned: Record<string, any> = {};
      for (const [key, val] of Object.entries(rec)) {
        cleaned[key] = val === '' ? undefined : val;
      }
      const result = CreateStudentSchema.safeParse(cleaned);
      if (result.success) {
        valid.push({
          ...result.data,
          institution_id: institutionId,
          enrolled_at: result.data.enrolled_at ?? new Date(),
        });
      } else {
        errors.push({
          row: i + 1,
          message: result.error.issues
            .map((e: any) => `${e.path}: ${e.message}`)
            .join('; '),
        });
      }
    });

    let created = 0;
    if (valid.length > 0) {
      const res = await this.prisma.student.createMany({
        data: valid,
        skipDuplicates: true,
      });
      created = res.count;
    }
    return { created, errors };
  }

  async exportToCsv(
    query: Record<string, any>,
    institutionId: string,
  ): Promise<string> {
    const where: any = { institution_id: institutionId };
    if (query.status) where.status = query.status;
    if (query.grade) where.grade = query.grade;
    if (query.search)
      where.name = { contains: query.search, mode: 'insensitive' };

    const students = await this.prisma.student.findMany({
      where,
      select: {
        name: true,
        email: true,
        phone: true,
        grade: true,
        status: true,
        parent_name: true,
        parent_phone: true,
        parent_email: true,
      },
    });
    return stringify(students, { header: true });
  }
}
