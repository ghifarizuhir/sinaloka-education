import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import {
  buildPaginationMeta,
  PaginatedResponse,
} from '../../common/dto/pagination.dto.js';
import { CreateStudentDto, UpdateStudentDto, StudentQueryDto } from './student.dto.js';

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, dto: CreateStudentDto) {
    return this.prisma.student.create({
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
  }

  async findAll(
    institutionId: string,
    query: StudentQueryDto,
  ): Promise<PaginatedResponse<any>> {
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

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort_by]: sort_order },
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
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

    return this.prisma.student.delete({
      where: { id },
    });
  }
}
