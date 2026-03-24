import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type {
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
  AcademicYearQueryDto,
  CreateSemesterDto,
  UpdateSemesterDto,
  RollOverDto,
} from './academic-year.dto.js';

@Injectable()
export class AcademicYearService {
  constructor(private prisma: PrismaService) {}

  // ─── Academic Year ───

  async findAllYears(tenantId: string, query: AcademicYearQueryDto) {
    const where: Record<string, unknown> = { institution_id: tenantId };
    if (query.status) where.status = query.status;

    return this.prisma.academicYear.findMany({
      where,
      include: {
        semesters: {
          orderBy: { start_date: 'asc' },
          include: { _count: { select: { classes: true } } },
        },
      },
      orderBy: { start_date: 'desc' },
    });
  }

  async findYearById(tenantId: string, id: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id, institution_id: tenantId },
      include: {
        semesters: {
          orderBy: { start_date: 'asc' },
          include: {
            _count: { select: { classes: true } },
          },
        },
      },
    });
    if (!year) throw new NotFoundException('Academic year not found');
    return year;
  }

  async createYear(tenantId: string, dto: CreateAcademicYearDto) {
    const existing = await this.prisma.academicYear.findUnique({
      where: {
        institution_id_name: { institution_id: tenantId, name: dto.name },
      },
    });
    if (existing)
      throw new ConflictException('Academic year name already exists');

    return this.prisma.academicYear.create({
      data: {
        institution_id: tenantId,
        name: dto.name,
        start_date: dto.start_date,
        end_date: dto.end_date,
      },
    });
  }

  async updateYear(tenantId: string, id: string, dto: UpdateAcademicYearDto) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id, institution_id: tenantId },
    });
    if (!year) throw new NotFoundException('Academic year not found');

    if (dto.name && dto.name !== year.name) {
      const existing = await this.prisma.academicYear.findUnique({
        where: {
          institution_id_name: { institution_id: tenantId, name: dto.name },
        },
      });
      if (existing)
        throw new ConflictException('Academic year name already exists');
    }

    return this.prisma.academicYear.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.start_date !== undefined && { start_date: dto.start_date }),
        ...(dto.end_date !== undefined && { end_date: dto.end_date }),
      },
    });
  }

  async deleteYear(tenantId: string, id: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id, institution_id: tenantId },
    });
    if (!year) throw new NotFoundException('Academic year not found');

    const semesterCount = await this.prisma.semester.count({
      where: { academic_year_id: id },
    });
    if (semesterCount > 0) {
      throw new BadRequestException(
        'Cannot delete academic year: still has semesters. Archive or delete semesters first.',
      );
    }

    return this.prisma.academicYear.delete({ where: { id } });
  }

  // ─── Semester ───

  async findSemesterById(tenantId: string, id: string) {
    const semester = await this.prisma.semester.findFirst({
      where: { id, institution_id: tenantId },
      include: {
        academic_year: true,
        classes: {
          include: {
            subject: { select: { id: true, name: true } },
            tutor: { select: { id: true, user: { select: { name: true } } } },
            schedules: true,
            _count: { select: { enrollments: true } },
          },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!semester) throw new NotFoundException('Semester not found');
    return semester;
  }

  async createSemester(
    tenantId: string,
    yearId: string,
    dto: CreateSemesterDto,
  ) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: yearId, institution_id: tenantId },
    });
    if (!year) throw new NotFoundException('Academic year not found');

    const existing = await this.prisma.semester.findUnique({
      where: {
        academic_year_id_name: { academic_year_id: yearId, name: dto.name },
      },
    });
    if (existing)
      throw new ConflictException(
        'Semester name already exists in this academic year',
      );

    return this.prisma.semester.create({
      data: {
        institution_id: tenantId,
        academic_year_id: yearId,
        name: dto.name,
        start_date: dto.start_date,
        end_date: dto.end_date,
      },
    });
  }

  async updateSemester(tenantId: string, id: string, dto: UpdateSemesterDto) {
    const semester = await this.prisma.semester.findFirst({
      where: { id, institution_id: tenantId },
    });
    if (!semester) throw new NotFoundException('Semester not found');

    if (dto.name && dto.name !== semester.name) {
      const existing = await this.prisma.semester.findUnique({
        where: {
          academic_year_id_name: {
            academic_year_id: semester.academic_year_id,
            name: dto.name,
          },
        },
      });
      if (existing)
        throw new ConflictException(
          'Semester name already exists in this academic year',
        );
    }

    return this.prisma.semester.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.start_date !== undefined && { start_date: dto.start_date }),
        ...(dto.end_date !== undefined && { end_date: dto.end_date }),
      },
    });
  }

  async deleteSemester(tenantId: string, id: string) {
    const semester = await this.prisma.semester.findFirst({
      where: { id, institution_id: tenantId },
    });
    if (!semester) throw new NotFoundException('Semester not found');

    const activeClassCount = await this.prisma.class.count({
      where: { semester_id: id, status: 'ACTIVE' },
    });
    if (activeClassCount > 0) {
      throw new BadRequestException(
        'Cannot delete semester: still has active classes. Archive the semester first.',
      );
    }

    return this.prisma.semester.delete({ where: { id } });
  }

  async archiveSemester(tenantId: string, id: string) {
    const semester = await this.prisma.semester.findFirst({
      where: { id, institution_id: tenantId },
      include: { academic_year: true },
    });
    if (!semester) throw new NotFoundException('Semester not found');
    if (semester.status === 'ARCHIVED') {
      throw new BadRequestException('Semester is already archived');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.semester.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });

      await tx.class.updateMany({
        where: { semester_id: id, status: 'ACTIVE' },
        data: { status: 'ARCHIVED' },
      });

      const activeSemesters = await tx.semester.count({
        where: {
          academic_year_id: semester.academic_year_id,
          status: 'ACTIVE',
          id: { not: id },
        },
      });

      if (activeSemesters === 0) {
        await tx.academicYear.update({
          where: { id: semester.academic_year_id },
          data: { status: 'ARCHIVED' },
        });
      }

      return { archived_classes: true, year_archived: activeSemesters === 0 };
    });
  }

  // ─── Roll-over ───

  async rollOver(tenantId: string, targetSemesterId: string, dto: RollOverDto) {
    if (dto.source_semester_id === targetSemesterId) {
      throw new BadRequestException(
        'Source and target semester must be different',
      );
    }

    const targetSemester = await this.prisma.semester.findFirst({
      where: { id: targetSemesterId, institution_id: tenantId },
    });
    if (!targetSemester)
      throw new NotFoundException('Target semester not found');

    const sourceSemester = await this.prisma.semester.findFirst({
      where: { id: dto.source_semester_id, institution_id: tenantId },
    });
    if (!sourceSemester)
      throw new NotFoundException('Source semester not found');

    const whereClasses: Record<string, unknown> = {
      semester_id: dto.source_semester_id,
    };
    if (dto.class_ids?.length) {
      whereClasses.id = { in: dto.class_ids };
    }

    const sourceClasses = await this.prisma.class.findMany({
      where: whereClasses,
      include: { schedules: true },
    });

    if (sourceClasses.length === 0) {
      throw new BadRequestException(
        'No classes found in source semester to roll over',
      );
    }

    const existingTargetClasses = await this.prisma.class.findMany({
      where: { semester_id: targetSemesterId },
      select: { name: true },
    });
    const existingNames = new Set(existingTargetClasses.map((c) => c.name));
    const classesToCopy = sourceClasses.filter(
      (c) => !existingNames.has(c.name),
    );

    if (classesToCopy.length === 0) {
      throw new BadRequestException(
        'All classes already exist in target semester',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const createdClasses: { id: string }[] = [];

      for (const sourceClass of classesToCopy) {
        const newClass = await tx.class.create({
          data: {
            institution_id: tenantId,
            semester_id: targetSemesterId,
            name: sourceClass.name,
            subject_id: sourceClass.subject_id,
            tutor_id: sourceClass.tutor_id,
            capacity: sourceClass.capacity,
            fee: sourceClass.fee,
            tutor_fee: sourceClass.tutor_fee,
            tutor_fee_mode: sourceClass.tutor_fee_mode,
            tutor_fee_per_student: sourceClass.tutor_fee_per_student,
            room: sourceClass.room,
            status: 'ACTIVE',
          },
        });

        if (sourceClass.schedules.length > 0) {
          await tx.classSchedule.createMany({
            data: sourceClass.schedules.map((s) => ({
              class_id: newClass.id,
              day: s.day,
              start_time: s.start_time,
              end_time: s.end_time,
            })),
          });
        }

        createdClasses.push(newClass);
      }

      return {
        created_count: createdClasses.length,
        skipped_count: sourceClasses.length - classesToCopy.length,
        classes: createdClasses,
      };
    });
  }
}
