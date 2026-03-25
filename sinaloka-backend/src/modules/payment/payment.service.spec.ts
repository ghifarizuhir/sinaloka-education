import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';

describe('PaymentService', () => {
  let service: PaymentService;

  const mockPrisma = {
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    enrollment: {
      update: jest.fn(),
    },
    student: {
      findMany: jest.fn(),
    },
  };

  const mockSettingsService = {
    getBilling: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const institutionId = 'inst-uuid-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a payment', async () => {
      const dto = {
        student_id: 's1',
        enrollment_id: 'e1',
        amount: 100,
        due_date: new Date(),
        status: 'PENDING' as const,
      };
      mockPrisma.payment.create.mockResolvedValue({ id: 'p1', ...dto });

      const result = await service.create(institutionId, dto);

      expect(result.id).toBe('p1');
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: { ...dto, institution_id: institutionId },
      });
    });
  });

  describe('findAll', () => {
    it('should list payments with pagination', async () => {
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      const result = await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        sort_by: 'due_date',
        sort_order: 'desc',
      });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should filter by status', async () => {
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        status: 'PENDING',
        sort_by: 'due_date',
        sort_order: 'desc',
      });

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { institution_id: institutionId, status: 'PENDING' },
        }),
      );
    });

    it('should filter by student_id', async () => {
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        student_id: 's1',
        sort_by: 'due_date',
        sort_order: 'desc',
      });

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { institution_id: institutionId, student_id: 's1' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a payment by id', async () => {
      const payment = { id: 'p1', institution_id: institutionId };
      mockPrisma.payment.findFirst.mockResolvedValue(payment);

      const result = await service.findOne(institutionId, 'p1');

      expect(result.id).toBe('p1');
    });

    it('should throw NotFoundException for missing payment', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await expect(service.findOne(institutionId, 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a payment', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: 'p1',
        institution_id: institutionId,
      });
      mockPrisma.payment.update.mockResolvedValue({ id: 'p1', status: 'PAID' });

      const result = await service.update(institutionId, 'p1', {
        status: 'PAID',
      });

      expect(result.status).toBe('PAID');
    });

    it('should throw NotFoundException when updating nonexistent payment', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        service.update(institutionId, 'bad', { status: 'PAID' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a payment', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: 'p1',
        institution_id: institutionId,
      });
      mockPrisma.payment.delete.mockResolvedValue({ id: 'p1' });

      const result = await service.delete(institutionId, 'p1');

      expect(result.id).toBe('p1');
    });
  });
});
