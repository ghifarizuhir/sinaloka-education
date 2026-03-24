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
    student: {
      findFirst: jest.Mock;
    };
    class: {
      findFirst: jest.Mock;
    };
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
      student: {
        findFirst: jest.fn(),
      },
      class: {
        findFirst: jest.fn(),
      },
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
});
