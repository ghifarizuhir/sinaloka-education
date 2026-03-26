import { Test, TestingModule } from '@nestjs/testing';
import { MonthlyPaymentCron } from './monthly-payment.cron.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { InvoiceGeneratorService } from './invoice-generator.service.js';

describe('MonthlyPaymentCron', () => {
  let cron: MonthlyPaymentCron;

  const mockPrisma = {
    institution: {
      findMany: jest.fn(),
    },
  };

  const mockInvoiceGenerator = {
    generateMonthlyPayments: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonthlyPaymentCron,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InvoiceGeneratorService, useValue: mockInvoiceGenerator },
      ],
    }).compile();

    cron = module.get<MonthlyPaymentCron>(MonthlyPaymentCron);
    jest.clearAllMocks();
  });

  describe('generateMonthlyPayments', () => {
    it('should not call invoiceGenerator when there are no institutions', async () => {
      mockPrisma.institution.findMany.mockResolvedValue([]);

      await cron.generateMonthlyPayments();

      expect(
        mockInvoiceGenerator.generateMonthlyPayments,
      ).not.toHaveBeenCalled();
    });

    it('should call invoiceGenerator for each institution and sum totalCreated', async () => {
      const institutions = [
        { id: 'inst-1', name: 'Institution One' },
        { id: 'inst-2', name: 'Institution Two' },
      ];
      mockPrisma.institution.findMany.mockResolvedValue(institutions);
      mockInvoiceGenerator.generateMonthlyPayments
        .mockResolvedValueOnce({ created: 3 })
        .mockResolvedValueOnce({ created: 5 });

      await cron.generateMonthlyPayments();

      expect(
        mockInvoiceGenerator.generateMonthlyPayments,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockInvoiceGenerator.generateMonthlyPayments,
      ).toHaveBeenNthCalledWith(1, {
        institutionId: 'inst-1',
      });
      expect(
        mockInvoiceGenerator.generateMonthlyPayments,
      ).toHaveBeenNthCalledWith(2, {
        institutionId: 'inst-2',
      });
    });

    it('should continue processing remaining institutions when one throws an error', async () => {
      const institutions = [
        { id: 'inst-1', name: 'Failing Institution' },
        { id: 'inst-2', name: 'Succeeding Institution' },
      ];
      mockPrisma.institution.findMany.mockResolvedValue(institutions);
      mockInvoiceGenerator.generateMonthlyPayments
        .mockRejectedValueOnce(new Error('DB connection failed'))
        .mockResolvedValueOnce({ created: 4 });

      await expect(cron.generateMonthlyPayments()).resolves.not.toThrow();

      expect(
        mockInvoiceGenerator.generateMonthlyPayments,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockInvoiceGenerator.generateMonthlyPayments,
      ).toHaveBeenNthCalledWith(2, {
        institutionId: 'inst-2',
      });
    });

    it('should query only active institutions with MONTHLY_FIXED billing mode', async () => {
      mockPrisma.institution.findMany.mockResolvedValue([]);

      await cron.generateMonthlyPayments();

      expect(mockPrisma.institution.findMany).toHaveBeenCalledWith({
        where: { billing_mode: 'MONTHLY_FIXED', is_active: true },
        select: { id: true, name: true },
      });
    });
  });
});
