import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
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
  hash: jest.fn(() => Promise.resolve('$2b$10$mockedhash')),
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

  describe('getProfile', () => {
    it('should return the user profile', async () => {
      const profileUser = {
        id: 'user-1',
        email: 'admin@test.com',
        name: 'Test Admin',
        role: 'ADMIN',
        avatar_url: null,
        is_active: true,
        last_login_at: null,
        must_change_password: false,
        created_at: new Date(),
        institution: {
          id: 'inst-1',
          name: 'Bimbel Cerdas',
          slug: 'bimbelcerdas',
          logo_url: null,
          timezone: 'Asia/Jakarta',
          default_language: 'id',
          billing_mode: 'SUBSCRIPTION',
          onboarding_completed: true,
        },
      };
      prisma.user.findUnique.mockResolvedValue(profileUser);

      const result = await service.getProfile('user-1');

      expect(result).toEqual(profileUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: expect.objectContaining({
          id: true,
          email: true,
          name: true,
          role: true,
        }),
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent-user')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    it('should return success message and send reset email for existing active user', async () => {
      const emailService = module.get(EmailService);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'admin@test.com',
        name: 'Test Admin',
        is_active: true,
      });
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      prisma.passwordResetToken.create.mockResolvedValue({});

      const result = await service.forgotPassword({ email: 'admin@test.com' });

      expect(result.message).toBe(
        'Jika email terdaftar, link reset password telah dikirim.',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(emailService.sendPasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@test.com',
          userName: 'Test Admin',
          resetToken: 'mock-refresh-token-hex',
        }),
      );
      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { user_id: 'user-1', used_at: null },
        data: { used_at: expect.any(Date) },
      });
      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
    });

    it('should return same success message when user is not found (no email enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'notfound@test.com',
      });

      expect(result.message).toBe(
        'Jika email terdaftar, link reset password telah dikirim.',
      );
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('should return same success message when user is inactive (no email enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'inactive@test.com',
        name: 'Inactive',
        is_active: false,
      });

      const result = await service.forgotPassword({
        email: 'inactive@test.com',
      });

      expect(result.message).toBe(
        'Jika email terdaftar, link reset password telah dikirim.',
      );
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });
  });

  describe('validateResetToken', () => {
    it('should return valid true and email for a valid unused unexpired token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-1',
        token: 'valid-token',
        used_at: null,
        expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        user: { email: 'admin@test.com' },
      });

      const result = await service.validateResetToken('valid-token');

      expect(result).toEqual({ valid: true, email: 'admin@test.com' });
    });

    it('should throw UnauthorizedException when token does not exist', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        service.validateResetToken('nonexistent-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token has already been used', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-1',
        token: 'used-token',
        used_at: new Date(Date.now() - 10000), // used 10s ago
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
        user: { email: 'admin@test.com' },
      });

      await expect(service.validateResetToken('used-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token has expired', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-1',
        token: 'expired-token',
        used_at: null,
        expires_at: new Date(Date.now() - 60 * 60 * 1000), // expired 1 hour ago
        user: { email: 'admin@test.com' },
      });

      await expect(service.validateResetToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('resetPassword', () => {
    it('should reset the password and return success message', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-1',
        token: 'valid-reset-token',
        user_id: 'user-1',
        used_at: null,
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
        user: { id: 'user-1', email: 'admin@test.com' },
      });
      prisma.$transaction.mockImplementation((ops: unknown[]) =>
        Promise.all(ops),
      );
      prisma.user.update.mockResolvedValue({});
      prisma.passwordResetToken.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.resetPassword({
        token: 'valid-reset-token',
        password: 'NewSecurePass1',
      });

      expect(result.message).toBe('Password berhasil direset.');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ password_hash: expect.any(String) }),
        }),
      );
      expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'prt-1' },
        data: { used_at: expect.any(Date) },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { user_id: 'user-1', revoked: false },
        data: { revoked: true },
      });
    });

    it('should throw UnauthorizedException for invalid reset token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'bad-token', password: 'NewPass1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for already-used reset token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-1',
        token: 'used-token',
        user_id: 'user-1',
        used_at: new Date(Date.now() - 5000),
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
        user: { id: 'user-1', email: 'admin@test.com' },
      });

      await expect(
        service.resetPassword({ token: 'used-token', password: 'NewPass1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired reset token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-1',
        token: 'expired-token',
        user_id: 'user-1',
        used_at: null,
        expires_at: new Date(Date.now() - 60 * 60 * 1000),
        user: { id: 'user-1', email: 'admin@test.com' },
      });

      await expect(
        service.resetPassword({
          token: 'expired-token',
          password: 'NewPass1!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('should change password and return new tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.$transaction.mockImplementation((ops: unknown[]) =>
        Promise.all(ops),
      );
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.changePassword('user-1', {
        current_password: 'OldPass1',
        new_password: 'NewSecure1A',
      });

      expect(result.access_token).toBe('mock-access-token');
      expect(result.refresh_token).toBe('mock-refresh-token-hex');
      expect(result.must_change_password).toBe(false);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ must_change_password: false }),
        }),
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { user_id: 'user-1', revoked: false },
        data: { revoked: true },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when current password is incorrect', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', {
          current_password: 'WrongOldPass',
          new_password: 'NewSecure1A',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when new password equals current password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.changePassword('user-1', {
          current_password: 'SamePass1A',
          new_password: 'SamePass1A',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent', {
          current_password: 'OldPass1',
          new_password: 'NewSecure1A',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        is_active: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.changePassword('user-1', {
          current_password: 'OldPass1',
          new_password: 'NewSecure1A',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired and revoked refresh tokens and expired password reset tokens', async () => {
      prisma.refreshToken.deleteMany = jest
        .fn()
        .mockResolvedValue({ count: 5 });
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
      prisma.refreshToken.deleteMany = jest
        .fn()
        .mockResolvedValue({ count: 2 });
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
