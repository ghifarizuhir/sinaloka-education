import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

jest.mock('../../common/prisma/prisma.service', () => {
  return { PrismaService: jest.fn() };
});

import { ParentService } from './parent.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('ParentService', () => {
  let service: ParentService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      parent: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
      parentStudent: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      student: { findFirst: jest.fn(), count: jest.fn() },
      attendance: { findMany: jest.fn(), count: jest.fn() },
      session: { findMany: jest.fn(), count: jest.fn() },
      payment: { findMany: jest.fn(), count: jest.fn() },
      enrollment: { findMany: jest.fn(), count: jest.fn() },
      refreshToken: { deleteMany: jest.fn() },
      user: { delete: jest.fn() },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ParentService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ParentService>(ParentService);
  });

  describe('getChildren', () => {
    it('should return linked children with summary stats', async () => {
      prisma.parent.findFirst.mockResolvedValue({
        id: 'parent-1',
        children: [
          {
            student: {
              id: 's1',
              name: 'Child 1',
              grade: '5',
              status: 'ACTIVE',
              enrollments: [
                { class: { id: 'c1', name: 'Math', subject: 'Mathematics' } },
              ],
              attendances: [
                { status: 'PRESENT', homework_done: true },
                { status: 'ABSENT', homework_done: false },
              ],
              payments: [{ id: 'p1', status: 'PENDING' }],
            },
          },
        ],
      });
      prisma.session.findMany.mockResolvedValue([]);

      const result = await service.getChildren('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('s1');
      expect(result[0].attendance_rate).toBe(50);
      expect(result[0].pending_payments).toBe(1);
    });

    it('should throw if parent profile not found', async () => {
      prisma.parent.findFirst.mockResolvedValue(null);

      await expect(service.getChildren('bad-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getChildAttendance', () => {
    it('should return paginated attendance with summary', async () => {
      prisma.attendance.findMany
        .mockResolvedValueOnce([
          { id: 'a1', status: 'PRESENT', homework_done: true },
          { id: 'a2', status: 'ABSENT', homework_done: false },
        ])
        .mockResolvedValueOnce([
          { status: 'PRESENT', homework_done: true },
          { status: 'ABSENT', homework_done: false },
        ]);
      prisma.attendance.count.mockResolvedValue(2);

      const result = await service.getChildAttendance('inst-1', 's1', {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(2);
      expect(result.summary.present).toBe(1);
      expect(result.summary.absent).toBe(1);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('getChildSessions', () => {
    it('should return empty data when student has no enrollments', async () => {
      prisma.enrollment.findMany.mockResolvedValue([]);

      const result = await service.getChildSessions('inst-1', 's1', {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('deleteParent', () => {
    it('should delete parent, refresh tokens, and user in transaction', async () => {
      prisma.parent.findFirst.mockResolvedValue({
        id: 'parent-1',
        user_id: 'user-1',
      });
      prisma.parent.delete.mockResolvedValue({});
      prisma.refreshToken.deleteMany.mockResolvedValue({});
      prisma.user.delete.mockResolvedValue({});

      await service.deleteParent('inst-1', 'parent-1');

      expect(prisma.parent.delete).toHaveBeenCalledWith({
        where: { id: 'parent-1' },
      });
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
      });
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should throw if parent not found', async () => {
      prisma.parent.findFirst.mockResolvedValue(null);

      await expect(service.deleteParent('inst-1', 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('should return parent with children', async () => {
      prisma.parent.findFirst.mockResolvedValue({
        id: 'parent-1',
        user: {
          id: 'u1',
          name: 'Parent',
          email: 'p@test.com',
          is_active: true,
        },
        children: [],
      });

      const result = await service.findOne('inst-1', 'parent-1');
      expect(result.id).toBe('parent-1');
    });

    it('should throw if parent not found', async () => {
      prisma.parent.findFirst.mockResolvedValue(null);

      await expect(service.findOne('inst-1', 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
