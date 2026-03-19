import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockPrisma = {
    student: { count: jest.fn().mockResolvedValue(10) },
    tutor: { count: jest.fn().mockResolvedValue(3) },
    payment: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 5000 } }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    attendance: {
      groupBy: jest.fn().mockResolvedValue([
        { status: 'PRESENT', _count: { status: 80 } },
        { status: 'ABSENT', _count: { status: 10 } },
        { status: 'LATE', _count: { status: 10 } },
      ]),
      findMany: jest.fn().mockResolvedValue([]),
    },
    session: {
      count: jest.fn().mockResolvedValue(5),
      findMany: jest.fn().mockResolvedValue([]),
    },
    enrollment: { findMany: jest.fn().mockResolvedValue([]) },
  };

  const instId = 'inst-uuid';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    jest.clearAllMocks();

    // Re-set default mocks after clearAllMocks
    mockPrisma.student.count.mockResolvedValue(10);
    mockPrisma.tutor.count.mockResolvedValue(3);
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });
    mockPrisma.payment.findMany.mockResolvedValue([]);
    mockPrisma.attendance.groupBy.mockResolvedValue([
      { status: 'PRESENT', _count: { status: 80 } },
      { status: 'ABSENT', _count: { status: 10 } },
      { status: 'LATE', _count: { status: 10 } },
    ]);
    mockPrisma.attendance.findMany.mockResolvedValue([]);
    mockPrisma.session.count.mockResolvedValue(5);
    mockPrisma.session.findMany.mockResolvedValue([]);
    mockPrisma.enrollment.findMany.mockResolvedValue([]);
  });

  describe('getStats', () => {
    it('should return aggregated stats', async () => {
      const stats = await service.getStats(instId);
      expect(stats.total_students).toBe(10);
      expect(stats.active_tutors).toBe(3);
      expect(stats.monthly_revenue).toBe(5000);
      expect(stats.attendance_rate).toBe(90);
      expect(stats.upcoming_sessions).toBe(5);
    });

    it('should return 0 attendance rate when no records', async () => {
      mockPrisma.attendance.groupBy.mockResolvedValue([]);
      const stats = await service.getStats(instId);
      expect(stats.attendance_rate).toBe(0);
    });

    it('should return 0 revenue when no payments', async () => {
      mockPrisma.payment.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      const stats = await service.getStats(instId);
      expect(stats.monthly_revenue).toBe(0);
    });

    it('should scope queries to institution_id', async () => {
      await service.getStats(instId);
      expect(mockPrisma.student.count).toHaveBeenCalledWith({
        where: { institution_id: instId },
      });
      expect(mockPrisma.tutor.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ institution_id: instId }),
      });
    });
  });

  describe('getUpcomingSessions', () => {
    it('should return upcoming sessions with class, subject, and tutor details', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          date: new Date('2026-03-20'),
          start_time: '10:00',
          class: {
            name: 'Math Advanced',
            subject: { name: 'Mathematics' },
            tutor: { user: { name: 'Pak Budi' } },
          },
        },
        {
          id: 'session-2',
          date: new Date('2026-03-20'),
          start_time: '13:00',
          class: {
            name: 'English Basic',
            subject: { name: 'English' },
            tutor: { user: { name: 'Bu Ani' } },
          },
        },
      ];
      mockPrisma.session.findMany.mockResolvedValue(mockSessions);

      const result = await service.getUpcomingSessions(instId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'session-1',
        date: expect.any(Date),
        start_time: '10:00',
        subject_name: 'Mathematics',
        tutor_name: 'Pak Budi',
        class_name: 'Math Advanced',
      });
    });

    it('should scope query to institution_id', async () => {
      mockPrisma.session.findMany.mockResolvedValue([]);
      await service.getUpcomingSessions(instId);

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: instId,
          }),
        }),
      );
    });

    it('should return empty array when no upcoming sessions', async () => {
      mockPrisma.session.findMany.mockResolvedValue([]);
      const result = await service.getUpcomingSessions(instId);
      expect(result).toEqual([]);
    });
  });

  describe('getActivity', () => {
    it('should return max 20 items sorted by created_at desc', async () => {
      const activity = await service.getActivity(instId);
      expect(Array.isArray(activity)).toBe(true);
      expect(activity.length).toBeLessThanOrEqual(20);
    });

    it('should merge and sort items from enrollments, payments, and attendances', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 10000);
      mockPrisma.enrollment.findMany.mockResolvedValue([
        {
          student: { name: 'Ali' },
          class: { name: 'Math' },
          created_at: earlier,
        },
      ]);
      mockPrisma.payment.findMany.mockResolvedValue([
        {
          student: { name: 'Ali' },
          status: 'PAID',
          amount: 100,
          created_at: now,
        },
      ]);
      mockPrisma.attendance.findMany.mockResolvedValue([]);

      const activity = await service.getActivity(instId);
      expect(activity.length).toBe(2);
      expect(activity[0].type).toBe('payment');
      expect(activity[1].type).toBe('enrollment');
    });
  });
});
