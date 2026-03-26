import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceGeneratorService } from './invoice-generator.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('InvoiceGeneratorService', () => {
  let service: InvoiceGeneratorService;

  const mockPrisma = {
    institution: {
      findUnique: jest.fn(),
    },
    session: {
      findFirst: jest.fn(),
    },
    enrollment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    class: {
      findFirst: jest.fn(),
    },
  };

  const institutionId = 'inst-uuid-1';
  const studentId = 'student-uuid-1';
  const sessionId = 'session-uuid-1';
  const classId = 'class-uuid-1';
  const enrollmentId = 'enrollment-uuid-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceGeneratorService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<InvoiceGeneratorService>(InvoiceGeneratorService);
    jest.clearAllMocks();
  });

  describe('generatePerSessionPayment', () => {
    const params = { institutionId, studentId, sessionId, classId };

    it('should return early when billing_mode is not PER_SESSION', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'MONTHLY_FIXED',
      });

      await service.generatePerSessionPayment(params);

      expect(mockPrisma.institution.findUnique).toHaveBeenCalledWith({
        where: { id: institutionId },
        select: { billing_mode: true },
      });
      expect(mockPrisma.session.findFirst).not.toHaveBeenCalled();
    });

    it('should return early when institution is null', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue(null);

      await service.generatePerSessionPayment(params);

      expect(mockPrisma.session.findFirst).not.toHaveBeenCalled();
    });

    it('should return early when session is not found', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'PER_SESSION',
      });
      mockPrisma.session.findFirst.mockResolvedValue(null);

      await service.generatePerSessionPayment(params);

      expect(mockPrisma.enrollment.findFirst).not.toHaveBeenCalled();
    });

    it('should return early when no active/trial enrollment found', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'PER_SESSION',
      });
      mockPrisma.session.findFirst.mockResolvedValue({
        date: new Date('2026-03-15'),
      });
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);

      await service.generatePerSessionPayment(params);

      expect(mockPrisma.class.findFirst).not.toHaveBeenCalled();
    });

    it('should return early when class is not found', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'PER_SESSION',
      });
      mockPrisma.session.findFirst.mockResolvedValue({
        date: new Date('2026-03-15'),
      });
      mockPrisma.enrollment.findFirst.mockResolvedValue({ id: enrollmentId });
      mockPrisma.class.findFirst.mockResolvedValue(null);

      await service.generatePerSessionPayment(params);

      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('should create a PENDING payment with billing_period for dedup', async () => {
      const sessionDate = new Date('2026-03-15');
      const fee = 150000;

      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'PER_SESSION',
      });
      mockPrisma.session.findFirst.mockResolvedValue({ date: sessionDate });
      mockPrisma.enrollment.findFirst.mockResolvedValue({ id: enrollmentId });
      mockPrisma.class.findFirst.mockResolvedValue({ fee });
      mockPrisma.payment.create.mockResolvedValue({ id: 'new-payment' });

      await service.generatePerSessionPayment(params);

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: {
          institution_id: institutionId,
          student_id: studentId,
          enrollment_id: enrollmentId,
          amount: fee,
          due_date: sessionDate,
          billing_period: `session-${sessionId}`,
          status: 'PENDING',
          notes: 'Auto: Session 2026-03-15',
        },
      });
    });

    it('should silently return on P2002 duplicate (constraint-based dedup)', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'PER_SESSION',
      });
      mockPrisma.session.findFirst.mockResolvedValue({
        date: new Date('2026-03-15'),
      });
      mockPrisma.enrollment.findFirst.mockResolvedValue({ id: enrollmentId });
      mockPrisma.class.findFirst.mockResolvedValue({ fee: 150000 });
      mockPrisma.payment.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.generatePerSessionPayment(params),
      ).resolves.toBeUndefined();
    });

    it('should swallow non-P2002 errors and resolve', async () => {
      mockPrisma.institution.findUnique.mockRejectedValue(
        new Error('DB connection lost'),
      );

      await expect(
        service.generatePerSessionPayment(params),
      ).resolves.toBeUndefined();
    });
  });

  describe('generateMonthlyPayments', () => {
    const params = { institutionId };

    beforeEach(() => {
      jest.useFakeTimers({ now: new Date('2026-03-15T00:00:00.000Z') });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return { created: 0 } when billing_mode is not MONTHLY_FIXED', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'PER_SESSION',
      });

      const result = await service.generateMonthlyPayments(params);

      expect(result).toEqual({ created: 0 });
      expect(mockPrisma.enrollment.findMany).not.toHaveBeenCalled();
    });

    it('should return { created: 0 } when institution is null', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue(null);

      const result = await service.generateMonthlyPayments(params);

      expect(result).toEqual({ created: 0 });
    });

    it('should create payments for all enrollments and return correct count', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'MONTHLY_FIXED',
      });
      mockPrisma.enrollment.findMany.mockResolvedValue([
        { id: 'enr-1', student_id: 'stu-1', class: { fee: 500000 } },
        { id: 'enr-2', student_id: 'stu-2', class: { fee: 300000 } },
      ]);
      mockPrisma.payment.create.mockResolvedValue({ id: 'pay-1' });

      const result = await service.generateMonthlyPayments(params);

      expect(result).toEqual({ created: 2 });
      expect(mockPrisma.payment.create).toHaveBeenCalledTimes(2);
      const expectedDueDate = new Date(2026, 2, 1); // March 1 in local time
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: {
          institution_id: institutionId,
          student_id: 'stu-1',
          enrollment_id: 'enr-1',
          amount: 500000,
          due_date: expectedDueDate,
          billing_period: '2026-03',
          status: 'PENDING',
          notes: 'Auto: Monthly 2026-03',
        },
      });
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: {
          institution_id: institutionId,
          student_id: 'stu-2',
          enrollment_id: 'enr-2',
          amount: 300000,
          due_date: expectedDueDate,
          billing_period: '2026-03',
          status: 'PENDING',
          notes: 'Auto: Monthly 2026-03',
        },
      });
    });

    it('should skip P2002 duplicate and continue creating remaining payments', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'MONTHLY_FIXED',
      });
      mockPrisma.enrollment.findMany.mockResolvedValue([
        { id: 'enr-1', student_id: 'stu-1', class: { fee: 500000 } },
        { id: 'enr-2', student_id: 'stu-2', class: { fee: 300000 } },
      ]);
      mockPrisma.payment.create
        .mockRejectedValueOnce({ code: 'P2002' })
        .mockResolvedValueOnce({ id: 'pay-2' });

      const result = await service.generateMonthlyPayments(params);

      expect(result).toEqual({ created: 1 });
    });

    it('should log non-P2002 errors and continue creating remaining payments', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'MONTHLY_FIXED',
      });
      mockPrisma.enrollment.findMany.mockResolvedValue([
        { id: 'enr-1', student_id: 'stu-1', class: { fee: 500000 } },
        { id: 'enr-2', student_id: 'stu-2', class: { fee: 300000 } },
      ]);
      mockPrisma.payment.create
        .mockRejectedValueOnce(new Error('Unexpected DB error'))
        .mockResolvedValueOnce({ id: 'pay-2' });

      const result = await service.generateMonthlyPayments(params);

      expect(result).toEqual({ created: 1 });
    });

    it('should return { created: 0 } when there are zero enrollments', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'MONTHLY_FIXED',
      });
      mockPrisma.enrollment.findMany.mockResolvedValue([]);

      const result = await service.generateMonthlyPayments(params);

      expect(result).toEqual({ created: 0 });
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });
  });

  describe('generateMidMonthEnrollmentPayment', () => {
    const enrolledAt = new Date('2026-03-20T10:00:00.000Z');
    const params = {
      institutionId,
      studentId,
      enrollmentId,
      classId,
      enrolledAt,
    };

    it('should return early when billing_mode is not MONTHLY_FIXED', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'PER_SESSION',
      });

      await service.generateMidMonthEnrollmentPayment(params);

      expect(mockPrisma.class.findFirst).not.toHaveBeenCalled();
    });

    it('should return early when class is not found', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'MONTHLY_FIXED',
      });
      mockPrisma.class.findFirst.mockResolvedValue(null);

      await service.generateMidMonthEnrollmentPayment(params);

      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('should create payment with correct billing_period and due_date = enrolledAt + 7 days', async () => {
      const fee = 400000;
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'MONTHLY_FIXED',
      });
      mockPrisma.class.findFirst.mockResolvedValue({ fee });
      mockPrisma.payment.create.mockResolvedValue({ id: 'mid-pay-1' });

      await service.generateMidMonthEnrollmentPayment(params);

      const expectedDueDate = new Date(enrolledAt);
      expectedDueDate.setDate(expectedDueDate.getDate() + 7);

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: {
          institution_id: institutionId,
          student_id: studentId,
          enrollment_id: enrollmentId,
          amount: fee,
          due_date: expectedDueDate,
          billing_period: '2026-03',
          status: 'PENDING',
          notes: 'Auto: Monthly 2026-03 (mid-month enrollment)',
        },
      });
    });

    it('should silently return on P2002 duplicate error', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'MONTHLY_FIXED',
      });
      mockPrisma.class.findFirst.mockResolvedValue({ fee: 400000 });
      mockPrisma.payment.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.generateMidMonthEnrollmentPayment(params),
      ).resolves.toBeUndefined();
    });

    it('should swallow non-P2002 errors without throwing', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'MONTHLY_FIXED',
      });
      mockPrisma.class.findFirst.mockResolvedValue({ fee: 400000 });
      mockPrisma.payment.create.mockRejectedValue(
        new Error('Unexpected error'),
      );

      await expect(
        service.generateMidMonthEnrollmentPayment(params),
      ).resolves.toBeUndefined();
    });
  });
});
