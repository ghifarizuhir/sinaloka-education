import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('../../common/prisma/prisma.service', () => {
  return {
    PrismaService: jest.fn(),
  };
});

import { ClassService } from './class.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('ClassService', () => {
  let service: ClassService;
  let prisma: {
    class: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    institution: {
      findUnique: jest.Mock;
    };
    tutor: {
      findFirst: jest.Mock;
    };
    subject: {
      findFirst: jest.Mock;
    };
    tutorSubject: {
      findUnique: jest.Mock;
    };
    classSchedule: {
      createMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const mockClass = {
    id: 'class-1',
    institution_id: 'inst-1',
    tutor_id: 'tutor-1',
    name: 'Math 101',
    subject_id: 'subject-1',
    subject: { id: 'subject-1', name: 'Mathematics', institution_id: 'inst-1' },
    capacity: 30,
    fee: '500000',
    tutor_fee: '200000',
    tutor_fee_mode: 'FIXED_PER_SESSION',
    tutor_fee_per_student: null,
    schedules: [
      {
        id: 'sched-1',
        day: 'Monday',
        start_time: '14:00',
        end_time: '15:30',
        class_id: 'class-1',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'sched-2',
        day: 'Wednesday',
        start_time: '14:00',
        end_time: '15:30',
        class_id: 'class-1',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    room: 'Room A',
    status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
    tutor: {
      id: 'tutor-1',
      user: { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
    },
  };

  const mockClassWithCount = {
    ...mockClass,
    _count: { enrollments: 5 },
  };

  const mockClassWithRelations = {
    ...mockClass,
    enrollments: [
      {
        id: 'enr-1',
        status: 'ACTIVE',
        created_at: new Date(),
        student: {
          id: 'student-1',
          name: 'Alice',
          grade: '10',
          status: 'ACTIVE',
        },
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      class: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      institution: {
        findUnique: jest.fn(),
      },
      tutor: {
        findFirst: jest.fn(),
      },
      subject: {
        findFirst: jest.fn(),
      },
      tutorSubject: {
        findUnique: jest.fn(),
      },
      classSchedule: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((fn: (tx: any) => Promise<any>) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ClassService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ClassService>(ClassService);
  });

  describe('create', () => {
    it('should create a class with institution scoping and numeric fee', async () => {
      prisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'PER_SESSION',
      });
      prisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-1',
        institution_id: 'inst-1',
        is_verified: true,
      });
      prisma.subject.findFirst.mockResolvedValue({
        id: 'subject-1',
        name: 'Mathematics',
        institution_id: 'inst-1',
      });
      prisma.tutorSubject.findUnique.mockResolvedValue({
        tutor_id: 'tutor-1',
        subject_id: 'subject-1',
      });
      prisma.class.create.mockResolvedValue(mockClass);
      prisma.classSchedule.createMany.mockResolvedValue({ count: 2 });
      prisma.class.findUnique.mockResolvedValue(mockClass);

      const result = await service.create('inst-1', {
        tutor_id: 'tutor-1',
        name: 'Math 101',
        subject_id: 'subject-1',
        capacity: 30,
        fee: 500000,
        tutor_fee: 200000,
        schedules: [
          { day: 'Monday', start_time: '14:00', end_time: '15:30' },
          { day: 'Wednesday', start_time: '14:00', end_time: '15:30' },
        ],
        room: 'Room A',
        status: 'ACTIVE',
      });

      expect(result.fee).toBe(500000);
      expect(result.tutor_fee).toBe(200000);
      expect(prisma.class.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            institution_id: 'inst-1',
          }),
        }),
      );
    });

    it('should pass tutor_fee to prisma create', async () => {
      prisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'PER_SESSION',
      });
      prisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-1',
        institution_id: 'inst-1',
        is_verified: true,
      });
      prisma.subject.findFirst.mockResolvedValue({
        id: 'subject-1',
        name: 'Mathematics',
        institution_id: 'inst-1',
      });
      prisma.tutorSubject.findUnique.mockResolvedValue({
        tutor_id: 'tutor-1',
        subject_id: 'subject-1',
      });
      prisma.class.create.mockResolvedValue(mockClass);
      prisma.classSchedule.createMany.mockResolvedValue({ count: 2 });
      prisma.class.findUnique.mockResolvedValue(mockClass);

      await service.create('inst-1', {
        tutor_id: 'tutor-1',
        name: 'Math 101',
        subject_id: 'subject-1',
        capacity: 30,
        fee: 500000,
        tutor_fee: 200000,
        schedules: [
          { day: 'Monday', start_time: '14:00', end_time: '15:30' },
          { day: 'Wednesday', start_time: '14:00', end_time: '15:30' },
        ],
      });

      expect(prisma.class.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tutor_fee: 200000,
          }),
        }),
      );
    });

    it('should throw NotFoundException when tutor not found', async () => {
      prisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'PER_SESSION',
      });
      prisma.tutor.findFirst.mockResolvedValue(null);

      await expect(
        service.create('inst-1', {
          tutor_id: 'nonexistent',
          name: 'Math 101',
          subject_id: 'subject-1',
          capacity: 30,
          fee: 500000,
          tutor_fee: 200000,
          schedules: [
            { day: 'Monday', start_time: '14:00', end_time: '15:30' },
          ],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when tutor is not verified', async () => {
      prisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'PER_SESSION',
      });
      prisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-1',
        institution_id: 'inst-1',
        is_verified: false,
      });

      await expect(
        service.create('inst-1', {
          tutor_id: 'tutor-1',
          name: 'Math 101',
          subject_id: 'subject-1',
          capacity: 30,
          fee: 500000,
          tutor_fee: 200000,
          schedules: [
            { day: 'Monday', start_time: '14:00', end_time: '15:30' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated classes with tutor, numeric fee, and enrolled_count', async () => {
      prisma.class.findMany.mockResolvedValue([mockClassWithCount]);
      prisma.class.count.mockResolvedValue(1);

      const result = await service.findAll('inst-1', {
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].fee).toBe(500000);
      expect(result.data[0].tutor_fee).toBe(200000);
      expect(result.data[0].tutor).toEqual({ id: 'tutor-1', name: 'John Doe' });
      expect(result.data[0].enrolled_count).toBe(5);
      expect(result.meta.total).toBe(1);
      expect(prisma.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institution_id: 'inst-1' }),
          include: expect.objectContaining({
            tutor: { include: { user: { select: { id: true, name: true } } } },
            _count: {
              select: {
                enrollments: { where: { status: { in: ['ACTIVE', 'TRIAL'] } } },
              },
            },
          }),
        }),
      );
    });

    it('should filter by subject_id', async () => {
      prisma.class.findMany.mockResolvedValue([mockClassWithCount]);
      prisma.class.count.mockResolvedValue(1);

      await service.findAll('inst-1', {
        page: 1,
        limit: 20,
        subject_id: 'subject-1',
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(prisma.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ subject_id: 'subject-1' }),
        }),
      );
    });

    it('should filter by status', async () => {
      prisma.class.findMany.mockResolvedValue([]);
      prisma.class.count.mockResolvedValue(0);

      await service.findAll('inst-1', {
        page: 1,
        limit: 20,
        status: 'ARCHIVED',
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(prisma.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ARCHIVED' }),
        }),
      );
    });

    it('should search by name', async () => {
      prisma.class.findMany.mockResolvedValue([mockClassWithCount]);
      prisma.class.count.mockResolvedValue(1);

      await service.findAll('inst-1', {
        page: 1,
        limit: 20,
        search: 'math',
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(prisma.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ name: { contains: 'math', mode: 'insensitive' } }],
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a class with tutor, enrollments and numeric fee', async () => {
      prisma.class.findFirst.mockResolvedValue(mockClassWithRelations);
      const result = await service.findOne('inst-1', 'class-1');
      expect(result.fee).toBe(500000);
      expect(result.tutor_fee).toBe(200000);
      expect(result.tutor).toEqual({
        id: 'tutor-1',
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(result.enrolled_count).toBe(1);
      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0].student.name).toBe('Alice');
      expect(prisma.class.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'class-1', institution_id: 'inst-1' },
          include: expect.objectContaining({
            tutor: expect.any(Object),
            enrollments: expect.any(Object),
          }),
        }),
      );
    });
    it('should throw NotFoundException if class not found', async () => {
      prisma.class.findFirst.mockResolvedValue(null);
      await expect(service.findOne('inst-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a class and return numeric fee', async () => {
      prisma.class.findFirst.mockResolvedValue(mockClass);
      prisma.class.update.mockResolvedValue({
        ...mockClass,
        name: 'Updated Math',
      });
      const result = await service.update('inst-1', 'class-1', {
        name: 'Updated Math',
      });
      expect(result.name).toBe('Updated Math');
      expect(result.fee).toBe(500000);
      expect(result.tutor_fee).toBe(200000);
    });
    it('should throw NotFoundException if class not found', async () => {
      prisma.class.findFirst.mockResolvedValue(null);
      await expect(
        service.update('inst-1', 'nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when new tutor is not verified', async () => {
      prisma.class.findFirst.mockResolvedValue(mockClass);
      prisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-2',
        institution_id: 'inst-1',
        is_verified: false,
      });

      await expect(
        service.update('inst-1', 'class-1', { tutor_id: 'tutor-2' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow update when tutor_id is not provided', async () => {
      prisma.class.findFirst.mockResolvedValue(mockClass);
      prisma.class.update.mockResolvedValue({ ...mockClass, name: 'New Name' });

      const result = await service.update('inst-1', 'class-1', {
        name: 'New Name',
      });
      expect(result.name).toBe('New Name');
      // tutor.findFirst should not be called for tutor validation,
      // but $transaction is always called for update
    });
  });

  describe('delete', () => {
    it('should delete a class after verifying existence', async () => {
      prisma.class.findFirst.mockResolvedValue(mockClass);
      prisma.class.delete.mockResolvedValue(mockClass);

      await service.delete('inst-1', 'class-1');

      expect(prisma.class.delete).toHaveBeenCalledWith({
        where: { id: 'class-1' },
      });
    });

    it('should throw NotFoundException if class not found', async () => {
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(service.delete('inst-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
