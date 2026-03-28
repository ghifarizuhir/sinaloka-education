import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

jest.mock('../../common/prisma/prisma.service', () => {
  return {
    PrismaService: jest.fn(),
  };
});

jest.mock('bcrypt', () => ({
  hash: jest.fn(() => Promise.resolve('$2b$10$hashed')),
}));

import { UserService } from './user.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('UserService', () => {
  let service: UserService;
  let prisma: {
    user: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    refreshToken: {
      deleteMany: jest.Mock;
    };
  };

  const mockUser = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@test.com',
    role: 'ADMIN',
    is_active: true,
    institution_id: 'inst-1',
    avatar_url: null,
    last_login_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    institution: { id: 'inst-1', name: 'Test Inst', slug: 'test-inst' },
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      refreshToken: {
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('findAll', () => {
    it('should return paginated users scoped to institution', async () => {
      prisma.user.findMany.mockResolvedValue([mockUser]);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.findAll('inst-1', {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institution_id: 'inst-1' }),
        }),
      );
    });

    it('should return all users when institutionId is null (super admin)', async () => {
      prisma.user.findMany.mockResolvedValue([mockUser]);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.findAll(null, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      // Should not have institution_id in where clause
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            institution_id: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.findOne('user-1');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should scope to institution when institutionId provided', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      await service.findOne('user-1', 'inst-1');

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'user-1',
            institution_id: 'inst-1',
          }),
        }),
      );
    });
  });

  describe('create', () => {
    it('should create a user with hashed password', async () => {
      prisma.user.findUnique.mockResolvedValue(null); // email not taken
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        email: 'new@test.com',
      });

      const result = await service.create('inst-1', {
        name: 'New User',
        email: 'new@test.com',
        password: 'password123',
        role: 'ADMIN',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password_hash: '$2b$10$hashed',
            email: 'new@test.com',
            institution_id: 'inst-1',
          }),
        }),
      );
    });

    it('should reject creating a SUPER_ADMIN user', async () => {
      await expect(
        service.create('inst-1', {
          name: 'Hacker',
          email: 'hacker@test.com',
          password: 'Password1',
          role: 'SUPER_ADMIN' as any,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException for duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser); // email taken

      await expect(
        service.create('inst-1', {
          name: 'New User',
          email: 'test@test.com',
          password: 'password123',
          role: 'ADMIN',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        name: 'Updated Name',
      });

      const result = await service.update('user-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject updating role to SUPER_ADMIN by ADMIN caller', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(
        service.update('user-1', { role: 'SUPER_ADMIN' as any }, 'inst-1', 'ADMIN'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject changing institution_id by ADMIN caller', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(
        service.update(
          'user-1',
          { institution_id: 'inst-2' },
          'inst-1',
          'ADMIN',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow SUPER_ADMIN to set role to SUPER_ADMIN', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        role: 'SUPER_ADMIN',
      });

      const result = await service.update(
        'user-1',
        { role: 'SUPER_ADMIN' as any },
        null,
        'SUPER_ADMIN',
      );
      expect(result.role).toBe('SUPER_ADMIN');
    });

    it('should allow SUPER_ADMIN to change institution_id', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        institution_id: 'inst-2',
      });

      const result = await service.update(
        'user-1',
        { institution_id: 'inst-2' },
        null,
        'SUPER_ADMIN',
      );
      expect(result.institution_id).toBe('inst-2');
    });
  });

  describe('remove', () => {
    it('should delete a user and their refresh tokens', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
      prisma.user.delete.mockResolvedValue(mockUser);

      await service.remove('user-1');

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
      });
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
