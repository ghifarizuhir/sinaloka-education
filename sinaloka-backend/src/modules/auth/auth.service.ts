import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import {
  LoginDto,
  RefreshTokenDto,
  LogoutDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './auth.dto.js';
import { EmailService } from '../email/email.service.js';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  must_change_password: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async login(dto: LoginDto): Promise<TokenResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { institution: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.password_hash) {
      throw new UnauthorizedException('Please accept your invitation first');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('User account is inactive');
    }

    if (user.institution && !user.institution.is_active) {
      throw new ForbiddenException(
        'Your institution has been deactivated. Contact support.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Subdomain slug validation
    if (dto.slug) {
      // SUPER_ADMIN must login at platform.sinaloka.com (no slug)
      if (user.role === 'SUPER_ADMIN') {
        throw new UnauthorizedException(
          'Silakan login di platform.sinaloka.com',
        );
      }
      // Verify user belongs to the institution matching this slug
      if (!user.institution || user.institution.slug !== dto.slug) {
        throw new UnauthorizedException(
          'Akun tidak terdaftar di institusi ini',
        );
      }
    } else {
      // No slug provided — check enforcement
      const enforceSubdomain = this.configService.get<string>(
        'ENFORCE_SUBDOMAIN_LOGIN',
        'false',
      );
      if (
        enforceSubdomain === 'true' &&
        user.role !== 'SUPER_ADMIN'
      ) {
        throw new UnauthorizedException(
          'Silakan akses melalui subdomain institusi Anda',
        );
      }
    }

    // Update last_login_at
    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const payload = {
      sub: user.id,
      institutionId: user.institution_id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshTokenValue = crypto.randomBytes(64).toString('hex');

    // Parse refresh expiry for DB
    const refreshExpiry = this.configService.get<string>(
      'JWT_REFRESH_EXPIRY',
      '7d',
    );
    const expiresAt = this.calculateExpiry(refreshExpiry);

    await this.prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token: refreshTokenValue,
        expires_at: expiresAt,
      },
    });

    const jwtExpiry = this.configService.get<string>('JWT_EXPIRY', '15m');

    return {
      access_token: accessToken,
      refresh_token: refreshTokenValue,
      token_type: 'Bearer',
      expires_in: this.expiryToSeconds(jwtExpiry),
      must_change_password: user.must_change_password,
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenResponse> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refresh_token },
      include: { user: { include: { institution: true } } },
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (refreshToken.revoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (refreshToken.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (!refreshToken.user.is_active) {
      throw new UnauthorizedException('User account is inactive');
    }

    if (
      refreshToken.user.institution &&
      !refreshToken.user.institution.is_active
    ) {
      throw new ForbiddenException(
        'Your institution has been deactivated. Contact support.',
      );
    }

    // Revoke old refresh token
    await this.prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: { revoked: true },
    });

    // Generate new tokens
    const payload = {
      sub: refreshToken.user.id,
      institutionId: refreshToken.user.institution_id,
      role: refreshToken.user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const newRefreshTokenValue = crypto.randomBytes(64).toString('hex');

    const refreshExpiry = this.configService.get<string>(
      'JWT_REFRESH_EXPIRY',
      '7d',
    );
    const expiresAt = this.calculateExpiry(refreshExpiry);

    await this.prisma.refreshToken.create({
      data: {
        user_id: refreshToken.user.id,
        token: newRefreshTokenValue,
        expires_at: expiresAt,
      },
    });

    const jwtExpiry = this.configService.get<string>('JWT_EXPIRY', '15m');

    return {
      access_token: accessToken,
      refresh_token: newRefreshTokenValue,
      token_type: 'Bearer',
      expires_in: this.expiryToSeconds(jwtExpiry),
      must_change_password: refreshToken.user.must_change_password,
    };
  }

  async logout(dto: LogoutDto): Promise<{ message: string }> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refresh_token },
    });

    if (refreshToken) {
      await this.prisma.refreshToken.update({
        where: { id: refreshToken.id },
        data: { revoked: true },
      });
    }

    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar_url: true,
        is_active: true,
        last_login_at: true,
        must_change_password: true,
        created_at: true,
        institution: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo_url: true,
            timezone: true,
            default_language: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Always return success to prevent email enumeration
    if (!user || !user.is_active) {
      return {
        message: 'Jika email terdaftar, link reset password telah dikirim.',
      };
    }

    // Invalidate existing unused tokens
    await this.prisma.passwordResetToken.updateMany({
      where: { user_id: user.id, used_at: null },
      data: { used_at: new Date() },
    });

    // Create new token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: {
        user_id: user.id,
        token,
        expires_at: expiresAt,
      },
    });

    // Send email
    await this.emailService.sendPasswordReset({
      to: user.email,
      userName: user.name,
      resetToken: token,
    });

    return {
      message: 'Jika email terdaftar, link reset password telah dikirim.',
    };
  }

  async validateResetToken(
    token: string,
  ): Promise<{ valid: boolean; email: string }> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (
      !resetToken ||
      resetToken.used_at ||
      resetToken.expires_at < new Date()
    ) {
      throw new UnauthorizedException(
        'Token tidak valid atau sudah kedaluwarsa.',
      );
    }

    return { valid: true, email: resetToken.user.email };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (
      !resetToken ||
      resetToken.used_at ||
      resetToken.expires_at < new Date()
    ) {
      throw new UnauthorizedException(
        'Token tidak valid atau sudah kedaluwarsa.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction([
      // Update password
      this.prisma.user.update({
        where: { id: resetToken.user_id },
        data: { password_hash: passwordHash },
      }),
      // Mark token as used
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used_at: new Date() },
      }),
      // Revoke all refresh tokens (force re-login)
      this.prisma.refreshToken.updateMany({
        where: { user_id: resetToken.user_id, revoked: false },
        data: { revoked: true },
      }),
    ]);

    return { message: 'Password berhasil direset.' };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<TokenResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { institution: true },
    });

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('User account is inactive');
    }

    if (user.institution && !user.institution.is_active) {
      throw new ForbiddenException(
        'Your institution has been deactivated. Contact support.',
      );
    }

    const isCurrentValid = await bcrypt.compare(
      dto.current_password,
      user.password_hash,
    );
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.current_password === dto.new_password) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const newHash = await bcrypt.hash(dto.new_password, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          password_hash: newHash,
          must_change_password: false,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { user_id: userId, revoked: false },
        data: { revoked: true },
      }),
    ]);

    // Issue new tokens
    const payload = {
      sub: user.id,
      institutionId: user.institution_id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshTokenValue = crypto.randomBytes(64).toString('hex');
    const refreshExpiry = this.configService.get<string>(
      'JWT_REFRESH_EXPIRY',
      '7d',
    );
    const expiresAt = this.calculateExpiry(refreshExpiry);

    await this.prisma.refreshToken.create({
      data: {
        user_id: userId,
        token: refreshTokenValue,
        expires_at: expiresAt,
      },
    });

    const jwtExpiry = this.configService.get<string>('JWT_EXPIRY', '15m');

    return {
      access_token: accessToken,
      refresh_token: refreshTokenValue,
      token_type: 'Bearer',
      expires_in: this.expiryToSeconds(jwtExpiry),
      must_change_password: false,
    };
  }

  private calculateExpiry(expiry: string): Date {
    const now = new Date();
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      // Default to 7 days
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  private expiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900;
    }
  }
}
