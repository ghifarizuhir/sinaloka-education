import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { InvoiceGeneratorService } from '../payment/invoice-generator.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: PrismaService;

  const mockPrisma = {
    attendance: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
    },
    tutor: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((fn: any) => fn(mockPrisma)),
  };

  const mockInvoiceGenerator = {
    generateForSession: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const institutionId = 'inst-uuid-1';
  const userId = 'user-uuid-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InvoiceGeneratorService, useValue: mockInvoiceGenerator },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
    mockInvoiceGenerator.generateForSession.mockReset();
    mockEventEmitter.emit.mockReset();
  });

  describe('batchCreate', () => {
    it('should batch create attendance records for a session', async () => {
      const session = {
        id: 'session-uuid-1',
        institution_id: institutionId,
        class: { tutor_id: 'tutor-uuid-1' },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      const records = [
        {
          student_id: 'student-1',
          status: 'PRESENT' as const,
          homework_done: true,
          notes: null,
        },
        {
          student_id: 'student-2',
          status: 'ABSENT' as const,
          homework_done: false,
          notes: 'Sick',
        },
      ];

      const createdRecords = records.map((r, i) => ({
        id: `att-${i}`,
        session_id: 'session-uuid-1',
        institution_id: institutionId,
        ...r,
      }));

      mockPrisma.attendance.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.attendance.findMany.mockResolvedValueOnce([]); // first call: check existing
      mockPrisma.attendance.findMany.mockResolvedValueOnce(createdRecords); // second call: return created

      const result = await service.batchCreate(userId, {
        session_id: 'session-uuid-1',
        records,
      });

      expect(mockPrisma.session.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-uuid-1' },
        include: { class: true },
      });
    });

    it('should throw ForbiddenException if tutor does not own the session', async () => {
      const session = {
        id: 'session-uuid-1',
        institution_id: institutionId,
        class: { tutor_id: 'tutor-uuid-other' },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      await expect(
        service.batchCreate(userId, {
          session_id: 'session-uuid-1',
          records: [
            {
              student_id: 'student-1',
              status: 'PRESENT',
              homework_done: false,
            },
          ],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if session not found', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(
        service.batchCreate(userId, {
          session_id: 'nonexistent',
          records: [
            {
              student_id: 'student-1',
              status: 'PRESENT',
              homework_done: false,
            },
          ],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if duplicate student attendance exists', async () => {
      const session = {
        id: 'session-uuid-1',
        institution_id: institutionId,
        class: { tutor_id: 'tutor-uuid-1' },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });
      // Existing attendance record for student-1
      mockPrisma.attendance.findMany.mockResolvedValue([
        {
          id: 'existing-att',
          session_id: 'session-uuid-1',
          student_id: 'student-1',
        },
      ]);

      await expect(
        service.batchCreate(userId, {
          session_id: 'session-uuid-1',
          records: [
            {
              student_id: 'student-1',
              status: 'PRESENT',
              homework_done: false,
            },
          ],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findBySession', () => {
    it('should return attendance records for a session', async () => {
      const records = [
        {
          id: 'att-1',
          session_id: 'session-uuid-1',
          student_id: 'student-1',
          status: 'PRESENT',
          institution_id: institutionId,
        },
      ];
      mockPrisma.attendance.findMany.mockResolvedValue(records);

      const result = await service.findBySession(
        institutionId,
        'session-uuid-1',
      );

      expect(result).toEqual(records);
      expect(mockPrisma.attendance.findMany).toHaveBeenCalledWith({
        where: {
          session_id: 'session-uuid-1',
          institution_id: institutionId,
        },
        include: { student: true },
      });
    });
  });

  describe('update (admin)', () => {
    it('should update an attendance record', async () => {
      const existing = {
        id: 'att-1',
        institution_id: institutionId,
        status: 'PRESENT',
      };
      mockPrisma.attendance.findUnique.mockResolvedValue(existing);

      const updated = { ...existing, status: 'LATE' };
      mockPrisma.attendance.update.mockResolvedValue(updated);

      const result = await service.update(institutionId, 'att-1', {
        status: 'LATE',
      });

      expect(result.status).toBe('LATE');
    });

    it('should throw NotFoundException if attendance record not found', async () => {
      mockPrisma.attendance.findUnique.mockResolvedValue(null);

      await expect(
        service.update(institutionId, 'nonexistent', { status: 'LATE' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateByTutor', () => {
    it('should allow tutor to update attendance for own session', async () => {
      const existing = {
        id: 'att-1',
        institution_id: institutionId,
        session_id: 'session-uuid-1',
        status: 'PRESENT',
        session: {
          class: { tutor_id: 'tutor-uuid-1' },
        },
      };

      mockPrisma.attendance.findUnique.mockResolvedValue(existing);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      const updated = { ...existing, notes: 'Updated note' };
      mockPrisma.attendance.update.mockResolvedValue(updated);

      const result = await service.updateByTutor(userId, 'att-1', {
        notes: 'Updated note',
      });

      expect(result.notes).toBe('Updated note');
    });

    it('should throw ForbiddenException if tutor does not own the session', async () => {
      const existing = {
        id: 'att-1',
        institution_id: institutionId,
        session_id: 'session-uuid-1',
        status: 'PRESENT',
        session: {
          class: { tutor_id: 'tutor-uuid-other' },
        },
      };

      mockPrisma.attendance.findUnique.mockResolvedValue(existing);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      await expect(
        service.updateByTutor(userId, 'att-1', { notes: 'Hijack' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getSummary', () => {
    it('should return attendance summary stats for a class in date range', async () => {
      mockPrisma.attendance.findMany.mockResolvedValue([
        { status: 'PRESENT', homework_done: true },
        { status: 'PRESENT', homework_done: false },
        { status: 'ABSENT', homework_done: false },
        { status: 'LATE', homework_done: true },
      ]);
      mockPrisma.attendance.count.mockResolvedValue(4);

      const result = await service.getSummary(institutionId, {
        class_id: 'class-uuid-1',
        date_from: new Date('2026-04-01'),
        date_to: new Date('2026-04-30'),
      });

      expect(result.total_records).toBe(4);
      expect(result.present).toBe(2);
      expect(result.absent).toBe(1);
      expect(result.late).toBe(1);
      expect(result.homework_done).toBe(2);
      expect(result.attendance_rate).toBeCloseTo(75); // (2+1)/4 * 100, PRESENT+LATE
    });
  });

  describe('findByStudent', () => {
    const studentId = 'student-uuid-1';
    const query = {
      date_from: new Date('2026-03-01'),
      date_to: new Date('2026-03-31'),
    };

    it('should return summary and records for a student', async () => {
      const mockRecords = [
        { id: 'att-1', status: 'PRESENT', student_id: studentId, session: { id: 's1', date: '2026-03-20', start_time: '10:00', end_time: '11:00', status: 'COMPLETED', class: { id: 'c1', name: 'Math' } } },
        { id: 'att-2', status: 'ABSENT', student_id: studentId, session: { id: 's2', date: '2026-03-18', start_time: '10:00', end_time: '11:00', status: 'COMPLETED', class: { id: 'c1', name: 'Math' } } },
        { id: 'att-3', status: 'LATE', student_id: studentId, session: { id: 's3', date: '2026-03-15', start_time: '10:00', end_time: '11:00', status: 'COMPLETED', class: { id: 'c1', name: 'Math' } } },
      ];

      mockPrisma.attendance.findMany.mockResolvedValue(mockRecords);

      const result = await service.findByStudent(institutionId, studentId, query);

      expect(result.summary).toEqual({
        total_sessions: 3,
        present: 1,
        absent: 1,
        late: 1,
        attendance_rate: 66.67,
      });
      expect(result.records).toHaveLength(3);
      expect(mockPrisma.attendance.findMany).toHaveBeenCalledWith({
        where: {
          institution_id: institutionId,
          student_id: studentId,
          session: { date: { gte: query.date_from, lte: query.date_to } },
        },
        include: {
          session: {
            select: {
              id: true,
              date: true,
              start_time: true,
              end_time: true,
              status: true,
              class: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { session: { date: 'desc' } },
      });
    });

    it('should return zero rate when no records exist', async () => {
      mockPrisma.attendance.findMany.mockResolvedValue([]);

      const result = await service.findByStudent(institutionId, studentId, query);

      expect(result.summary).toEqual({
        total_sessions: 0,
        present: 0,
        absent: 0,
        late: 0,
        attendance_rate: 0,
      });
      expect(result.records).toHaveLength(0);
    });
  });
});
