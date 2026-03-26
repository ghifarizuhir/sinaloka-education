import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseService } from './expense.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { NotFoundException } from '@nestjs/common';

describe('ExpenseService', () => {
  let service: ExpenseService;

  const mockPrisma = {
    expense: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  const institutionId = 'inst-uuid-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ExpenseService>(ExpenseService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an expense', async () => {
      const dto = { category: 'RENT' as const, amount: 1000, date: new Date() };
      mockPrisma.expense.create.mockResolvedValue({ id: 'e1', ...dto });

      const result = await service.create(institutionId, dto);

      expect(result.id).toBe('e1');
      expect(mockPrisma.expense.create).toHaveBeenCalledWith({
        data: { ...dto, institution_id: institutionId },
      });
    });
  });

  describe('findAll', () => {
    it('should list expenses with pagination', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([]);
      mockPrisma.expense.count.mockResolvedValue(0);
      mockPrisma.expense.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        sort_by: 'date',
        sort_order: 'desc',
      });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.total_amount).toBe(0);
    });

    it('should filter by category', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([]);
      mockPrisma.expense.count.mockResolvedValue(0);
      mockPrisma.expense.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        category: 'RENT',
        sort_by: 'date',
        sort_order: 'desc',
      });

      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { institution_id: institutionId, category: 'RENT' },
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([]);
      mockPrisma.expense.count.mockResolvedValue(0);
      mockPrisma.expense.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const date_from = new Date('2026-01-01');
      const date_to = new Date('2026-12-31');

      await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        date_from,
        date_to,
        sort_by: 'date',
        sort_order: 'desc',
      });

      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            institution_id: institutionId,
            date: { gte: date_from, lte: date_to },
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return an expense by id', async () => {
      const expense = { id: 'e1', institution_id: institutionId };
      mockPrisma.expense.findFirst.mockResolvedValue(expense);

      const result = await service.findOne(institutionId, 'e1');

      expect(result.id).toBe('e1');
    });

    it('should throw NotFoundException for missing expense', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue(null);

      await expect(service.findOne(institutionId, 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an expense', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue({
        id: 'e1',
        institution_id: institutionId,
      });
      mockPrisma.expense.update.mockResolvedValue({
        id: 'e1',
        amount: 2000,
      });

      const result = await service.update(institutionId, 'e1', {
        amount: 2000,
      });

      expect(result.amount).toBe(2000);
    });
  });

  describe('delete', () => {
    it('should delete an expense', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue({
        id: 'e1',
        institution_id: institutionId,
      });
      mockPrisma.expense.delete.mockResolvedValue({ id: 'e1' });

      const result = await service.delete(institutionId, 'e1');

      expect(result.id).toBe('e1');
    });
  });
});
