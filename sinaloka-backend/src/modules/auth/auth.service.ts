import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { LoginDto, RefreshTokenDto, LogoutDto } from './auth.dto.js';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<TokenResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
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

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
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
    const refreshExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d');
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
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenResponse> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refresh_token },
      include: { user: true },
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

    const refreshExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d');
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
        created_at: true,
        institution: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo_url: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private calculateExpiry(expiry: string): Date {
    const now = new Date();
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      // Default to 7 days
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1]!, 10);
    const unit = match[2]!;

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

    const value = parseInt(match[1]!, 10);
    const unit = match[2]!;

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
