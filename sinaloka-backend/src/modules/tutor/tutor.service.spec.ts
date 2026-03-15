import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';

jest.mock('../../common/prisma/prisma.service', () => {
  return {
    PrismaService: jest.fn(),
  };
});

jest.mock('bcrypt', () => ({
  hash: jest.fn(() => Promise.resolve('$2b$10$hashed')),
}));

import { TutorService } from './tutor.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('TutorService', () => {
  let service: TutorService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    tutor: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    refreshToken: {
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const mockUser = {
    id: 'user-1',
    name: 'Tutor One',
    email: 'tutor@test.com',
    role: 'TUTOR',
    is_active: true,
  };

  const mockTutor = {
    id: 'tutor-1',
    user_id: 'user-1',
    institution_id: 'inst-1',
    subjects: ['Math', 'Physics'],
    rating: 4.5,
    experience_years: 3,
    availability: null,
    bank_name: null,
    bank_account_number: null,
    bank_account_holder: null,
    is_verified: false,
    created_at: new Date(),
    updated_at: new Date(),
    user: mockUser,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      tutor: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      refreshToken: {
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TutorService>(TutorService);
  });

  describe('create', () => {
    it('should create a user and tutor in a transaction', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          tutor: { create: jest.fn().mockResolvedValue(mockTutor) },
        };
        return fn(tx);
      });

      const result = await service.create('inst-1', {
        name: 'Tutor One',
        email: 'tutor@test.com',
        password: 'password123',
        subjects: ['Math', 'Physics'],
        experience_years: 3,
      });

      expect(result).toEqual(mockTutor);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.create('inst-1', {
          name: 'Tutor One',
          email: 'tutor@test.com',
          password: 'password123',
          subjects: ['Math'],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated tutors', async () => {
      prisma.tutor.findMany.mockResolvedValue([mockTutor]);
      prisma.tutor.count.mockResolvedValue(1);

      const result = await service.findAll('inst-1', {
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(prisma.tutor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institution_id: 'inst-1' }),
        }),
      );
    });

    it('should filter by subject', async () => {
      prisma.tutor.findMany.mockResolvedValue([mockTutor]);
      prisma.tutor.count.mockResolvedValue(1);

      await service.findAll('inst-1', {
        page: 1,
        limit: 20,
        subject: 'Math',
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(prisma.tutor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ subjects: { has: 'Math' } }),
        }),
      );
    });

    it('should sort by rating', async () => {
      prisma.tutor.findMany.mockResolvedValue([mockTutor]);
      prisma.tutor.count.mockResolvedValue(1);

      await service.findAll('inst-1', {
        page: 1,
        limit: 20,
        sort_by: 'rating',
        sort_order: 'desc',
      });

      expect(prisma.tutor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { rating: 'desc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a tutor by id scoped to institution', async () => {
      prisma.tutor.findFirst.mockResolvedValue(mockTutor);

      const result = await service.findOne('inst-1', 'tutor-1');

      expect(result).toEqual(mockTutor);
      expect(prisma.tutor.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tutor-1', institution_id: 'inst-1' },
        }),
      );
    });

    it('should throw NotFoundException if tutor not found', async () => {
      prisma.tutor.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('inst-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a tutor', async () => {
      prisma.tutor.findFirst.mockResolvedValue(mockTutor);
      prisma.tutor.update.mockResolvedValue({
        ...mockTutor,
        subjects: ['Math', 'Physics', 'Chemistry'],
      });

      const result = await service.update('inst-1', 'tutor-1', {
        subjects: ['Math', 'Physics', 'Chemistry'],
      });

      expect(result.subjects).toContain('Chemistry');
      expect(prisma.tutor.update).toHaveBeenCalledWith({
        where: { id: 'tutor-1' },
        data: { subjects: ['Math', 'Physics', 'Chemistry'] },
        include: expect.any(Object),
      });
    });

    it('should update user name when name is provided', async () => {
      prisma.tutor.findFirst.mockResolvedValue(mockTutor);
      prisma.user.update.mockResolvedValue({ ...mockUser, name: 'New Name' });
      prisma.tutor.update.mockResolvedValue({
        ...mockTutor,
        user: { ...mockUser, name: 'New Name' },
      });

      await service.update('inst-1', 'tutor-1', { name: 'New Name' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'New Name' },
      });
    });

    it('should throw NotFoundException if tutor not found', async () => {
      prisma.tutor.findFirst.mockResolvedValue(null);

      await expect(
        service.update('inst-1', 'nonexistent', { subjects: ['Math'] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete tutor and user in a transaction', async () => {
      prisma.tutor.findFirst.mockResolvedValue(mockTutor);
      prisma.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          tutor: { delete: jest.fn().mockResolvedValue(mockTutor) },
          refreshToken: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
          user: { delete: jest.fn().mockResolvedValue(mockUser) },
        };
        return fn(tx);
      });

      await service.delete('inst-1', 'tutor-1');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if tutor not found', async () => {
      prisma.tutor.findFirst.mockResolvedValue(null);

      await expect(
        service.delete('inst-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProfile', () => {
    it('should return tutor profile by user id', async () => {
      prisma.tutor.findFirst.mockResolvedValue(mockTutor);

      const result = await service.getProfile('user-1');

      expect(result).toEqual(mockTutor);
      expect(prisma.tutor.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: 'user-1' },
        }),
      );
    });

    it('should throw NotFoundException if profile not found', async () => {
      prisma.tutor.findFirst.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update tutor profile with limited fields', async () => {
      prisma.tutor.findFirst.mockResolvedValue(mockTutor);
      prisma.tutor.update.mockResolvedValue({
        ...mockTutor,
        bank_name: 'BCA',
      });

      const result = await service.updateProfile('user-1', {
        bank_name: 'BCA',
      });

      expect(result.bank_name).toBe('BCA');
      expect(prisma.tutor.update).toHaveBeenCalledWith({
        where: { id: 'tutor-1' },
        data: { bank_name: 'BCA' },
        include: expect.any(Object),
      });
    });
  });
});
