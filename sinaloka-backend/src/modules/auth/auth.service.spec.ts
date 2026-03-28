import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock PrismaService module to avoid importing generated prisma client
jest.mock('../../common/prisma/prisma.service', () => {
  return {
    PrismaService: jest.fn(),
  };
});

// Mock EmailService module
jest.mock('../email/email.service', () => {
  return {
    EmailService: jest.fn(),
  };
});

import { AuthService } from './auth.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'mock-refresh-token-hex'),
  })),
}));

describe('AuthService', () => {
  let service: AuthService;
  let module: TestingModule;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    passwordResetToken: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };

  const mockUser = {
    id: 'user-1',
    email: 'admin@test.com',
    password_hash: '$2b$10$hashedpassword',
    name: 'Test Admin',
    role: 'ADMIN',
    is_active: true,
    institution_id: 'inst-1',
    institution: {
      id: 'inst-1',
      name: 'Bimbel Cerdas',
      slug: 'bimbelcerdas',
      is_active: true,
    },
    must_change_password: false,
    last_login_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      passwordResetToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((ops) => Promise.resolve(ops)),
    };

    jwtService = {
      sign: jest.fn(() => 'mock-access-token'),
    };

    module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                JWT_EXPIRY: '15m',
                JWT_REFRESH_EXPIRY: '7d',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendPasswordReset: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return tokens on successful login', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue({});
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'admin@test.com',
        password: 'password123',
      });

      expect(result.access_token).toBe('mock-access-token');
      expect(result.refresh_token).toBe('mock-refresh-token-hex');
      expect(result.token_type).toBe('Bearer');
      expect(result.expires_in).toBe(900); // 15m = 900s
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        institutionId: 'inst-1',
        role: 'ADMIN',
      });
      // last_login_at update and refresh token create are now atomic via $transaction
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException for wrong email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should execute last_login_at update and refresh token creation atomically via $transaction', async () => {
      const mockTransaction = jest.fn((ops) => Promise.resolve(ops));
      (prisma as any).$transaction = mockTransaction;

      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login({ email: 'admin@test.com', password: 'password123' });

      // $transaction must have been called for login atomicity
      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    it('should call bcrypt.compare even when user is not found (timing attack mitigation)', async () => {
      (bcrypt.compare as jest.Mock).mockClear();
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'nonexistent@test.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);

      // bcrypt.compare MUST be called even for non-existent users
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      // Must use a dummy hash, not the real user hash
      const callArgs = (bcrypt.compare as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe('password123');
      expect(callArgs[1]).toMatch(/^\$2b\$/); // must be a bcrypt hash
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'admin@test.com', password: 'wrongpass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        is_active: false,
      });

      await expect(
        service.login({ email: 'admin@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should succeed when slug matches user institution', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        institution: { ...mockUser.institution, slug: 'bimbelcerdas' },
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.refreshToken.create.mockResolvedValue({} as any);
      prisma.user.update.mockResolvedValue({} as any);

      const result = await service.login({
        email: 'admin@test.com',
        password: 'password',
        slug: 'bimbelcerdas',
      });
      expect(result).toHaveProperty('access_token');
    });

    it('should reject when slug does not match user institution', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        institution: { ...mockUser.institution, slug: 'other-inst' },
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({
          email: 'admin@test.com',
          password: 'password',
          slug: 'bimbelcerdas',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject SUPER_ADMIN login with slug', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: 'SUPER_ADMIN',
        institution_id: null,
        institution: null,
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({
          email: 'super@test.com',
          password: 'password',
          slug: 'bimbelcerdas',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should return new tokens for valid refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'valid-refresh-token',
        revoked: false,
        expires_at: new Date(Date.now() + 86400000), // 1 day from now
        user: mockUser,
      });
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh({
        refresh_token: 'valid-refresh-token',
      });

      expect(result.access_token).toBe('mock-access-token');
      expect(result.refresh_token).toBe('mock-refresh-token-hex');
      expect(result.token_type).toBe('Bearer');
      // Old token should be revoked atomically via $transaction
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.refresh({ refresh_token: 'invalid-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should execute refresh token rotation atomically via $transaction', async () => {
      const mockTransaction = jest.fn((ops) => Promise.resolve(ops));
      (prisma as any).$transaction = mockTransaction;

      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'valid-refresh-token',
        revoked: false,
        expires_at: new Date(Date.now() + 86400000),
        user: mockUser,
      });

      await service.refresh({ refresh_token: 'valid-refresh-token' });

      // $transaction must have been called — rotation is atomic
      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException for revoked refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'revoked-token',
        revoked: true,
        expires_at: new Date(Date.now() + 86400000),
        user: mockUser,
      });

      await expect(
        service.refresh({ refresh_token: 'revoked-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'token-to-revoke',
      });
      prisma.refreshToken.update.mockResolvedValue({});

      const result = await service.logout({
        refresh_token: 'token-to-revoke',
      });

      expect(result.message).toBe('Logged out successfully');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { revoked: true },
      });
    });

    it('should succeed even if token does not exist', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      const result = await service.logout({
        refresh_token: 'nonexistent-token',
      });

      expect(result.message).toBe('Logged out successfully');
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired and revoked refresh tokens and expired password reset tokens', async () => {
      prisma.refreshToken.deleteMany = jest.fn().mockResolvedValue({ count: 5 });
      prisma.passwordResetToken.deleteMany = jest
        .fn()
        .mockResolvedValue({ count: 3 });

      await service.cleanupExpiredTokens();

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [{ revoked: true }, { expires_at: { lt: expect.any(Date) } }],
        },
      });
      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { expires_at: { lt: expect.any(Date) } },
      });
    });

    it('should log the number of deleted tokens', async () => {
      prisma.refreshToken.deleteMany = jest.fn().mockResolvedValue({ count: 2 });
      prisma.passwordResetToken.deleteMany = jest
        .fn()
        .mockResolvedValue({ count: 1 });

      const loggerSpy = jest
        .spyOn((service as any).logger, 'log')
        .mockImplementation(() => {});

      await service.cleanupExpiredTokens();

      expect(loggerSpy).toHaveBeenCalledWith(
        'Token cleanup: deleted 2 refresh tokens, 1 password reset tokens',
      );
    });
  });
});
