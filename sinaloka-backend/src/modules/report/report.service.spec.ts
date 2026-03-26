import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('ReportService', () => {
  let service: ReportService;

  const mockPrisma = {
    attendance: {
      findMany: jest.fn().mockResolvedValue([
        {
          status: 'PRESENT',
          homework_done: true,
          notes: 'Good',
          student: { name: 'Ali' },
          session: {
            date: new Date('2026-03-01'),
            topic_covered: 'Algebra',
            session_summary: null,
            class: { name: 'Math A' },
          },
        },
      ]),
    },
    payment: {
      aggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { amount: 5000 }, _count: 3 }),
    },
    payout: {
      aggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { amount: 2000 }, _count: 1 }),
    },
    expense: {
      aggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { amount: 500 }, _count: 2 }),
    },
    student: {
      findFirstOrThrow: jest.fn().mockResolvedValue({ id: 's1', name: 'Ali' }),
    },
    institution: {
      findUnique: jest.fn().mockResolvedValue({ default_language: 'id' }),
    },
  };

  const instId = 'inst-uuid';
  const range = {
    date_from: new Date('2026-01-01'),
    date_to: new Date('2026-03-31'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
  });

  it('generateAttendanceReport returns a valid PDF buffer', async () => {
    const buf = await service.generateAttendanceReport(instId, range);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('generateFinanceReport returns a valid PDF buffer', async () => {
    const buf = await service.generateFinanceReport(instId, range);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('generateStudentProgressReport returns a valid PDF buffer', async () => {
    const buf = await service.generateStudentProgressReport(instId, 's1');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('generateAttendanceReport handles empty records', async () => {
    mockPrisma.attendance.findMany.mockResolvedValueOnce([]);
    const buf = await service.generateAttendanceReport(instId, range);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('generateFinanceReport handles null sums', async () => {
    mockPrisma.payment.aggregate.mockResolvedValueOnce({
      _sum: { amount: null },
      _count: 0,
    });
    mockPrisma.payout.aggregate.mockResolvedValueOnce({
      _sum: { amount: null },
      _count: 0,
    });
    mockPrisma.expense.aggregate.mockResolvedValueOnce({
      _sum: { amount: null },
      _count: 0,
    });
    const buf = await service.generateFinanceReport(instId, range);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
