import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

jest.mock('../../common/prisma/prisma.service', () => {
  return { PrismaService: jest.fn() };
});

import { AcademicYearService } from './academic-year.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('AcademicYearService', () => {
  let service: AcademicYearService;
  let prisma: {
    academicYear: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    semester: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
    };
    class: {
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
    classSchedule: {
      createMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const tenantId = 'inst-1';

  const mockYear = {
    id: 'year-1',
    institution_id: tenantId,
    name: '2025/2026',
    start_date: new Date('2025-07-01'),
    end_date: new Date('2026-06-30'),
    status: 'ACTIVE',
  };

  const mockSemester = {
    id: 'sem-1',
    institution_id: tenantId,
    academic_year_id: 'year-1',
    name: 'Ganjil',
    start_date: new Date('2025-07-01'),
    end_date: new Date('2025-12-31'),
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    prisma = {
      academicYear: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      semester: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      class: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      classSchedule: {
        createMany: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicYearService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AcademicYearService>(AcademicYearService);
  });

  // ─── createYear ───

  describe('createYear', () => {
    it('should create a new academic year', async () => {
      prisma.academicYear.findUnique.mockResolvedValue(null);
      prisma.academicYear.create.mockResolvedValue(mockYear);

      const dto = {
        name: '2025/2026',
        start_date: new Date('2025-07-01'),
        end_date: new Date('2026-06-30'),
      };

      const result = await service.createYear(tenantId, dto);

      expect(prisma.academicYear.findUnique).toHaveBeenCalledWith({
        where: {
          institution_id_name: { institution_id: tenantId, name: dto.name },
        },
      });
      expect(prisma.academicYear.create).toHaveBeenCalledWith({
        data: {
          institution_id: tenantId,
          name: dto.name,
          start_date: dto.start_date,
          end_date: dto.end_date,
        },
      });
      expect(result).toEqual(mockYear);
    });

    it('should throw ConflictException if name already exists', async () => {
      prisma.academicYear.findUnique.mockResolvedValue(mockYear);

      const dto = {
        name: '2025/2026',
        start_date: new Date('2025-07-01'),
        end_date: new Date('2026-06-30'),
      };

      await expect(service.createYear(tenantId, dto)).rejects.toThrow(
        new ConflictException('Academic year name already exists'),
      );
      expect(prisma.academicYear.create).not.toHaveBeenCalled();
    });
  });

  // ─── updateYear ───

  describe('updateYear', () => {
    it('should update an academic year', async () => {
      const updatedYear = { ...mockYear, name: '2025/2026 Updated' };
      prisma.academicYear.findFirst.mockResolvedValue(mockYear);
      prisma.academicYear.findUnique.mockResolvedValue(null);
      prisma.academicYear.update.mockResolvedValue(updatedYear);

      const dto = { name: '2025/2026 Updated' };

      const result = await service.updateYear(tenantId, 'year-1', dto);

      expect(prisma.academicYear.findFirst).toHaveBeenCalledWith({
        where: { id: 'year-1', institution_id: tenantId },
      });
      expect(prisma.academicYear.update).toHaveBeenCalledWith({
        where: { id: 'year-1' },
        data: { name: '2025/2026 Updated' },
      });
      expect(result).toEqual(updatedYear);
    });

    it('should throw ConflictException if new name already exists', async () => {
      const otherYear = { ...mockYear, id: 'year-2', name: 'Taken Name' };
      prisma.academicYear.findFirst.mockResolvedValue(mockYear);
      prisma.academicYear.findUnique.mockResolvedValue(otherYear);

      const dto = { name: 'Taken Name' };

      await expect(service.updateYear(tenantId, 'year-1', dto)).rejects.toThrow(
        new ConflictException('Academic year name already exists'),
      );
      expect(prisma.academicYear.update).not.toHaveBeenCalled();
    });
  });

  // ─── deleteYear ───

  describe('deleteYear', () => {
    it('should throw NotFoundException if year not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(null);

      await expect(service.deleteYear(tenantId, 'year-1')).rejects.toThrow(
        new NotFoundException('Academic year not found'),
      );
    });

    it('should throw BadRequestException if year has semesters', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(mockYear);
      prisma.semester.count.mockResolvedValue(2);

      await expect(service.deleteYear(tenantId, 'year-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.academicYear.delete).not.toHaveBeenCalled();
    });

    it('should delete an academic year with no semesters', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(mockYear);
      prisma.semester.count.mockResolvedValue(0);
      prisma.academicYear.delete.mockResolvedValue(mockYear);

      const result = await service.deleteYear(tenantId, 'year-1');

      expect(prisma.academicYear.delete).toHaveBeenCalledWith({
        where: { id: 'year-1' },
      });
      expect(result).toEqual(mockYear);
    });
  });

  // ─── createSemester ───

  describe('createSemester', () => {
    it('should create a new semester', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(mockYear);
      prisma.semester.findUnique.mockResolvedValue(null);
      prisma.semester.create.mockResolvedValue(mockSemester);

      const dto = {
        name: 'Ganjil',
        start_date: new Date('2025-07-01'),
        end_date: new Date('2025-12-31'),
      };

      const result = await service.createSemester(tenantId, 'year-1', dto);

      expect(prisma.academicYear.findFirst).toHaveBeenCalledWith({
        where: { id: 'year-1', institution_id: tenantId },
      });
      expect(prisma.semester.create).toHaveBeenCalledWith({
        data: {
          institution_id: tenantId,
          academic_year_id: 'year-1',
          name: dto.name,
          start_date: dto.start_date,
          end_date: dto.end_date,
        },
      });
      expect(result).toEqual(mockSemester);
    });

    it('should throw NotFoundException if academic year not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(null);

      const dto = {
        name: 'Ganjil',
        start_date: new Date('2025-07-01'),
        end_date: new Date('2025-12-31'),
      };

      await expect(
        service.createSemester(tenantId, 'year-1', dto),
      ).rejects.toThrow(new NotFoundException('Academic year not found'));
      expect(prisma.semester.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if semester name already exists in this year', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(mockYear);
      prisma.semester.findUnique.mockResolvedValue(mockSemester);

      const dto = {
        name: 'Ganjil',
        start_date: new Date('2025-07-01'),
        end_date: new Date('2025-12-31'),
      };

      await expect(
        service.createSemester(tenantId, 'year-1', dto),
      ).rejects.toThrow(
        new ConflictException('Semester name already exists in this academic year'),
      );
      expect(prisma.semester.create).not.toHaveBeenCalled();
    });
  });

  // ─── archiveSemester ───

  describe('archiveSemester', () => {
    it('should archive semester and auto-archive year when all semesters are archived', async () => {
      const semesterWithYear = {
        ...mockSemester,
        academic_year: mockYear,
      };
      prisma.semester.findFirst.mockResolvedValue(semesterWithYear);
      prisma.semester.update.mockResolvedValue({ ...mockSemester, status: 'ARCHIVED' });
      prisma.class.updateMany.mockResolvedValue({ count: 0 });
      prisma.semester.count.mockResolvedValue(0); // no remaining active semesters
      prisma.academicYear.update.mockResolvedValue({ ...mockYear, status: 'ARCHIVED' });

      const result = await service.archiveSemester(tenantId, 'sem-1');

      expect(result).toEqual({ archived_classes: true, year_archived: true });
      expect(prisma.academicYear.update).toHaveBeenCalledWith({
        where: { id: 'year-1' },
        data: { status: 'ARCHIVED' },
      });
    });

    it('should archive semester but keep year active when other semesters remain', async () => {
      const semesterWithYear = {
        ...mockSemester,
        academic_year: mockYear,
      };
      prisma.semester.findFirst.mockResolvedValue(semesterWithYear);
      prisma.semester.update.mockResolvedValue({ ...mockSemester, status: 'ARCHIVED' });
      prisma.class.updateMany.mockResolvedValue({ count: 0 });
      prisma.semester.count.mockResolvedValue(1); // 1 active semester remains

      const result = await service.archiveSemester(tenantId, 'sem-1');

      expect(result).toEqual({ archived_classes: true, year_archived: false });
      expect(prisma.academicYear.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if semester is already archived', async () => {
      const archivedSemester = {
        ...mockSemester,
        status: 'ARCHIVED',
        academic_year: mockYear,
      };
      prisma.semester.findFirst.mockResolvedValue(archivedSemester);

      await expect(service.archiveSemester(tenantId, 'sem-1')).rejects.toThrow(
        new BadRequestException('Semester is already archived'),
      );
      expect(prisma.semester.update).not.toHaveBeenCalled();
    });
  });

  // ─── rollOver ───

  describe('rollOver', () => {
    const mockSourceClass = {
      id: 'class-1',
      institution_id: tenantId,
      semester_id: 'sem-1',
      name: 'Math 101',
      subject_id: 'subject-1',
      tutor_id: 'tutor-1',
      capacity: 30,
      fee: '500000',
      tutor_fee: '200000',
      tutor_fee_mode: 'FIXED_PER_SESSION',
      tutor_fee_per_student: null,
      room: 'Room A',
      status: 'ACTIVE',
      schedules: [
        {
          id: 'sched-1',
          class_id: 'class-1',
          day: 'Monday',
          start_time: '14:00',
          end_time: '15:30',
        },
      ],
    };

    const mockTargetSemester = {
      id: 'sem-2',
      institution_id: tenantId,
      academic_year_id: 'year-1',
      name: 'Genap',
      start_date: new Date('2026-01-01'),
      end_date: new Date('2026-06-30'),
      status: 'ACTIVE',
    };

    it('should copy classes and schedules to target semester', async () => {
      const newClass = { id: 'class-new-1' };
      prisma.semester.findFirst
        .mockResolvedValueOnce(mockTargetSemester) // target
        .mockResolvedValueOnce(mockSemester); // source
      prisma.class.findMany
        .mockResolvedValueOnce([mockSourceClass]) // source classes
        .mockResolvedValueOnce([]); // existing target classes
      prisma.class.create.mockResolvedValue(newClass);
      prisma.classSchedule.createMany.mockResolvedValue({ count: 1 });

      const dto = { source_semester_id: 'sem-1' };
      const result = await service.rollOver(tenantId, 'sem-2', dto);

      expect(prisma.class.create).toHaveBeenCalledTimes(1);
      expect(prisma.classSchedule.createMany).toHaveBeenCalledWith({
        data: [
          {
            class_id: newClass.id,
            day: 'Monday',
            start_time: '14:00',
            end_time: '15:30',
          },
        ],
      });
      expect(result).toEqual({
        created_count: 1,
        skipped_count: 0,
        classes: [newClass],
      });
    });

    it('should skip classes that already exist in target semester', async () => {
      const newClass = { id: 'class-new-2' };
      const anotherClass = {
        ...mockSourceClass,
        id: 'class-2',
        name: 'Science 101',
        schedules: [],
      };
      prisma.semester.findFirst
        .mockResolvedValueOnce(mockTargetSemester)
        .mockResolvedValueOnce(mockSemester);
      prisma.class.findMany
        .mockResolvedValueOnce([mockSourceClass, anotherClass]) // source classes
        .mockResolvedValueOnce([{ name: 'Math 101' }]); // Math 101 already exists in target
      prisma.class.create.mockResolvedValue(newClass);
      prisma.classSchedule.createMany.mockResolvedValue({ count: 0 });

      const dto = { source_semester_id: 'sem-1' };
      const result = await service.rollOver(tenantId, 'sem-2', dto);

      expect(prisma.class.create).toHaveBeenCalledTimes(1); // only Science 101
      expect(result).toEqual({
        created_count: 1,
        skipped_count: 1,
        classes: [newClass],
      });
    });

    it('should throw BadRequestException if source semester has no classes', async () => {
      prisma.semester.findFirst
        .mockResolvedValueOnce(mockTargetSemester)
        .mockResolvedValueOnce(mockSemester);
      prisma.class.findMany
        .mockResolvedValueOnce([]) // no source classes
        .mockResolvedValueOnce([]);

      const dto = { source_semester_id: 'sem-1' };

      await expect(service.rollOver(tenantId, 'sem-2', dto)).rejects.toThrow(
        new BadRequestException('No classes found in source semester to roll over'),
      );
      expect(prisma.class.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if source and target semester are the same', async () => {
      const dto = { source_semester_id: 'sem-1' };

      await expect(service.rollOver(tenantId, 'sem-1', dto)).rejects.toThrow(
        new BadRequestException('Source and target semester must be different'),
      );
      expect(prisma.semester.findFirst).not.toHaveBeenCalled();
    });
  });
});
