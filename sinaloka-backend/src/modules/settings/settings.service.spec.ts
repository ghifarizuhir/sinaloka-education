import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

jest.mock('../../common/prisma/prisma.service', () => {
  return {
    PrismaService: jest.fn(),
  };
});

import { SettingsService } from './settings.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('SettingsService', () => {
  let service: SettingsService;
  let prisma: {
    institution: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      institution: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  describe('getAcademic', () => {
    it('should return defaults when no settings stored', async () => {
      prisma.institution.findUnique.mockResolvedValue({ settings: null });

      const result = await service.getAcademic('inst-1');

      expect(result.rooms).toEqual([]);
      expect(result.subject_categories).toEqual([]);
      expect(result.grade_levels).toHaveLength(13);
      expect(result.grade_levels[0]).toEqual(
        expect.objectContaining({ name: 'SD 1', order: 1 }),
      );
      expect(result.grade_levels[12]).toEqual(
        expect.objectContaining({ name: 'Universitas', order: 13 }),
      );
      expect(result.working_days).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should merge stored settings with defaults', async () => {
      prisma.institution.findUnique.mockResolvedValue({
        settings: {
          academic: {
            rooms: [
              {
                id: 'r1',
                name: 'Room A',
                type: 'Classroom',
                capacity: 20,
                status: 'Available',
              },
            ],
          },
        },
      });

      const result = await service.getAcademic('inst-1');

      expect(result.rooms).toHaveLength(1);
      expect(result.rooms[0].name).toBe('Room A');
      // Defaults still present for non-overridden fields
      expect(result.grade_levels).toHaveLength(13);
      expect(result.working_days).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should throw NotFoundException for missing institution', async () => {
      prisma.institution.findUnique.mockResolvedValue(null);

      await expect(service.getAcademic('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateAcademic', () => {
    it('should preserve billing settings when updating academic', async () => {
      prisma.institution.findUnique.mockResolvedValue({
        settings: {
          billing: { billing_mode: 'manual' },
          academic: { rooms: [] },
        },
      });
      prisma.institution.update.mockResolvedValue({});

      await service.updateAcademic('inst-1', { working_days: [1, 2, 3, 4, 5] });

      expect(prisma.institution.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: {
          settings: {
            billing: { billing_mode: 'manual' },
            academic: { rooms: [], working_days: [1, 2, 3, 4, 5] },
          },
        },
      });
    });

    it('should merge with existing academic settings', async () => {
      prisma.institution.findUnique.mockResolvedValue({
        settings: {
          academic: {
            rooms: [
              {
                id: 'r1',
                name: 'Room A',
                type: 'Classroom',
                capacity: 20,
                status: 'Available',
              },
            ],
          },
        },
      });
      prisma.institution.update.mockResolvedValue({});

      await service.updateAcademic('inst-1', { working_days: [1, 2, 3, 4, 5] });

      const updateCall = prisma.institution.update.mock.calls[0][0];
      expect(updateCall.data.settings.academic.rooms).toHaveLength(1);
      expect(updateCall.data.settings.academic.rooms[0].name).toBe('Room A');
      expect(updateCall.data.settings.academic.working_days).toEqual([
        1, 2, 3, 4, 5,
      ]);
    });

    it('should throw NotFoundException for missing institution', async () => {
      prisma.institution.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAcademic('nonexistent', { working_days: [1, 2, 3] }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
