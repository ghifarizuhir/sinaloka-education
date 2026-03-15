import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

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
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    enrollment: {
      count: jest.Mock;
    };
  };

  const mockClass = {
    id: 'class-1',
    institution_id: 'inst-1',
    tutor_id: 'tutor-1',
    name: 'Math 101',
    subject: 'Mathematics',
    capacity: 30,
    fee: 500000,
    schedule_days: ['Monday', 'Wednesday'],
    schedule_start_time: '14:00',
    schedule_end_time: '15:30',
    room: 'Room A',
    status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      class: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      enrollment: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ClassService>(ClassService);
  });

  describe('create', () => {
    it('should create a class with institution scoping', async () => {
      prisma.class.create.mockResolvedValue(mockClass);

      const result = await service.create('inst-1', {
        tutor_id: 'tutor-1',
        name: 'Math 101',
        subject: 'Mathematics',
        capacity: 30,
        fee: 500000,
        schedule_days: ['Monday', 'Wednesday'],
        schedule_start_time: '14:00',
        schedule_end_time: '15:30',
        room: 'Room A',
        status: 'ACTIVE',
      });

      expect(result).toEqual(mockClass);
      expect(prisma.class.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            institution_id: 'inst-1',
            tutor_id: 'tutor-1',
            name: 'Math 101',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated classes', async () => {
      prisma.class.findMany.mockResolvedValue([mockClass]);
      prisma.class.count.mockResolvedValue(1);

      const result = await service.findAll('inst-1', {
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(prisma.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institution_id: 'inst-1' }),
        }),
      );
    });

    it('should filter by subject', async () => {
      prisma.class.findMany.mockResolvedValue([mockClass]);
      prisma.class.count.mockResolvedValue(1);

      await service.findAll('inst-1', {
        page: 1,
        limit: 20,
        subject: 'Mathematics',
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(prisma.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ subject: 'Mathematics' }),
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
      prisma.class.findMany.mockResolvedValue([mockClass]);
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
            OR: [
              { name: { contains: 'math', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a class with enrolled_count', async () => {
      prisma.class.findFirst.mockResolvedValue(mockClass);
      prisma.enrollment.count.mockResolvedValue(5);

      const result = await service.findOne('inst-1', 'class-1');

      expect(result).toEqual({ ...mockClass, enrolled_count: 5 });
      expect(prisma.class.findFirst).toHaveBeenCalledWith({
        where: { id: 'class-1', institution_id: 'inst-1' },
      });
      expect(prisma.enrollment.count).toHaveBeenCalledWith({
        where: {
          class_id: 'class-1',
          status: { in: ['ACTIVE', 'TRIAL'] },
        },
      });
    });

    it('should throw NotFoundException if class not found', async () => {
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(service.findOne('inst-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a class after verifying existence', async () => {
      prisma.class.findFirst.mockResolvedValue(mockClass);
      prisma.class.update.mockResolvedValue({
        ...mockClass,
        name: 'Updated Math',
      });

      const result = await service.update('inst-1', 'class-1', {
        name: 'Updated Math',
      });

      expect(result.name).toBe('Updated Math');
      expect(prisma.class.update).toHaveBeenCalledWith({
        where: { id: 'class-1' },
        data: { name: 'Updated Math' },
      });
    });

    it('should throw NotFoundException if class not found', async () => {
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(
        service.update('inst-1', 'nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
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
