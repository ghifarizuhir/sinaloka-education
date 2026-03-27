import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';

jest.mock('../../common/prisma/prisma.service', () => {
  return {
    PrismaService: jest.fn(),
  };
});

jest.mock('../payment/invoice-generator.service', () => {
  return {
    InvoiceGeneratorService: jest.fn(),
  };
});

import { EnrollmentService } from './enrollment.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { InvoiceGeneratorService } from '../payment/invoice-generator.service.js';

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let invoiceGenerator: {
    generatePerSessionPayment: jest.Mock;
    generateMidMonthEnrollmentPayment: jest.Mock;
  };
  let prisma: {
    enrollment: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    payment: {
      deleteMany: jest.Mock;
    };
    student: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    class: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const mockEnrollment = {
    id: 'enroll-1',
    institution_id: 'inst-1',
    student_id: 'student-1',
    class_id: 'class-1',
    status: 'ACTIVE',
    payment_status: 'PENDING',
    enrolled_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    student: { id: 'student-1', name: 'Test Student' },
    class: { id: 'class-1', name: 'Math 101' },
  };

  const mockClassA = {
    id: 'class-a',
    institution_id: 'inst-1',
    name: 'Class A',
    schedules: [
      {
        id: 'sched-a1',
        day: 'Monday',
        start_time: '14:00',
        end_time: '15:30',
        class_id: 'class-a',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'sched-a2',
        day: 'Wednesday',
        start_time: '14:00',
        end_time: '15:30',
        class_id: 'class-a',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
  };

  const mockClassB = {
    id: 'class-b',
    institution_id: 'inst-1',
    name: 'Class B',
    schedules: [
      {
        id: 'sched-b1',
        day: 'Monday',
        start_time: '15:00',
        end_time: '16:30',
        class_id: 'class-b',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
  };

  const mockClassC = {
    id: 'class-c',
    institution_id: 'inst-1',
    name: 'Class C',
    schedules: [
      {
        id: 'sched-c1',
        day: 'Tuesday',
        start_time: '14:00',
        end_time: '15:30',
        class_id: 'class-c',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'sched-c2',
        day: 'Thursday',
        start_time: '14:00',
        end_time: '15:30',
        class_id: 'class-c',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
  };

  beforeEach(async () => {
    invoiceGenerator = {
      generatePerSessionPayment: jest.fn().mockResolvedValue(undefined),
      generateMidMonthEnrollmentPayment: jest.fn().mockResolvedValue(undefined),
    };
    prisma = {
      enrollment: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      payment: {
        deleteMany: jest.fn(),
      },
      student: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      class: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation(async (fn: any) => {
        return fn({
          payment: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
          enrollment: {
            delete: prisma.enrollment.delete,
            create: prisma.enrollment.create,
          },
        });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentService,
        { provide: PrismaService, useValue: prisma },
        { provide: InvoiceGeneratorService, useValue: invoiceGenerator },
      ],
    }).compile();

    service = module.get<EnrollmentService>(EnrollmentService);
  });

  describe('checkConflict', () => {
    it('should detect conflict when days and times overlap', async () => {
      // Target: Class B (Mon 15:00-16:30)
      // Student enrolled in Class A (Mon/Wed 14:00-15:30) - overlaps on Mon at 15:00
      prisma.class.findFirst.mockResolvedValue(mockClassB);
      prisma.enrollment.findMany.mockResolvedValue([
        { class: mockClassA, status: 'ACTIVE' },
      ]);

      const result = await service.checkConflict('inst-1', {
        student_id: 'student-1',
        class_id: 'class-b',
      });

      expect(result.has_conflict).toBe(true);
      expect(result.conflicting_classes).toHaveLength(1);
      expect(result.conflicting_classes[0].name).toBe('Class A');
    });

    it('should return no conflict when days do not overlap', async () => {
      // Target: Class C (Tue/Thu 14:00-15:30)
      // Student enrolled in Class A (Mon/Wed 14:00-15:30) - no day overlap
      prisma.class.findFirst.mockResolvedValue(mockClassC);
      prisma.enrollment.findMany.mockResolvedValue([
        { class: mockClassA, status: 'ACTIVE' },
      ]);

      const result = await service.checkConflict('inst-1', {
        student_id: 'student-1',
        class_id: 'class-c',
      });

      expect(result.has_conflict).toBe(false);
      expect(result.conflicting_classes).toHaveLength(0);
    });

    it('should return no conflict when times do not overlap', async () => {
      // Target class on same day but non-overlapping time
      const nonOverlappingClass = {
        ...mockClassB,
        id: 'class-d',
        name: 'Class D',
        schedules: [
          {
            id: 'sched-d1',
            day: 'Monday',
            start_time: '16:00',
            end_time: '17:00',
            class_id: 'class-d',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      prisma.class.findFirst.mockResolvedValue(nonOverlappingClass);
      prisma.enrollment.findMany.mockResolvedValue([
        { class: mockClassA, status: 'ACTIVE' },
      ]);

      const result = await service.checkConflict('inst-1', {
        student_id: 'student-1',
        class_id: 'class-d',
      });

      expect(result.has_conflict).toBe(false);
    });

    it('should not consider adjacent times as overlap', async () => {
      // Class A ends at 15:30, target starts at 15:30 — adjacent, not overlapping
      const adjacentClass = {
        id: 'class-adj',
        institution_id: 'inst-1',
        name: 'Adjacent',
        schedules: [
          {
            id: 'sched-adj1',
            day: 'Monday',
            start_time: '15:30',
            end_time: '17:00',
            class_id: 'class-adj',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      prisma.class.findFirst.mockResolvedValue(adjacentClass);
      prisma.enrollment.findMany.mockResolvedValue([
        { class: mockClassA, status: 'ACTIVE' },
      ]);

      const result = await service.checkConflict('inst-1', {
        student_id: 'student-1',
        class_id: 'class-adj',
      });

      expect(result.has_conflict).toBe(false);
    });

    it('should throw NotFoundException if target class not found', async () => {
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(
        service.checkConflict('inst-1', {
          student_id: 'student-1',
          class_id: 'nonexistent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return no conflict when student has no enrollments', async () => {
      prisma.class.findFirst.mockResolvedValue(mockClassA);
      prisma.enrollment.findMany.mockResolvedValue([]);

      const result = await service.checkConflict('inst-1', {
        student_id: 'student-1',
        class_id: 'class-a',
      });

      expect(result.has_conflict).toBe(false);
      expect(result.conflicting_classes).toHaveLength(0);
    });

    it('should ignore DROPPED enrollments for conflict checking', async () => {
      // The findMany query filters by status in ['ACTIVE', 'TRIAL'],
      // so DROPPED enrollments won't be returned
      prisma.class.findFirst.mockResolvedValue(mockClassB);
      prisma.enrollment.findMany.mockResolvedValue([]); // DROPPED filtered out

      const result = await service.checkConflict('inst-1', {
        student_id: 'student-1',
        class_id: 'class-b',
      });

      expect(result.has_conflict).toBe(false);
    });
  });

  describe('create', () => {
    it('should create an enrollment when no conflicts', async () => {
      prisma.class.findFirst.mockResolvedValue(mockClassA);
      prisma.enrollment.findMany.mockResolvedValue([]);
      prisma.enrollment.findFirst.mockResolvedValue(null);
      prisma.enrollment.create.mockResolvedValue(mockEnrollment);

      const result = await service.create('inst-1', {
        student_id: 'student-1',
        class_id: 'class-a',
      });

      expect(result).toEqual(mockEnrollment);
      expect(prisma.enrollment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            institution_id: 'inst-1',
            student_id: 'student-1',
            class_id: 'class-a',
          }),
        }),
      );
    });

    it('should throw ConflictException when schedule conflicts exist', async () => {
      prisma.class.findFirst.mockResolvedValue(mockClassB);
      prisma.enrollment.findMany.mockResolvedValue([
        { class: mockClassA, status: 'ACTIVE' },
      ]);

      await expect(
        service.create('inst-1', {
          student_id: 'student-1',
          class_id: 'class-b',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for duplicate enrollment', async () => {
      prisma.class.findFirst.mockResolvedValue(mockClassA);
      prisma.enrollment.findMany.mockResolvedValue([]); // no schedule conflict
      prisma.enrollment.findFirst.mockResolvedValue(mockEnrollment); // duplicate exists

      await expect(
        service.create('inst-1', {
          student_id: 'student-1',
          class_id: 'class-a',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should NOT call generateMidMonthEnrollmentPayment when payment_status is NEW', async () => {
      prisma.class.findFirst.mockResolvedValue(mockClassA);
      prisma.enrollment.findMany.mockResolvedValue([]);
      prisma.enrollment.findFirst.mockResolvedValue(null);
      prisma.enrollment.create.mockResolvedValue({
        ...mockEnrollment,
        payment_status: 'NEW',
      });

      await service.create('inst-1', {
        student_id: 'student-1',
        class_id: 'class-a',
        payment_status: 'NEW',
      });

      expect(
        invoiceGenerator.generateMidMonthEnrollmentPayment,
      ).not.toHaveBeenCalled();
    });

    it('should call generateMidMonthEnrollmentPayment when payment_status is PENDING', async () => {
      const pendingEnrollment = { ...mockEnrollment, payment_status: 'PENDING' };
      prisma.class.findFirst.mockResolvedValue(mockClassA);
      prisma.enrollment.findMany.mockResolvedValue([]);
      prisma.enrollment.findFirst.mockResolvedValue(null);
      prisma.enrollment.create.mockResolvedValue(pendingEnrollment);

      await service.create('inst-1', {
        student_id: 'student-1',
        class_id: 'class-a',
        payment_status: 'PENDING',
      });

      expect(
        invoiceGenerator.generateMidMonthEnrollmentPayment,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          institutionId: 'inst-1',
          studentId: 'student-1',
          classId: 'class-a',
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated enrollments', async () => {
      prisma.enrollment.findMany.mockResolvedValue([mockEnrollment]);
      prisma.enrollment.count.mockResolvedValue(1);

      const result = await service.findAll('inst-1', {
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      prisma.enrollment.findMany.mockResolvedValue([]);
      prisma.enrollment.count.mockResolvedValue(0);

      await service.findAll('inst-1', {
        page: 1,
        limit: 20,
        status: 'DROPPED',
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'DROPPED' }),
        }),
      );
    });

    it('should filter by student_id', async () => {
      prisma.enrollment.findMany.mockResolvedValue([mockEnrollment]);
      prisma.enrollment.count.mockResolvedValue(1);

      await service.findAll('inst-1', {
        page: 1,
        limit: 20,
        student_id: 'student-1',
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ student_id: 'student-1' }),
        }),
      );
    });

    it('should filter by student name when search param is provided', async () => {
      prisma.enrollment.findMany.mockResolvedValue([mockEnrollment]);
      prisma.enrollment.count.mockResolvedValue(1);

      await service.findAll('inst-1', {
        page: 1,
        limit: 20,
        search: 'Test',
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { student: { name: { contains: 'Test', mode: 'insensitive' } } },
            ]),
          }),
        }),
      );
      expect(prisma.enrollment.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { student: { name: { contains: 'Test', mode: 'insensitive' } } },
            ]),
          }),
        }),
      );
    });

    it('should return empty when search matches nothing', async () => {
      prisma.enrollment.findMany.mockResolvedValue([]);
      prisma.enrollment.count.mockResolvedValue(0);

      const result = await service.findAll('inst-1', {
        page: 1,
        limit: 20,
        search: 'nonexistent-xyz',
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return an enrollment with student and class', async () => {
      prisma.enrollment.findFirst.mockResolvedValue(mockEnrollment);

      const result = await service.findOne('inst-1', 'enroll-1');

      expect(result).toEqual(mockEnrollment);
      expect(prisma.enrollment.findFirst).toHaveBeenCalledWith({
        where: { id: 'enroll-1', institution_id: 'inst-1' },
        include: {
          student: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
        },
      });
    });

    it('should throw NotFoundException if enrollment not found', async () => {
      prisma.enrollment.findFirst.mockResolvedValue(null);

      await expect(service.findOne('inst-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an enrollment after verifying existence', async () => {
      prisma.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      prisma.enrollment.update.mockResolvedValue({
        ...mockEnrollment,
        status: 'DROPPED',
      });

      const result = await service.update('inst-1', 'enroll-1', {
        status: 'DROPPED',
      });

      expect(result.status).toBe('DROPPED');
      expect(prisma.enrollment.update).toHaveBeenCalledWith({
        where: { id: 'enroll-1' },
        data: { status: 'DROPPED' },
        include: {
          student: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
        },
      });
    });

    it('should throw NotFoundException if enrollment not found', async () => {
      prisma.enrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.update('inst-1', 'nonexistent', { status: 'DROPPED' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete an enrollment after verifying existence', async () => {
      prisma.enrollment.findFirst.mockResolvedValue(mockEnrollment);
      prisma.enrollment.delete.mockResolvedValue(mockEnrollment);

      await service.delete('inst-1', 'enroll-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.enrollment.delete).toHaveBeenCalledWith({
        where: { id: 'enroll-1' },
      });
    });

    it('should throw NotFoundException if enrollment not found', async () => {
      prisma.enrollment.findFirst.mockResolvedValue(null);

      await expect(service.delete('inst-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('importFromCsv', () => {
    const INST = 'inst-1';

    // Helpers to build CSV buffers
    const toCsv = (rows: { student_id: string; class_id: string; status?: string }[]) => {
      const header = 'student_id,class_id,status';
      const lines = rows.map(
        (r) => `${r.student_id},${r.class_id},${r.status ?? 'ACTIVE'}`,
      );
      return Buffer.from([header, ...lines].join('\n'));
    };

    // Fixed UUIDs used across tests (must be lowercase for Zod uuid validation)
    const STUDENT_1 = 'a1a1a1a1-1111-4111-8111-a1a1a1a1a1a1';
    const STUDENT_2 = 'a2a2a2a2-2222-4222-8222-a2a2a2a2a2a2';
    const CLASS_1 = 'c1c1c1c1-1111-4111-8111-c1c1c1c1c1c1';
    const CLASS_2 = 'c2c2c2c2-2222-4222-8222-c2c2c2c2c2c2';

    const classNoSchedule = (id: string, name: string) => ({
      id,
      institution_id: INST,
      name,
      schedules: [],
    });

    /** Set up the 4 bulk pre-fetch mocks used by importFromCsv Phase 1b */
    const setupBulkMocks = ({
      students = [{ id: STUDENT_1 }, { id: STUDENT_2 }],
      classes = [classNoSchedule(CLASS_1, 'Class 1'), classNoSchedule(CLASS_2, 'Class 2')],
      existingEnrollments = [] as { student_id: string; class_id: string }[],
      activeEnrollments = [] as { student_id: string; class: { name: string; schedules: any[] } }[],
    } = {}) => {
      // findMany is called 4 times in parallel — use mockResolvedValueOnce in the
      // order the calls are made: student.findMany, class.findMany,
      // enrollment.findMany (dup check), enrollment.findMany (conflict check).
      prisma.student.findMany.mockResolvedValue(students);
      prisma.class.findMany.mockResolvedValue(classes);
      // Two enrollment.findMany calls (duplicate check, then conflict check)
      prisma.enrollment.findMany
        .mockResolvedValueOnce(existingEnrollments)
        .mockResolvedValueOnce(activeEnrollments);
    };

    /** Mock $transaction so it uses a fresh tx.enrollment.create mock */
    const setupTransaction = (createResults: any[]) => {
      let callIndex = 0;
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const txCreate = jest.fn().mockImplementation(() => {
          const result = createResults[callIndex];
          callIndex++;
          return Promise.resolve(result);
        });
        return fn({
          payment: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
          enrollment: {
            delete: prisma.enrollment.delete,
            create: txCreate,
          },
        });
      });
    };

    it('happy path: 2 valid rows → created:2, skipped:0, errors:[]', async () => {
      const csv = toCsv([
        { student_id: STUDENT_1, class_id: CLASS_1 },
        { student_id: STUDENT_2, class_id: CLASS_2 },
      ]);

      setupBulkMocks();
      setupTransaction([
        { id: 'enroll-new-1', student_id: STUDENT_1, class_id: CLASS_1 },
        { id: 'enroll-new-2', student_id: STUDENT_2, class_id: CLASS_2 },
      ]);

      const result = await service.importFromCsv(csv, INST);

      expect(result).toEqual({ created: 2, skipped: 0, errors: [] });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(invoiceGenerator.generateMidMonthEnrollmentPayment).toHaveBeenCalledTimes(2);
    });

    it('non-existent student: row with unknown student_id → error reported, not created', async () => {
      const UNKNOWN_STUDENT = 'f9f9f9f9-9999-4999-8999-f9f9f9f9f9f9';
      const csv = toCsv([{ student_id: UNKNOWN_STUDENT, class_id: CLASS_1 }]);

      setupBulkMocks({
        students: [], // student not found
        classes: [classNoSchedule(CLASS_1, 'Class 1')],
      });

      const result = await service.importFromCsv(csv, INST);

      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        row: 1,
        message: expect.stringContaining(UNKNOWN_STUDENT),
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('non-existent class: row with unknown class_id → error reported, not created', async () => {
      const UNKNOWN_CLASS = 'e9e9e9e9-9999-4999-8999-e9e9e9e9e9e9';
      const csv = toCsv([{ student_id: STUDENT_1, class_id: UNKNOWN_CLASS }]);

      setupBulkMocks({
        students: [{ id: STUDENT_1 }],
        classes: [], // class not found
      });

      const result = await service.importFromCsv(csv, INST);

      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        row: 1,
        message: expect.stringContaining(UNKNOWN_CLASS),
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('duplicate enrollment: student+class already enrolled → skipped, error reported', async () => {
      const csv = toCsv([{ student_id: STUDENT_1, class_id: CLASS_1 }]);

      setupBulkMocks({
        students: [{ id: STUDENT_1 }],
        classes: [classNoSchedule(CLASS_1, 'Class 1')],
        existingEnrollments: [{ student_id: STUDENT_1, class_id: CLASS_1 }],
      });

      const result = await service.importFromCsv(csv, INST);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        row: 1,
        message: expect.stringContaining('already enrolled'),
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('schedule conflict: student has conflicting schedule → skipped, error reported', async () => {
      // CLASS_1 has Mon 10:00-11:00; STUDENT_1 already enrolled in a class with Mon 10:30-11:30
      const conflictingClass = {
        id: CLASS_1,
        institution_id: INST,
        name: 'Conflict Class',
        schedules: [{ day: 'Monday', start_time: '10:00', end_time: '11:00' }],
      };
      const existingActiveEnrollment = {
        student_id: STUDENT_1,
        class: {
          name: 'Existing Class',
          schedules: [{ day: 'Monday', start_time: '10:30', end_time: '11:30' }],
        },
      };

      const csv = toCsv([{ student_id: STUDENT_1, class_id: CLASS_1 }]);

      setupBulkMocks({
        students: [{ id: STUDENT_1 }],
        classes: [conflictingClass],
        existingEnrollments: [],
        activeEnrollments: [existingActiveEnrollment as any],
      });

      const result = await service.importFromCsv(csv, INST);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        row: 1,
        message: expect.stringContaining('conflict'),
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('invalid schema: row missing required field → error reported', async () => {
      // CSV row with invalid UUID for student_id
      const invalidCsv = Buffer.from(
        'student_id,class_id,status\nnot-a-uuid,' + CLASS_1 + ',ACTIVE',
      );

      // Bulk mocks won't even be called because parsedRows will be empty
      // but set them up defensively
      setupBulkMocks({ students: [], classes: [], existingEnrollments: [], activeEnrollments: [] });

      const result = await service.importFromCsv(invalidCsv, INST);

      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(1);
    });

    it('over 500 rows: buffer with 501 rows → throws BadRequestException', async () => {
      const rows = Array.from({ length: 501 }, (_, i) => ({
        student_id: STUDENT_1,
        class_id: CLASS_1,
      }));
      const csv = toCsv(rows);

      const { BadRequestException } = await import('@nestjs/common');
      await expect(service.importFromCsv(csv, INST)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('intra-batch duplicate: same student+class appears twice in CSV → second row skipped', async () => {
      const csv = toCsv([
        { student_id: STUDENT_1, class_id: CLASS_1 },
        { student_id: STUDENT_1, class_id: CLASS_1 }, // duplicate
      ]);

      setupBulkMocks({
        students: [{ id: STUDENT_1 }],
        classes: [classNoSchedule(CLASS_1, 'Class 1')],
        existingEnrollments: [],
      });
      setupTransaction([
        { id: 'enroll-new-1', student_id: STUDENT_1, class_id: CLASS_1 },
      ]);

      const result = await service.importFromCsv(csv, INST);

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        row: 2,
        message: expect.stringContaining('already enrolled'),
      });
    });

    it('transaction wraps all creates: $transaction is called once for all valid rows', async () => {
      const csv = toCsv([
        { student_id: STUDENT_1, class_id: CLASS_1 },
        { student_id: STUDENT_2, class_id: CLASS_2 },
      ]);

      setupBulkMocks();
      setupTransaction([
        { id: 'enroll-new-1', student_id: STUDENT_1, class_id: CLASS_1 },
        { id: 'enroll-new-2', student_id: STUDENT_2, class_id: CLASS_2 },
      ]);

      await service.importFromCsv(csv, INST);

      // Only one $transaction call — all creates are batched inside it
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
