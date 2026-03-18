import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    const tutor = await this.prisma.tutor.findFirst({
      where: { id: dto.tutor_id, institution_id: institutionId },
    });

    if (!tutor) {
      throw new NotFoundException('Tutor not found');
    }

    if (!tutor.is_verified) {
      throw new BadRequestException('Only verified tutors can be assigned to classes');
    }

    // Validate subject exists in institution
    const subject = await this.prisma.subject.findFirst({
      where: { id: dto.subject_id, institution_id: institutionId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    // Validate tutor teaches this subject
    const tutorSubject = await this.prisma.tutorSubject.findUnique({
      where: { tutor_id_subject_id: { tutor_id: dto.tutor_id, subject_id: dto.subject_id } },
    });
    if (!tutorSubject) throw new BadRequestException('Tutor does not teach this subject');

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.class.create({
        data: {
          institution_id: institutionId,
          tutor_id: dto.tutor_id,
          name: dto.name,
          subject_id: dto.subject_id,
          capacity: dto.capacity,
          fee: dto.fee,
          package_fee: dto.package_fee ?? null,
          tutor_fee: dto.tutor_fee,
          tutor_fee_mode: dto.tutor_fee_mode ?? 'FIXED_PER_SESSION',
          tutor_fee_per_student: dto.tutor_fee_per_student ?? null,
          room: dto.room ?? null,
          status: dto.status ?? 'ACTIVE',
        },
      });

      await tx.classSchedule.createMany({
        data: dto.schedules.map((s) => ({
          class_id: record.id,
          day: s.day,
          start_time: s.start_time,
          end_time: s.end_time,
        })),
      });

      const result = await tx.class.findUnique({
        where: { id: record.id },
        include: {
          subject: true,
          tutor: { include: { user: { select: { id: true, name: true } } } },
          schedules: true,
        },
      });

      return {
        ...result,
        fee: Number(record.fee),
        package_fee: record.package_fee != null ? Number(record.package_fee) : null,
        tutor_fee: Number(record.tutor_fee),
        tutor_fee_mode: record.tutor_fee_mode,
        tutor_fee_per_student: record.tutor_fee_per_student != null ? Number(record.tutor_fee_per_student) : null,
      };
    });
  }

  async findAll(
    institutionId: string,
    query: ClassQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const { page, limit, search, subject_id, tutor_id, status, sort_by, sort_order } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      institution_id: institutionId,
    };

    if (subject_id) {
      where.subject_id = subject_id;
    }

    if (tutor_id) {
      where.tutor_id = tutor_id;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy =
      sort_by === 'subject_name'
        ? { subject: { name: sort_order } }
        : { [sort_by]: sort_order };

    const [data, total] = await Promise.all([
      this.prisma.class.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          subject: true,
          tutor: { include: { user: { select: { id: true, name: true } } } },
          schedules: true,
          _count: { select: { enrollments: { where: { status: { in: ['ACTIVE', 'TRIAL'] } } } } },
        },
      }),
      this.prisma.class.count({ where }),
    ]);

    return {
      data: data.map(({ _count, ...c }) => ({
        ...c,
        fee: Number(c.fee),
        package_fee: c.package_fee != null ? Number(c.package_fee) : null,
        tutor_fee: c.tutor_fee != null ? Number(c.tutor_fee) : null,
        tutor_fee_mode: c.tutor_fee_mode,
        tutor_fee_per_student: c.tutor_fee_per_student != null ? Number(c.tutor_fee_per_student) : null,
        tutor: c.tutor ? { id: c.tutor.id, name: c.tutor.user.name } : null,
        enrolled_count: _count.enrollments,
      })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(institutionId: string, id: string) {
    const classRecord = await this.prisma.class.findFirst({
      where: { id, institution_id: institutionId },
      include: {
        subject: true,
        tutor: { include: { user: { select: { id: true, name: true, email: true } } } },
        schedules: true,
        enrollments: {
          where: { status: { in: ['ACTIVE', 'TRIAL'] } },
          include: { student: { select: { id: true, name: true, grade: true, status: true } } },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!classRecord) {
      throw new NotFoundException(`Class with ID "${id}" not found`);
    }

    return {
      ...classRecord,
      fee: Number(classRecord.fee),
      package_fee: classRecord.package_fee != null ? Number(classRecord.package_fee) : null,
      tutor_fee: classRecord.tutor_fee != null ? Number(classRecord.tutor_fee) : null,
      tutor_fee_mode: classRecord.tutor_fee_mode,
      tutor_fee_per_student: classRecord.tutor_fee_per_student != null ? Number(classRecord.tutor_fee_per_student) : null,
      tutor: classRecord.tutor ? { id: classRecord.tutor.id, name: classRecord.tutor.user.name, email: classRecord.tutor.user.email } : null,
      enrolled_count: classRecord.enrollments.length,
      enrollments: classRecord.enrollments.map((e) => ({ id: e.id, status: e.status, student: e.student })),
    };
  }

  async update(institutionId: string, id: string, dto: UpdateClassDto) {
    const existing = await this.prisma.class.findFirst({
      where: { id, institution_id: institutionId },
    });

    if (!existing) {
      throw new NotFoundException(`Class with ID "${id}" not found`);
    }

    if (dto.tutor_id) {
      const tutor = await this.prisma.tutor.findFirst({
        where: { id: dto.tutor_id, institution_id: institutionId },
      });

      if (!tutor) {
        throw new NotFoundException('Tutor not found');
      }

      if (!tutor.is_verified) {
        throw new BadRequestException('Only verified tutors can be assigned to classes');
      }
    }

    if (dto.tutor_id || dto.subject_id) {
      const effectiveTutorId = dto.tutor_id ?? existing.tutor_id;
      const effectiveSubjectId = dto.subject_id ?? existing.subject_id;

      const tutorSubject = await this.prisma.tutorSubject.findUnique({
        where: { tutor_id_subject_id: { tutor_id: effectiveTutorId, subject_id: effectiveSubjectId } },
      });
      if (!tutorSubject) throw new BadRequestException('Tutor does not teach this subject');
    }

    const { schedules, subject_id, tutor_id, name, capacity, fee, room, package_fee, tutor_fee, tutor_fee_mode, tutor_fee_per_student, status } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (schedules) {
        await tx.classSchedule.deleteMany({ where: { class_id: id } });
        await tx.classSchedule.createMany({
          data: schedules.map((s) => ({
            class_id: id,
            day: s.day,
            start_time: s.start_time,
            end_time: s.end_time,
          })),
        });
      }

      const record = await tx.class.update({
        where: { id },
        data: {
          ...(subject_id !== undefined && { subject_id }),
          ...(tutor_id !== undefined && { tutor_id }),
          ...(name !== undefined && { name }),
          ...(capacity !== undefined && { capacity }),
          ...(fee !== undefined && { fee }),
          ...(room !== undefined && { room }),
          ...(package_fee !== undefined && { package_fee }),
          ...(tutor_fee !== undefined && { tutor_fee }),
          ...(tutor_fee_mode !== undefined && { tutor_fee_mode }),
          ...(tutor_fee_per_student !== undefined && { tutor_fee_per_student }),
          ...(status !== undefined && { status }),
        },
        include: {
          subject: true,
          tutor: { include: { user: { select: { id: true, name: true } } } },
          schedules: true,
        },
      });

      return {
        ...record,
        fee: Number(record.fee),
        package_fee: record.package_fee != null ? Number(record.package_fee) : null,
        tutor_fee: Number(record.tutor_fee),
        tutor_fee_mode: record.tutor_fee_mode,
        tutor_fee_per_student: record.tutor_fee_per_student != null ? Number(record.tutor_fee_per_student) : null,
      };
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
