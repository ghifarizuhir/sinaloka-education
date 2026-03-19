import { Test, TestingModule } from '@nestjs/testing';

jest.mock('../../common/prisma/prisma.service', () => {
  return {
    PrismaService: jest.fn(),
  };
});

import { StudentService } from './student.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('StudentService CSV', () => {
  let service: StudentService;
  let prisma: {
    student: {
      createMany: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      student: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [StudentService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = mod.get(StudentService);
    jest.clearAllMocks();
  });

  describe('importFromCsv', () => {
    it('creates valid rows and returns errors for invalid ones', async () => {
      const csv =
        'name,grade,email\nAlice,Grade 5,alice@test.com\n,Grade 5,bad\nBob,Grade 6,';
      const buf = Buffer.from(csv);
      prisma.student.createMany.mockResolvedValue({ count: 2 });
      const result = await service.importFromCsv(buf, 'inst-1');
      expect(result.created).toBe(2);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].row).toBe(2);
    });

    it('returns all errors when CSV is entirely invalid', async () => {
      const csv = 'name,grade\n,\n,';
      const buf = Buffer.from(csv);
      const result = await service.importFromCsv(buf, 'inst-1');
      expect(result.created).toBe(0);
      expect(result.errors.length).toBe(2);
    });

    it('handles empty CSV with only headers', async () => {
      const csv = 'name,grade,email';
      const buf = Buffer.from(csv);
      const result = await service.importFromCsv(buf, 'inst-1');
      expect(result.created).toBe(0);
      expect(result.errors.length).toBe(0);
    });

    it('sets institution_id on all valid records', async () => {
      const csv = 'name,grade\nAlice,Grade 5';
      const buf = Buffer.from(csv);
      prisma.student.createMany.mockResolvedValue({ count: 1 });
      await service.importFromCsv(buf, 'inst-xyz');
      expect(prisma.student.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ institution_id: 'inst-xyz' }),
          ]),
        }),
      );
    });
  });

  describe('exportToCsv', () => {
    it('returns CSV string with headers and rows', async () => {
      prisma.student.findMany.mockResolvedValue([
        {
          name: 'Alice',
          email: 'a@t.com',
          phone: null,
          grade: 'G5',
          status: 'ACTIVE',
          parent_name: null,
          parent_phone: null,
          parent_email: null,
        },
      ]);
      const csv = await service.exportToCsv({}, 'inst-1');
      expect(csv).toContain('name,email');
      expect(csv).toContain('Alice');
    });

    it('returns empty string for empty result', async () => {
      prisma.student.findMany.mockResolvedValue([]);
      const csv = await service.exportToCsv({}, 'inst-1');
      expect(csv).toBe('');
    });

    it('applies status filter to query', async () => {
      prisma.student.findMany.mockResolvedValue([]);
      await service.exportToCsv({ status: 'ACTIVE' }, 'inst-1');
      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: 'inst-1',
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('applies grade filter to query', async () => {
      prisma.student.findMany.mockResolvedValue([]);
      await service.exportToCsv({ grade: 'G10' }, 'inst-1');
      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            grade: 'G10',
          }),
        }),
      );
    });
  });
});
