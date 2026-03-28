import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
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
  ImportEnrollmentRowSchema,
  ImportEnrollmentRowDto,
  BulkUpdateEnrollmentDto,
  EnrollmentExportQueryDto,
} from './enrollment.dto.js';

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceGenerator: InvoiceGeneratorService,
  ) {}

  private schedulesConflict(
    schedulesA: { day: string; start_time: string; end_time: string }[],
    schedulesB: { day: string; start_time: string; end_time: string }[],
  ): boolean {
    for (const a of schedulesA) {
      for (const b of schedulesB) {
        if (
          a.day === b.day &&
          a.start_time < b.end_time &&
          b.start_time < a.end_time
        ) {
          return true;
        }
      }
    }
    return false;
  }

  async checkConflict(institutionId: string, dto: CheckConflictDto) {
    // 1. Get target class schedule
    const targetClass = await this.prisma.class.findFirst({
      where: { id: dto.class_id, institution_id: institutionId },
      include: { schedules: true },
    });

    if (!targetClass) {
      throw new NotFoundException(`Class with ID "${dto.class_id}" not found`);
    }

    // 2. Get all student's existing ACTIVE/TRIAL enrollments with class schedule
    const existingEnrollments = await this.prisma.enrollment.findMany({
      where: {
        student_id: dto.student_id,
        institution_id: institutionId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      include: {
        class: { include: { schedules: true } },
      },
    });

    // 3. Check each for schedule overlap
    const conflictingClasses: Array<{
      id: string;
      name: string;
      schedules: { day: string; start_time: string; end_time: string }[];
    }> = [];

    for (const enrollment of existingEnrollments) {
      const enrolledClass = enrollment.class;

      if (
        this.schedulesConflict(targetClass.schedules, enrolledClass.schedules)
      ) {
        conflictingClasses.push({
          id: enrolledClass.id,
          name: enrolledClass.name,
          schedules: enrolledClass.schedules,
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

    // Check class capacity
    const targetClass = await this.prisma.class.findFirst({
      where: { id: dto.class_id, institution_id: institutionId },
      select: { capacity: true, name: true },
    });
    if (targetClass?.capacity) {
      const currentCount = await this.prisma.enrollment.count({
        where: {
          class_id: dto.class_id,
          institution_id: institutionId,
          status: { in: ['ACTIVE', 'TRIAL'] },
        },
      });
      if (currentCount >= targetClass.capacity) {
        throw new ConflictException(
          `Class "${targetClass.name}" is at full capacity (${currentCount}/${targetClass.capacity})`,
        );
      }
    }

    // Check for duplicate enrollment (student+class) scoped to institution
    const existing = await this.prisma.enrollment.findFirst({
      where: {
        student_id: dto.student_id,
        class_id: dto.class_id,
        institution_id: institutionId,
      },
    });

    if (existing) {
      throw new ConflictException('Student is already enrolled in this class');
    }

    const enrolledAt = dto.enrolled_at ?? new Date();

    const enrollment = await this.prisma.enrollment.create({
      data: {
        institution_id: institutionId,
        student_id: dto.student_id,
        class_id: dto.class_id,
        status: dto.status ?? 'ACTIVE',
        payment_status: dto.payment_status ?? 'NEW',
        enrolled_at: enrolledAt,
      },
      include: {
        student: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
    });

    // Auto-generate mid-month enrollment payment only when autoInvoice is on
    if (dto.payment_status !== 'NEW') {
      await this.invoiceGenerator.generateMidMonthEnrollmentPayment({
        institutionId,
        studentId: dto.student_id,
        enrollmentId: enrollment.id,
        classId: dto.class_id,
        enrolledAt,
      });
    }

    return enrollment;
  }

  async findAll(
    institutionId: string,
    query: EnrollmentQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const {
      page,
      limit,
      search,
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

    if (search) {
      where.OR = [
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { class: { name: { contains: search, mode: 'insensitive' } } },
      ];
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

  async getStats(institutionId: string) {
    const [active, trial, waitlisted, overdue] = await Promise.all([
      this.prisma.enrollment.count({ where: { institution_id: institutionId, status: 'ACTIVE' } }),
      this.prisma.enrollment.count({ where: { institution_id: institutionId, status: 'TRIAL' } }),
      this.prisma.enrollment.count({ where: { institution_id: institutionId, status: 'WAITLISTED' } }),
      this.prisma.enrollment.count({ where: { institution_id: institutionId, payment_status: 'OVERDUE' } }),
    ]);
    return { active, trial, waitlisted, overdue };
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

    return this.prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({
        where: { enrollment_id: id, institution_id: institutionId },
      });
      return tx.enrollment.delete({ where: { id } });
    });
  }

  async exportToCsv(
    query: EnrollmentExportQueryDto,
    institutionId: string,
  ): Promise<string> {
    const where: any = { institution_id: institutionId };
    if (query.status) where.status = query.status;
    if (query.class_id) where.class_id = query.class_id;
    if (query.student_id) where.student_id = query.student_id;
    if (query.payment_status) where.payment_status = query.payment_status;

    const enrollments = await this.prisma.enrollment.findMany({
      where,
      include: {
        student: { select: { name: true } },
        class: { select: { name: true } },
      },
      orderBy: { enrolled_at: 'desc' },
    });

    return stringify(
      enrollments.map((e) => ({
        student_name: e.student?.name ?? '',
        class_name: e.class?.name ?? '',
        status: e.status,
        payment_status: e.payment_status,
        enrolled_at: e.enrolled_at?.toISOString().split('T')[0] ?? '',
      })),
      { header: true },
    );
  }

  async bulkUpdate(institutionId: string, dto: BulkUpdateEnrollmentDto) {
    const { ids, ...data } = dto;
    const result = await this.prisma.enrollment.updateMany({
      where: { id: { in: ids }, institution_id: institutionId },
      data,
    });
    return { updated: result.count };
  }

  async bulkDelete(institutionId: string, ids: string[]) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({
        where: { enrollment_id: { in: ids }, institution_id: institutionId },
      });
      return tx.enrollment.deleteMany({
        where: { id: { in: ids }, institution_id: institutionId },
      });
    });
    return { deleted: result.count };
  }

  async importFromCsv(buffer: Buffer, institutionId: string) {
    const records: Record<string, string>[] = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length > 500) {
      throw new BadRequestException(`CSV exceeds maximum of 500 rows`);
    }

    let created = 0;
    let skipped = 0;
    const errors: { row: number; message: string }[] = [];

    // --- Phase 1: Parse & schema-validate all rows ---
    const parsedRows: (ImportEnrollmentRowDto & { rowNum: number })[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 1;
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
      parsedRows.push({ rowNum, ...result.data });
    }

    if (parsedRows.length === 0) {
      return { created, skipped, errors };
    }

    // --- Phase 1b: Bulk pre-fetch in parallel ---
    const studentIds = [...new Set(parsedRows.map((r) => r.student_id))];
    const classIds = [...new Set(parsedRows.map((r) => r.class_id))];

    const [students, classes, existingEnrollments, activeEnrollments, classEnrollmentCountsRaw] =
      await Promise.all([
        // All referenced students in this institution
        this.prisma.student.findMany({
          where: { id: { in: studentIds }, institution_id: institutionId },
          select: { id: true },
        }),
        // All referenced classes with schedules
        this.prisma.class.findMany({
          where: { id: { in: classIds }, institution_id: institutionId },
          include: { schedules: true },
        }),
        // Existing enrollments for duplicate check (student+class pairs)
        this.prisma.enrollment.findMany({
          where: {
            institution_id: institutionId,
            student_id: { in: studentIds },
            class_id: { in: classIds },
          },
          select: { student_id: true, class_id: true },
        }),
        // All ACTIVE/TRIAL enrollments for conflict check
        this.prisma.enrollment.findMany({
          where: {
            institution_id: institutionId,
            student_id: { in: studentIds },
            status: { in: ['ACTIVE', 'TRIAL'] },
          },
          include: { class: { include: { schedules: true } } },
        }),
        // Current enrollment counts per class for capacity check
        this.prisma.enrollment.groupBy({
          by: ['class_id'],
          where: {
            institution_id: institutionId,
            class_id: { in: classIds },
            status: { in: ['ACTIVE', 'TRIAL'] },
          },
          _count: { class_id: true },
        }),
      ]);

    // --- Phase 1c: Build lookup maps ---
    const studentSet = new Set(students.map((s) => s.id));
    const classMap = new Map(classes.map((c) => [c.id, c]));
    const duplicateSet = new Set(
      existingEnrollments.map((e) => `${e.student_id}:${e.class_id}`),
    );

    // Map student_id -> list of enrolled class schedules (for conflict check)
    const studentEnrollmentsMap = new Map<
      string,
      { className: string; schedules: { day: string; start_time: string; end_time: string }[] }[]
    >();
    for (const e of activeEnrollments) {
      const list = studentEnrollmentsMap.get(e.student_id) ?? [];
      list.push({ className: e.class.name, schedules: e.class.schedules });
      studentEnrollmentsMap.set(e.student_id, list);
    }

    // Track class enrollment counts for capacity checking (mutable — incremented per valid row)
    const classEnrollmentCounts = new Map<string, number>(
      classEnrollmentCountsRaw.map((c) => [c.class_id, c._count.class_id]),
    );

    // Track intra-batch duplicates
    const batchDuplicateSet = new Set<string>();

    // --- Phase 1d: In-memory validation ---
    const validRows: (ImportEnrollmentRowDto & { rowNum: number })[] = [];

    for (const row of parsedRows) {
      const { rowNum, student_id, class_id } = row;
      const pairKey = `${student_id}:${class_id}`;

      // Student exists?
      if (!studentSet.has(student_id)) {
        errors.push({
          row: rowNum,
          message: `Student ${student_id} not found in institution`,
        });
        continue;
      }

      // Class exists?
      const targetClass = classMap.get(class_id);
      if (!targetClass) {
        errors.push({
          row: rowNum,
          message: `Class ${class_id} not found in institution`,
        });
        continue;
      }

      // Duplicate in DB?
      if (duplicateSet.has(pairKey)) {
        skipped++;
        errors.push({
          row: rowNum,
          message: `Student already enrolled in this class`,
        });
        continue;
      }

      // Intra-batch duplicate?
      if (batchDuplicateSet.has(pairKey)) {
        skipped++;
        errors.push({
          row: rowNum,
          message: `Student already enrolled in this class`,
        });
        continue;
      }

      // Schedule conflict?
      const existingSchedules = studentEnrollmentsMap.get(student_id) ?? [];
      const conflictNames: string[] = [];
      for (const enrolled of existingSchedules) {
        if (this.schedulesConflict(targetClass.schedules, enrolled.schedules)) {
          conflictNames.push(enrolled.className);
        }
      }

      if (conflictNames.length > 0) {
        skipped++;
        errors.push({
          row: rowNum,
          message: `Schedule conflict with: ${conflictNames.join(', ')}`,
        });
        continue;
      }

      // Capacity check
      if (targetClass.capacity) {
        const currentCount = classEnrollmentCounts.get(class_id) ?? 0;
        if (currentCount >= targetClass.capacity) {
          skipped++;
          errors.push({
            row: rowNum,
            message: `Class "${targetClass.name}" is at full capacity (${currentCount}/${targetClass.capacity})`,
          });
          continue;
        }
      }

      // Row is valid — track it for intra-batch dedup, conflict detection, and capacity
      batchDuplicateSet.add(pairKey);
      classEnrollmentCounts.set(class_id, (classEnrollmentCounts.get(class_id) ?? 0) + 1);

      // Add this new enrollment's schedules to the student's map for subsequent rows
      const studentList = studentEnrollmentsMap.get(student_id) ?? [];
      studentList.push({
        className: targetClass.name,
        schedules: targetClass.schedules,
      });
      studentEnrollmentsMap.set(student_id, studentList);

      validRows.push(row);
    }

    if (validRows.length === 0) {
      return { created, skipped, errors };
    }

    // --- Phase 2: Execute in transaction ---
    const enrolledAt = new Date();
    try {
      const createdEnrollments = await this.prisma.$transaction(async (tx) => {
        const results: {
          id: string;
          student_id: string;
          class_id: string;
          rowNum: number;
        }[] = [];

        for (const row of validRows) {
          const enrollment = await tx.enrollment.create({
            data: {
              institution_id: institutionId,
              student_id: row.student_id,
              class_id: row.class_id,
              status: row.status,
              payment_status: 'NEW',
              enrolled_at: enrolledAt,
            },
          });
          results.push({
            id: enrollment.id,
            student_id: row.student_id,
            class_id: row.class_id,
            rowNum: row.rowNum,
          });
        }

        return results;
      });

      created = createdEnrollments.length;

      // --- Phase 2b: Generate invoices outside transaction ---
      for (const enrollment of createdEnrollments) {
        try {
          await this.invoiceGenerator.generateMidMonthEnrollmentPayment({
            institutionId,
            studentId: enrollment.student_id,
            enrollmentId: enrollment.id,
            classId: enrollment.class_id,
            enrolledAt,
          });
        } catch {
          // Invoice generation failure is non-fatal — enrollment already created
        }
      }
    } catch (err: any) {
      // Transaction failed — all creates rolled back
      return {
        created: 0,
        skipped,
        errors: [
          ...errors,
          {
            row: 0,
            message: 'Import failed: database error, all rows rolled back',
          },
        ],
      };
    }

    return { created, skipped, errors };
  }
}
