import { Test, TestingModule } from '@nestjs/testing';
import { PayoutService } from './payout.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { NotFoundException } from '@nestjs/common';

describe('PayoutService', () => {
  let service: PayoutService;

  const mockPrisma = {
    payout: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const institutionId = 'inst-uuid-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PayoutService>(PayoutService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a payout', async () => {
      const dto = { tutor_id: 't1', amount: 500, date: new Date() } as any;
      mockPrisma.payout.create.mockResolvedValue({ id: 'po1', ...dto });

      const result = await service.create(institutionId, dto);

      expect(result.id).toBe('po1');
      expect(mockPrisma.payout.create).toHaveBeenCalledWith({
        data: { ...dto, institution_id: institutionId },
      });
    });
  });

  describe('findAll', () => {
    it('should list payouts with pagination', async () => {
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.payout.count.mockResolvedValue(0);

      const result = await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        sort_by: 'date',
        sort_order: 'desc',
      });

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });

    it('should filter by tutor_id', async () => {
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.payout.count.mockResolvedValue(0);

      await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        tutor_id: 't1',
        sort_by: 'date',
        sort_order: 'desc',
      });

      expect(mockPrisma.payout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { institution_id: institutionId, tutor_id: 't1' },
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.payout.count.mockResolvedValue(0);

      await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        status: 'PENDING',
        sort_by: 'date',
        sort_order: 'desc',
      });

      expect(mockPrisma.payout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { institution_id: institutionId, status: 'PENDING' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a payout by id', async () => {
      const payout = { id: 'po1', institution_id: institutionId };
      mockPrisma.payout.findFirst.mockResolvedValue(payout);

      const result = await service.findOne(institutionId, 'po1');

      expect(result.id).toBe('po1');
    });

    it('should throw NotFoundException for missing payout', async () => {
      mockPrisma.payout.findFirst.mockResolvedValue(null);

      await expect(service.findOne(institutionId, 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a payout', async () => {
      mockPrisma.payout.findFirst.mockResolvedValue({
        id: 'po1',
        institution_id: institutionId,
      });
      mockPrisma.payout.update.mockResolvedValue({ id: 'po1', status: 'PAID' });

      const result = await service.update(institutionId, 'po1', {
        status: 'PAID',
      });

      expect(result.status).toBe('PAID');
    });
  });

  describe('delete', () => {
    it('should delete a payout', async () => {
      mockPrisma.payout.findFirst.mockResolvedValue({
        id: 'po1',
        institution_id: institutionId,
      });
      mockPrisma.payout.delete.mockResolvedValue({ id: 'po1' });

      const result = await service.delete(institutionId, 'po1');

      expect(result.id).toBe('po1');
    });
  });

  describe('findByTutor', () => {
    it('should find payouts by tutor', async () => {
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.payout.count.mockResolvedValue(0);

      const result = await service.findByTutor(institutionId, 't1', {
        page: 1,
        limit: 20,
        sort_by: 'date',
        sort_order: 'desc',
      });

      expect(result.data).toEqual([]);
      expect(mockPrisma.payout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { institution_id: institutionId, tutor_id: 't1' },
        }),
      );
    });
  });
});
