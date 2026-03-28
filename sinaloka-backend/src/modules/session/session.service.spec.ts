import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PayoutService } from '../payout/payout.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('SessionService', () => {
  let service: SessionService;
  let prisma: PrismaService;

  const mockPayoutService = {
    create: jest.fn(),
  };

  const mockPrisma = {
    session: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    class: {
      findUnique: jest.fn(),
    },
    tutor: {
      findFirst: jest.fn(),
    },
    payout: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    attendance: {
      count: jest.fn().mockResolvedValue(0),
    },
  };

  const institutionId = 'inst-uuid-1';
  const userId = 'user-uuid-1';

  const expectedSessionInclude = {
    class: {
      include: {
        subject: true,
        tutor: { include: { user: { select: { id: true, name: true } } } },
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PayoutService, useValue: mockPayoutService },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a session scoped to institution', async () => {
      const dto = {
        class_id: 'class-uuid-1',
        date: new Date('2026-04-01'),
        start_time: '14:00',
        end_time: '15:30',
        status: 'SCHEDULED' as const,
      };

      const createdSession = {
        id: 'session-uuid-1',
        institution_id: institutionId,
        created_by: userId,
        ...dto,
        class: {
          id: 'class-uuid-1',
          fee: 100000n,
          tutor: {
            id: 'tutor-uuid-1',
            user: { id: 'user-uuid-2', name: 'Tutor A' },
          },
        },
      };

      mockPrisma.class.findUnique.mockResolvedValue({
        id: 'class-uuid-1',
        institution_id: institutionId,
        status: 'ACTIVE',
      });
      mockPrisma.session.create.mockResolvedValue(createdSession);

      const result = await service.create(institutionId, userId, dto);

      expect(result.id).toBe('session-uuid-1');
      expect(result.class.fee).toBe(100000);
      expect(result.class.tutor).toEqual({
        id: 'tutor-uuid-1',
        name: 'Tutor A',
      });
      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          institution_id: institutionId,
          class_id: dto.class_id,
          date: dto.date,
          start_time: dto.start_time,
          end_time: dto.end_time,
          created_by: userId,
        }),
        include: expectedSessionInclude,
      });
    });

    it('should throw NotFoundException if class not found', async () => {
      mockPrisma.class.findUnique.mockResolvedValue(null);

      await expect(
        service.create(institutionId, userId, {
          class_id: 'nonexistent',
          date: new Date(),
          start_time: '14:00',
          end_time: '15:30',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated sessions for institution', async () => {
      const sessions = [
        {
          id: 'session-1',
          institution_id: institutionId,
          date: new Date(),
          class: {
            id: 'class-1',
            fee: 100000n,
            tutor: { id: 'tutor-1', user: { id: 'user-2', name: 'Tutor A' } },
          },
        },
      ];
      mockPrisma.session.findMany.mockResolvedValue(sessions);
      mockPrisma.session.count.mockResolvedValue(1);

      const result = await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        sort_by: 'date',
        sort_order: 'asc',
      });

      expect(result.data[0].class.fee).toBe(100000);
      expect(result.data[0].class.tutor).toEqual({
        id: 'tutor-1',
        name: 'Tutor A',
      });
      expect(result.total).toBe(1);
    });

    it('should filter by class_id', async () => {
      mockPrisma.session.findMany.mockResolvedValue([]);
      mockPrisma.session.count.mockResolvedValue(0);

      await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        class_id: 'class-uuid-1',
        sort_by: 'date',
        sort_order: 'asc',
      });

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: institutionId,
            class_id: 'class-uuid-1',
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrisma.session.findMany.mockResolvedValue([]);
      mockPrisma.session.count.mockResolvedValue(0);

      await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        status: 'SCHEDULED',
        sort_by: 'date',
        sort_order: 'asc',
      });

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: institutionId,
            status: 'SCHEDULED',
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrisma.session.findMany.mockResolvedValue([]);
      mockPrisma.session.count.mockResolvedValue(0);

      const dateFrom = new Date('2026-04-01');
      const dateTo = new Date('2026-04-30');

      await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        date_from: dateFrom,
        date_to: dateTo,
        sort_by: 'date',
        sort_order: 'asc',
      });

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: institutionId,
            date: { gte: dateFrom, lte: dateTo },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a session by id within institution', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        date: new Date(),
        class: {
          id: 'class-1',
          fee: 100000n,
          tutor: {
            id: 'tutor-1',
            user: { id: 'user-2', name: 'Tutor A', email: 'tutor@test.com' },
          },
        },
        attendances: [
          {
            id: 'att-1',
            status: 'PRESENT',
            homework_done: true,
            notes: 'Good',
            student: { id: 'student-1', name: 'Student A', grade: '10' },
            created_at: new Date(),
          },
        ],
      };
      mockPrisma.session.findUnique.mockResolvedValue(session);

      const result = await service.findOne(institutionId, 'session-1');

      expect(result.class.fee).toBe(100000);
      expect(result.class.tutor).toEqual({
        id: 'tutor-1',
        name: 'Tutor A',
        email: 'tutor@test.com',
      });
      expect(result.attendances[0].student).toEqual({
        id: 'student-1',
        name: 'Student A',
        grade: '10',
      });
      expect(mockPrisma.session.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1', institution_id: institutionId },
        include: {
          class: {
            include: {
              subject: { select: { name: true } },
              tutor: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
          attendances: {
            include: {
              student: { select: { id: true, name: true, grade: true } },
            },
            orderBy: { created_at: 'desc' },
          },
        },
      });
    });

    it('should throw NotFoundException if session not found', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne(institutionId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a session', async () => {
      const existing = {
        id: 'session-1',
        institution_id: institutionId,
        status: 'SCHEDULED',
        class: {
          id: 'class-1',
          fee: 100000n,
          tutor: {
            id: 'tutor-1',
            user: { id: 'user-2', name: 'Tutor A', email: 'tutor@test.com' },
          },
        },
        attendances: [],
      };
      mockPrisma.session.findUnique.mockResolvedValue(existing);

      const updated = {
        ...existing,
        topic_covered: 'Algebra',
        class: {
          id: 'class-1',
          fee: 100000n,
          tutor: { id: 'tutor-1', user: { id: 'user-2', name: 'Tutor A' } },
        },
      };
      mockPrisma.session.update.mockResolvedValue(updated);

      const result = await service.update(institutionId, 'session-1', {
        topic_covered: 'Algebra',
      });

      expect(result.topic_covered).toBe('Algebra');
    });

    it('should throw NotFoundException if session not found', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(
        service.update(institutionId, 'nonexistent', {
          topic_covered: 'X',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should skip payout creation when duplicate payout exists for completed session (admin)', async () => {
      const existing = {
        id: 'session-1',
        institution_id: institutionId,
        status: 'SCHEDULED',
        date: new Date('2026-04-01'),
        class: {
          id: 'class-1',
          fee: 100000n,
          tutor: {
            id: 'tutor-1',
            user: { id: 'user-2', name: 'Tutor A', email: 'tutor@test.com' },
          },
        },
        attendances: [],
      };
      mockPrisma.session.findUnique.mockResolvedValue(existing);

      const classForFee = {
        id: 'class-1',
        name: 'Math A',
        tutor_id: 'tutor-1',
        tutor_fee: 200000n,
        tutor_fee_mode: 'FIXED_PER_SESSION',
        tutor_fee_per_student: null,
        fee: 100000n,
        room: 'A1',
        tutor: { user: { name: 'Tutor A' } },
        subject: { name: 'Math' },
      };
      mockPrisma.class.findUnique.mockResolvedValue(classForFee);

      const updatedSession = {
        ...existing,
        status: 'COMPLETED',
        class: {
          id: 'class-1',
          fee: 100000n,
          tutor: { id: 'tutor-1', user: { id: 'user-2', name: 'Tutor A' } },
        },
      };
      mockPrisma.session.update.mockResolvedValue(updatedSession);

      // Simulate existing payout (duplicate)
      mockPrisma.payout.findFirst.mockResolvedValue({
        id: 'existing-payout',
        tutor_id: 'tutor-1',
        description: 'Session: Math A - 2026-04-01',
      });

      await service.update(institutionId, 'session-1', {
        status: 'COMPLETED',
      });

      // PayoutService.create should NOT be called because payout already exists
      expect(mockPayoutService.create).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a session', async () => {
      const existing = {
        id: 'session-1',
        institution_id: institutionId,
        class: {
          id: 'class-1',
          fee: 100000n,
          tutor: {
            id: 'tutor-1',
            user: { id: 'user-2', name: 'Tutor A', email: 'tutor@test.com' },
          },
        },
        attendances: [],
      };
      mockPrisma.session.findUnique.mockResolvedValue(existing);
      mockPrisma.session.delete.mockResolvedValue({
        id: 'session-1',
        institution_id: institutionId,
      });

      const result = await service.delete(institutionId, 'session-1');

      expect(result.id).toBe('session-1');
    });

    it('should throw NotFoundException if session not found', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(
        service.delete(institutionId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateSessions', () => {
    it('should generate sessions for matching schedule days in date range', async () => {
      const classRecord = {
        id: 'class-uuid-1',
        institution_id: institutionId,
        status: 'ACTIVE',
        schedules: [
          {
            id: 'sched-1',
            day: 'Monday',
            start_time: '14:00',
            end_time: '15:30',
            class_id: 'class-uuid-1',
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: 'sched-2',
            day: 'Wednesday',
            start_time: '14:00',
            end_time: '15:30',
            class_id: 'class-uuid-1',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      mockPrisma.class.findUnique.mockResolvedValue(classRecord);
      // No existing sessions
      mockPrisma.session.findMany.mockResolvedValue([]);
      mockPrisma.session.createMany.mockResolvedValue({ count: 4 });

      // 2026-04-06 (Mon) to 2026-04-15 (Wed) — Mon 6, Wed 8, Mon 13, Wed 15 = 4 sessions
      const result = await service.generateSessions(institutionId, userId, {
        class_id: 'class-uuid-1',
        date_from: new Date('2026-04-06'),
        date_to: new Date('2026-04-15'),
      });

      expect(result.count).toBe(4);
      expect(mockPrisma.session.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            class_id: 'class-uuid-1',
            institution_id: institutionId,
            start_time: '14:00',
            end_time: '15:30',
            status: 'SCHEDULED',
            created_by: userId,
          }),
        ]),
        skipDuplicates: true,
      });
    });

    it('should skip dates that already have sessions (idempotent)', async () => {
      const classRecord = {
        id: 'class-uuid-1',
        institution_id: institutionId,
        status: 'ACTIVE',
        schedules: [
          {
            id: 'sched-1',
            day: 'Monday',
            start_time: '14:00',
            end_time: '15:30',
            class_id: 'class-uuid-1',
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: 'sched-2',
            day: 'Wednesday',
            start_time: '14:00',
            end_time: '15:30',
            class_id: 'class-uuid-1',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      mockPrisma.class.findUnique.mockResolvedValue(classRecord);
      // One session already exists for Mon Apr 6
      mockPrisma.session.findMany.mockResolvedValue([
        {
          id: 'existing-1',
          class_id: 'class-uuid-1',
          date: new Date('2026-04-06'),
        },
      ]);
      mockPrisma.session.createMany.mockResolvedValue({ count: 3 });

      const result = await service.generateSessions(institutionId, userId, {
        class_id: 'class-uuid-1',
        date_from: new Date('2026-04-06'),
        date_to: new Date('2026-04-15'),
      });

      // Should only create 3 sessions (skipped Mon Apr 6)
      expect(result.count).toBe(3);

      const createManyCall = mockPrisma.session.createMany.mock.calls[0][0];
      const dates = createManyCall.data.map(
        (d: any) => new Date(d.date).toISOString().split('T')[0],
      );
      expect(dates).not.toContain('2026-04-06');
    });

    it('should return count 0 if no matching days in range', async () => {
      const classRecord = {
        id: 'class-uuid-1',
        institution_id: institutionId,
        status: 'ACTIVE',
        schedules: [
          {
            id: 'sched-sat',
            day: 'Saturday',
            start_time: '09:00',
            end_time: '10:30',
            class_id: 'class-uuid-1',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      mockPrisma.class.findUnique.mockResolvedValue(classRecord);
      mockPrisma.session.findMany.mockResolvedValue([]);

      // Mon to Fri range — no Saturday
      const result = await service.generateSessions(institutionId, userId, {
        class_id: 'class-uuid-1',
        date_from: new Date('2026-04-06'), // Monday
        date_to: new Date('2026-04-10'), // Friday
      });

      expect(result.count).toBe(0);
      expect(mockPrisma.session.createMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if class not found', async () => {
      mockPrisma.class.findUnique.mockResolvedValue(null);

      await expect(
        service.generateSessions(institutionId, userId, {
          class_id: 'nonexistent',
          date_from: new Date('2026-04-01'),
          date_to: new Date('2026-04-30'),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if date_from > date_to', async () => {
      const classRecord = {
        id: 'class-uuid-1',
        institution_id: institutionId,
        status: 'ACTIVE',
        schedules: [
          {
            id: 'sched-mon',
            day: 'Monday',
            start_time: '14:00',
            end_time: '15:30',
            class_id: 'class-uuid-1',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      mockPrisma.class.findUnique.mockResolvedValue(classRecord);

      await expect(
        service.generateSessions(institutionId, userId, {
          class_id: 'class-uuid-1',
          date_from: new Date('2026-04-30'),
          date_to: new Date('2026-04-01'),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('requestReschedule', () => {
    it('should set status to RESCHEDULE_REQUESTED and store proposed values', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        class_id: 'class-uuid-1',
        status: 'SCHEDULED',
        class: {
          tutor_id: 'tutor-uuid-1',
          fee: 100000n,
          tutor: { id: 'tutor-uuid-1', user: { id: userId, name: 'Tutor A' } },
        },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      const updatedSession = {
        ...session,
        status: 'RESCHEDULE_REQUESTED',
        proposed_date: new Date('2026-04-10'),
        proposed_start_time: '16:00',
        proposed_end_time: '17:30',
        reschedule_reason: 'Personal conflict',
      };
      mockPrisma.session.update.mockResolvedValue(updatedSession);

      const result = await service.requestReschedule(institutionId, userId, 'session-1', {
        proposed_date: new Date('2026-04-10'),
        proposed_start_time: '16:00',
        proposed_end_time: '17:30',
        reschedule_reason: 'Personal conflict',
      });

      expect(result.status).toBe('RESCHEDULE_REQUESTED');
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1', institution_id: institutionId },
        data: {
          status: 'RESCHEDULE_REQUESTED',
          proposed_date: new Date('2026-04-10'),
          proposed_start_time: '16:00',
          proposed_end_time: '17:30',
          reschedule_reason: 'Personal conflict',
        },
        include: expectedSessionInclude,
      });
    });

    it('should throw ForbiddenException if tutor does not own the session', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        class_id: 'class-uuid-1',
        status: 'SCHEDULED',
        class: {
          tutor_id: 'tutor-uuid-other',
          fee: 100000n,
          tutor: {
            id: 'tutor-uuid-other',
            user: { id: 'other', name: 'Other' },
          },
        },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      await expect(
        service.requestReschedule(institutionId, userId, 'session-1', {
          proposed_date: new Date('2026-04-10'),
          proposed_start_time: '16:00',
          proposed_end_time: '17:30',
          reschedule_reason: 'Conflict',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if session is not SCHEDULED', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        class_id: 'class-uuid-1',
        status: 'CANCELLED',
        class: {
          tutor_id: 'tutor-uuid-1',
          fee: 100000n,
          tutor: { id: 'tutor-uuid-1', user: { id: userId, name: 'Tutor A' } },
        },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      await expect(
        service.requestReschedule(institutionId, userId, 'session-1', {
          proposed_date: new Date('2026-04-10'),
          proposed_start_time: '16:00',
          proposed_end_time: '17:30',
          reschedule_reason: 'Conflict',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveReschedule', () => {
    it('should approve reschedule — update date/time, clear proposed fields, set approved_by', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        status: 'RESCHEDULE_REQUESTED',
        proposed_date: new Date('2026-04-10'),
        proposed_start_time: '16:00',
        proposed_end_time: '17:30',
        reschedule_reason: 'Personal conflict',
        class: {
          id: 'class-1',
          fee: 100000n,
          tutor: {
            id: 'tutor-1',
            user: { id: 'user-2', name: 'Tutor A', email: 'tutor@test.com' },
          },
        },
        attendances: [],
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);

      const approvedSession = {
        ...session,
        date: session.proposed_date,
        start_time: session.proposed_start_time,
        end_time: session.proposed_end_time,
        status: 'SCHEDULED',
        approved_by: userId,
        proposed_date: null,
        proposed_start_time: null,
        proposed_end_time: null,
        reschedule_reason: null,
      };
      mockPrisma.session.update.mockResolvedValue(approvedSession);

      const result = await service.approveReschedule(
        institutionId,
        userId,
        'session-1',
        { approved: true },
      );

      expect(result.status).toBe('SCHEDULED');
      expect(result.approved_by).toBe(userId);
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1', institution_id: institutionId },
        data: {
          date: session.proposed_date,
          start_time: session.proposed_start_time,
          end_time: session.proposed_end_time,
          status: 'SCHEDULED',
          approved_by: userId,
          proposed_date: null,
          proposed_start_time: null,
          proposed_end_time: null,
          reschedule_reason: null,
        },
        include: expectedSessionInclude,
      });
    });

    it('should reject reschedule — set status back to SCHEDULED, clear proposed fields', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        status: 'RESCHEDULE_REQUESTED',
        proposed_date: new Date('2026-04-10'),
        proposed_start_time: '16:00',
        proposed_end_time: '17:30',
        reschedule_reason: 'Personal conflict',
        class: {
          id: 'class-1',
          fee: 100000n,
          tutor: {
            id: 'tutor-1',
            user: { id: 'user-2', name: 'Tutor A', email: 'tutor@test.com' },
          },
        },
        attendances: [],
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);

      const rejectedSession = {
        ...session,
        status: 'SCHEDULED',
        proposed_date: null,
        proposed_start_time: null,
        proposed_end_time: null,
        reschedule_reason: null,
      };
      mockPrisma.session.update.mockResolvedValue(rejectedSession);

      const result = await service.approveReschedule(
        institutionId,
        userId,
        'session-1',
        { approved: false },
      );

      expect(result.status).toBe('SCHEDULED');
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1', institution_id: institutionId },
        data: {
          status: 'SCHEDULED',
          proposed_date: null,
          proposed_start_time: null,
          proposed_end_time: null,
          reschedule_reason: null,
        },
        include: expectedSessionInclude,
      });
    });

    it('should throw BadRequestException if session is not RESCHEDULE_REQUESTED', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        status: 'SCHEDULED',
        class: {
          id: 'class-1',
          fee: 100000n,
          tutor: {
            id: 'tutor-1',
            user: { id: 'user-2', name: 'Tutor A', email: 'tutor@test.com' },
          },
        },
        attendances: [],
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);

      await expect(
        service.approveReschedule(institutionId, userId, 'session-1', {
          approved: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelSession (tutor)', () => {
    it('should cancel a session owned by the tutor', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        status: 'SCHEDULED',
        date: new Date('2026-04-01'),
        class: {
          name: 'Math A',
          tutor_id: 'tutor-uuid-1',
          fee: 100000n,
          tutor: { id: 'tutor-uuid-1', user: { id: userId, name: 'Tutor A' } },
        },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      const cancelledSession = {
        ...session,
        status: 'CANCELLED',
        date: new Date('2026-04-01'),
        class: { ...session.class },
      };
      mockPrisma.session.update.mockResolvedValue(cancelledSession);

      const result = await service.cancelSession(institutionId, userId, 'session-1');

      expect(result.status).toBe('CANCELLED');
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1', institution_id: institutionId },
        data: { status: 'CANCELLED' },
        include: expectedSessionInclude,
      });
    });

    it('should throw ForbiddenException if tutor does not own the session', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        status: 'SCHEDULED',
        class: {
          tutor_id: 'tutor-uuid-other',
          fee: 100000n,
          tutor: {
            id: 'tutor-uuid-other',
            user: { id: 'other', name: 'Other' },
          },
        },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      await expect(service.cancelSession(institutionId, userId, 'session-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if session is not SCHEDULED', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        status: 'COMPLETED',
        class: {
          tutor_id: 'tutor-uuid-1',
          fee: 100000n,
          tutor: { id: 'tutor-uuid-1', user: { id: userId, name: 'Tutor A' } },
        },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      await expect(
        service.cancelSession(institutionId, userId, 'session-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeSession (tutor)', () => {
    it('should skip payout creation when duplicate payout exists', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        status: 'SCHEDULED',
        date: new Date('2026-04-01'),
        class_id: 'class-1',
        class: {
          name: 'Math A',
          tutor_id: 'tutor-uuid-1',
          fee: 100000n,
          tutor: { id: 'tutor-uuid-1', user: { id: userId, name: 'Tutor A' } },
        },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      const classForFee = {
        id: 'class-1',
        name: 'Math A',
        tutor_id: 'tutor-uuid-1',
        tutor_fee: 200000n,
        tutor_fee_mode: 'FIXED_PER_SESSION',
        tutor_fee_per_student: null,
        fee: 100000n,
        room: 'A1',
        tutor: { user: { name: 'Tutor A' } },
        subject: { name: 'Math' },
      };
      mockPrisma.class.findUnique.mockResolvedValue(classForFee);

      const updatedSession = {
        ...session,
        status: 'COMPLETED',
        class: {
          name: 'Math A',
          fee: 100000n,
          tutor: { id: 'tutor-uuid-1', user: { id: userId, name: 'Tutor A' } },
        },
      };
      mockPrisma.session.update.mockResolvedValue(updatedSession);

      // Simulate existing payout (duplicate)
      mockPrisma.payout.findFirst.mockResolvedValue({
        id: 'existing-payout',
        tutor_id: 'tutor-uuid-1',
        description: 'Session: Math A - 2026-04-01',
      });

      await service.completeSession(institutionId, userId, 'session-1', {
        topic_covered: 'Algebra basics',
      });

      expect(mockPayoutService.create).not.toHaveBeenCalled();
    });

    it('should create payout when no duplicate exists', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        status: 'SCHEDULED',
        date: new Date('2026-04-01'),
        class_id: 'class-1',
        class: {
          name: 'Math A',
          tutor_id: 'tutor-uuid-1',
          fee: 100000n,
          tutor: { id: 'tutor-uuid-1', user: { id: userId, name: 'Tutor A' } },
        },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      const classForFee = {
        id: 'class-1',
        name: 'Math A',
        tutor_id: 'tutor-uuid-1',
        tutor_fee: 200000n,
        tutor_fee_mode: 'FIXED_PER_SESSION',
        tutor_fee_per_student: null,
        fee: 100000n,
        room: 'A1',
        tutor: { user: { name: 'Tutor A' } },
        subject: { name: 'Math' },
      };
      mockPrisma.class.findUnique.mockResolvedValue(classForFee);

      const updatedSession = {
        ...session,
        status: 'COMPLETED',
        class: {
          name: 'Math A',
          fee: 100000n,
          tutor: { id: 'tutor-uuid-1', user: { id: userId, name: 'Tutor A' } },
        },
      };
      mockPrisma.session.update.mockResolvedValue(updatedSession);

      // No existing payout
      mockPrisma.payout.findFirst.mockResolvedValue(null);

      await service.completeSession(institutionId, userId, 'session-1', {
        topic_covered: 'Algebra basics',
      });

      expect(mockPayoutService.create).toHaveBeenCalledWith(
        institutionId,
        expect.objectContaining({
          tutor_id: 'tutor-uuid-1',
          amount: 200000,
          status: 'PENDING',
        }),
      );
    });
  });

  describe('getTutorSchedule', () => {
    it('should return sessions for classes owned by the tutor', async () => {
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      const sessions = [
        {
          id: 'session-1',
          class: {
            tutor_id: 'tutor-uuid-1',
            fee: 100000n,
            tutor: {
              id: 'tutor-uuid-1',
              user: { id: userId, name: 'Tutor A' },
            },
          },
        },
      ];
      mockPrisma.session.findMany.mockResolvedValue(sessions);
      mockPrisma.session.count.mockResolvedValue(1);

      const result = await service.getTutorSchedule(userId, {
        page: 1,
        limit: 20,
        sort_by: 'date',
        sort_order: 'asc',
      });

      expect(result.data[0].class.fee).toBe(100000);
      expect(result.data[0].class.tutor).toEqual({
        id: 'tutor-uuid-1',
        name: 'Tutor A',
      });
      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            class: { tutor_id: 'tutor-uuid-1' },
          }),
        }),
      );
    });

    it('should throw NotFoundException if tutor profile not found', async () => {
      mockPrisma.tutor.findFirst.mockResolvedValue(null);

      await expect(
        service.getTutorSchedule(userId, {
          page: 1,
          limit: 20,
          sort_by: 'date',
          sort_order: 'asc',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should filter sessions by institution_id (tenant isolation)', async () => {
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
        institution_id: institutionId,
      });

      mockPrisma.session.findMany.mockResolvedValue([]);
      mockPrisma.session.count.mockResolvedValue(0);

      await service.getTutorSchedule(userId, {
        page: 1,
        limit: 20,
        sort_by: 'date',
        sort_order: 'asc',
      });

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: institutionId,
          }),
        }),
      );
    });
  });
});
