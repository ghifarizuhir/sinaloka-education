import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

jest.mock('../../common/prisma/prisma.service', () => {
  return {
    PrismaService: jest.fn(),
  };
});

import { StudentService } from './student.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('StudentService', () => {
  let service: StudentService;
  let prisma: {
    student: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const mockStudent = {
    id: 'student-1',
    institution_id: 'inst-1',
    name: 'John Doe',
    email: 'john@test.com',
    phone: null,
    grade: '10',
    status: 'ACTIVE',
    parent_name: 'Jane Doe',
    parent_phone: '1234567890',
    parent_email: 'jane@test.com',
    enrolled_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      student: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StudentService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<StudentService>(StudentService);
  });

  describe('create', () => {
    it('should create a student with institution scoping', async () => {
      prisma.student.create.mockResolvedValue(mockStudent);

      const result = await service.create('inst-1', {
        name: 'John Doe',
        grade: '10',
        parent_name: 'Jane Doe',
        parent_phone: '1234567890',
        parent_email: 'jane@test.com',
      });

      expect(result).toEqual(mockStudent);
      expect(prisma.student.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            institution_id: 'inst-1',
            name: 'John Doe',
            grade: '10',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated students', async () => {
      prisma.student.findMany.mockResolvedValue([mockStudent]);
      prisma.student.count.mockResolvedValue(1);

      const result = await service.findAll('inst-1', {
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institution_id: 'inst-1' }),
        }),
      );
    });

    it('should filter by grade', async () => {
      prisma.student.findMany.mockResolvedValue([mockStudent]);
      prisma.student.count.mockResolvedValue(1);

      await service.findAll('inst-1', {
        page: 1,
        limit: 20,
        grade: '10',
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ grade: '10' }),
        }),
      );
    });

    it('should filter by status', async () => {
      prisma.student.findMany.mockResolvedValue([]);
      prisma.student.count.mockResolvedValue(0);

      await service.findAll('inst-1', {
        page: 1,
        limit: 20,
        status: 'INACTIVE',
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'INACTIVE' }),
        }),
      );
    });

    it('should search by name or email', async () => {
      prisma.student.findMany.mockResolvedValue([mockStudent]);
      prisma.student.count.mockResolvedValue(1);

      await service.findAll('inst-1', {
        page: 1,
        limit: 20,
        search: 'john',
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a student by id scoped to institution', async () => {
      prisma.student.findFirst.mockResolvedValue(mockStudent);

      const result = await service.findOne('inst-1', 'student-1');

      expect(result).toEqual(mockStudent);
      expect(prisma.student.findFirst).toHaveBeenCalledWith({
        where: { id: 'student-1', institution_id: 'inst-1' },
      });
    });

    it('should throw NotFoundException if student not found', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(service.findOne('inst-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a student after verifying existence', async () => {
      prisma.student.findFirst.mockResolvedValue(mockStudent);
      prisma.student.update.mockResolvedValue({
        ...mockStudent,
        name: 'Updated Name',
      });

      const result = await service.update('inst-1', 'student-1', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: 'student-1' },
        data: { name: 'Updated Name' },
      });
    });

    it('should throw NotFoundException if student not found', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(
        service.update('inst-1', 'nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a student after verifying existence', async () => {
      prisma.student.findFirst.mockResolvedValue(mockStudent);
      prisma.student.delete.mockResolvedValue(mockStudent);

      await service.delete('inst-1', 'student-1');

      expect(prisma.student.delete).toHaveBeenCalledWith({
        where: { id: 'student-1' },
      });
    });

    it('should throw NotFoundException if student not found', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(service.delete('inst-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
