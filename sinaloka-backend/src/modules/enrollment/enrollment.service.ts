import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { InvoiceGeneratorService } from '../payment/invoice-generator.service.js';
import {
  buildPaginationMeta,
  PaginatedResponse,
} from '../../common/dto/pagination.dto.js';
import {
  CreateEnrollmentDto,
  UpdateEnrollmentDto,
  EnrollmentQueryDto,
  CheckConflictDto,
} from './enrollment.dto.js';
import { ImportEnrollmentRowSchema } from './enrollment.dto.js';

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceGenerator: InvoiceGeneratorService,
  ) {}

  private timeRangesOverlap(
    startA: string,
    endA: string,
    startB: string,
    endB: string,
  ): boolean {
    return startA < endB && startB < endA;
  }

  private daysOverlap(daysA: string[], daysB: string[]): boolean {
    return daysA.some((day) => daysB.includes(day));
  }

  async checkConflict(institutionId: string, dto: CheckConflictDto) {
    // 1. Get target class schedule
    const targetClass = await this.prisma.class.findFirst({
      where: { id: dto.class_id, institution_id: institutionId },
    });

    if (!targetClass) {
      throw new NotFoundException(
        `Class with ID "${dto.class_id}" not found`,
      );
    }

    // 2. Get all student's existing ACTIVE/TRIAL enrollments with class schedule
    const existingEnrollments = await this.prisma.enrollment.findMany({
      where: {
        student_id: dto.student_id,
        institution_id: institutionId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      include: {
        class: true,
      },
    });

    // 3. Check each for day overlap AND time range overlap
    const conflictingClasses: Array<{
      id: string;
      name: string;
      schedule_days: string[];
      schedule_start_time: string;
      schedule_end_time: string;
    }> = [];

    for (const enrollment of existingEnrollments) {
      const enrolledClass = enrollment.class;

      if (
        this.daysOverlap(
          targetClass.schedule_days,
          enrolledClass.schedule_days,
        ) &&
        this.timeRangesOverlap(
          targetClass.schedule_start_time,
          targetClass.schedule_end_time,
          enrolledClass.schedule_start_time,
          enrolledClass.schedule_end_time,
        )
      ) {
        conflictingClasses.push({
          id: enrolledClass.id,
          name: enrolledClass.name,
          schedule_days: enrolledClass.schedule_days,
          schedule_start_time: enrolledClass.schedule_start_time,
          schedule_end_time: enrolledClass.schedule_end_time,
        });
      }
    }

    return {
      has_conflict: conflictingClasses.length > 0,
      conflicting_classes: conflictingClasses,
    };
  }

  async create(institutionId: string, dto: CreateEnrollmentDto) {
    // Check for schedule conflict
    const conflictResult = await this.checkConflict(institutionId, {
      student_id: dto.student_id,
      class_id: dto.class_id,
    });

    if (conflictResult.has_conflict) {
      const names = conflictResult.conflicting_classes
        .map((c) => c.name)
        .join(', ');
      throw new ConflictException(
        `Schedule conflict with existing class(es): ${names}`,
      );
    }

    // Check for duplicate enrollment (student+class)
    const existing = await this.prisma.enrollment.findFirst({
      where: {
        student_id: dto.student_id,
        class_id: dto.class_id,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Student is already enrolled in this class',
      );
    }

    const enrollment = await this.prisma.enrollment.create({
      data: {
        institution_id: institutionId,
        student_id: dto.student_id,
        class_id: dto.class_id,
        status: dto.status ?? 'ACTIVE',
        payment_status: dto.payment_status ?? 'PENDING',
        enrolled_at: dto.enrolled_at ?? new Date(),
      },
      include: {
        student: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
    });

    // Auto-generate package payment
    await this.invoiceGenerator.generatePackagePayment({
      institutionId,
      studentId: dto.student_id,
      enrollmentId: enrollment.id,
      classId: dto.class_id,
      enrolledAt: enrollment.enrolled_at,
    });

    return enrollment;
  }

  async findAll(
    institutionId: string,
    query: EnrollmentQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const {
      page,
      limit,
      student_id,
      class_id,
      status,
      payment_status,
      sort_by,
      sort_order,
    } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      institution_id: institutionId,
    };

    if (student_id) {
      where.student_id = student_id;
    }

    if (class_id) {
      where.class_id = class_id;
    }

    if (status) {
      where.status = status;
    }

    if (payment_status) {
      where.payment_status = payment_status;
    }

    const [data, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort_by]: sort_order },
        include: {
          student: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
        },
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(institutionId: string, id: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id, institution_id: institutionId },
      include: {
        student: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID "${id}" not found`);
    }

    return enrollment;
  }

  async update(institutionId: string, id: string, dto: UpdateEnrollmentDto) {
    const existing = await this.prisma.enrollment.findFirst({
      where: { id, institution_id: institutionId },
    });

    if (!existing) {
      throw new NotFoundException(`Enrollment with ID "${id}" not found`);
    }

    return this.prisma.enrollment.update({
      where: { id },
      data: dto,
      include: {
        student: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
    });
  }

  async delete(institutionId: string, id: string) {
    const existing = await this.prisma.enrollment.findFirst({
      where: { id, institution_id: institutionId },
    });

    if (!existing) {
      throw new NotFoundException(`Enrollment with ID "${id}" not found`);
    }

    return this.prisma.enrollment.delete({
      where: { id },
    });
  }

  async importFromCsv(buffer: Buffer, institutionId: string) {
    const records: Record<string, string>[] = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    let created = 0;
    let skipped = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 1;

      try {
        // 1. Validate row schema
        const result = ImportEnrollmentRowSchema.safeParse(row);
        if (!result.success) {
          errors.push({
            row: rowNum,
            message: result.error.issues
              .map((e: any) => `${e.path}: ${e.message}`)
              .join('; '),
          });
          continue;
        }

        const { student_id, class_id, status } = result.data;

        // 2. Verify student exists in institution
        const student = await this.prisma.student.findFirst({
          where: { id: student_id, institution_id: institutionId },
        });
        if (!student) {
          errors.push({ row: rowNum, message: `Student ${student_id} not found in institution` });
          continue;
        }

        // 3. Verify class exists in institution
        const cls = await this.prisma.class.findFirst({
          where: { id: class_id, institution_id: institutionId },
        });
        if (!cls) {
          errors.push({ row: rowNum, message: `Class ${class_id} not found in institution` });
          continue;
        }

        // 4. Check duplicate enrollment (student+class)
        const existing = await this.prisma.enrollment.findFirst({
          where: { student_id, class_id, institution_id: institutionId },
        });
        if (existing) {
          skipped++;
          errors.push({ row: rowNum, message: `Student already enrolled in this class` });
          continue;
        }

        // 5. Run schedule conflict detection
        const conflictResult = await this.checkConflict(institutionId, {
          student_id,
          class_id,
        });
        if (conflictResult.has_conflict) {
          const names = conflictResult.conflicting_classes
            .map((c) => c.name)
            .join(', ');
          skipped++;
          errors.push({ row: rowNum, message: `Schedule conflict with: ${names}` });
          continue;
        }

        // 6. Create enrollment
        const enrollment = await this.prisma.enrollment.create({
          data: {
            institution_id: institutionId,
            student_id,
            class_id,
            status,
            payment_status: 'PENDING',
            enrolled_at: new Date(),
          },
        });

        // 7. Generate package payment
        await this.invoiceGenerator.generatePackagePayment({
          institutionId,
          studentId: student_id,
          enrollmentId: enrollment.id,
          classId: class_id,
          enrolledAt: enrollment.enrolled_at,
        });

        created++;
      } catch (err: any) {
        errors.push({ row: rowNum, message: err.message ?? 'Unknown error' });
      }
    }

    return { created, skipped, errors };
  }
}
