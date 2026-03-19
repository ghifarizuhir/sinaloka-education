import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';

jest.mock('../../common/prisma/prisma.service', () => {
  return { PrismaService: jest.fn() };
});

jest.mock('bcrypt', () => ({
  hash: jest.fn(() => Promise.resolve('hashed-password')),
}));

import { ParentInviteService } from './parent-invite.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('ParentInviteService', () => {
  let service: ParentInviteService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      student: { findMany: jest.fn(), count: jest.fn() },
      parentInvite: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: { findUnique: jest.fn(), create: jest.fn() },
      parent: { create: jest.fn() },
      parentStudent: { createMany: jest.fn() },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentInviteService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ParentInviteService>(ParentInviteService);
  });

  describe('createInvite', () => {
    it('should create an invite with valid student IDs', async () => {
      prisma.student.count.mockResolvedValue(2);
      prisma.parentInvite.create.mockResolvedValue({
        id: 'invite-1',
        token: 'mock-token',
        email: 'parent@test.com',
        student_ids: ['s1', 's2'],
        expires_at: expect.any(Date),
      });

      const result = await service.createInvite('inst-1', {
        email: 'parent@test.com',
        student_ids: ['s1', 's2'],
      });

      expect(result).toHaveProperty('token');
      expect(prisma.student.count).toHaveBeenCalledWith({
        where: { id: { in: ['s1', 's2'] }, institution_id: 'inst-1' },
      });
    });

    it('should throw if student IDs do not belong to institution', async () => {
      prisma.student.count.mockResolvedValue(1); // only 1 of 2 found

      await expect(
        service.createInvite('inst-1', {
          email: 'parent@test.com',
          student_ids: ['s1', 's2'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('registerParent', () => {
    const validInvite = {
      id: 'invite-1',
      institution_id: 'inst-1',
      email: 'parent@test.com',
      token: 'valid-token',
      student_ids: ['s1', 's2'],
      used_at: null,
      expires_at: new Date(Date.now() + 86400000),
    };

    it('should register a parent from a valid invite', async () => {
      prisma.parentInvite.findUnique.mockResolvedValue(validInvite);
      prisma.user.findUnique.mockResolvedValue(null); // email not taken
      prisma.student.findMany.mockResolvedValue([]); // no extra matches
      const mockUser = { id: 'user-1' };
      const mockParent = { id: 'parent-1' };
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.parent.create.mockResolvedValue(mockParent);
      prisma.parentStudent.createMany.mockResolvedValue({ count: 2 });
      prisma.parentInvite.update.mockResolvedValue({});

      const result = await service.registerParent({
        token: 'valid-token',
        name: 'Parent User',
        password: 'securepass123',
      });

      expect(result.user.id).toBe('user-1');
      expect(result.parent.id).toBe('parent-1');
    });

    it('should throw if invite token is invalid', async () => {
      prisma.parentInvite.findUnique.mockResolvedValue(null);

      await expect(
        service.registerParent({
          token: 'bad-token',
          name: 'Parent',
          password: 'securepass123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if invite is expired', async () => {
      prisma.parentInvite.findUnique.mockResolvedValue({
        ...validInvite,
        expires_at: new Date(Date.now() - 1000),
      });

      await expect(
        service.registerParent({
          token: 'valid-token',
          name: 'Parent',
          password: 'securepass123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if invite is already used', async () => {
      prisma.parentInvite.findUnique.mockResolvedValue({
        ...validInvite,
        used_at: new Date(),
      });

      await expect(
        service.registerParent({
          token: 'valid-token',
          name: 'Parent',
          password: 'securepass123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if email is already registered', async () => {
      prisma.parentInvite.findUnique.mockResolvedValue(validInvite);
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(
        service.registerParent({
          token: 'valid-token',
          name: 'Parent',
          password: 'securepass123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
