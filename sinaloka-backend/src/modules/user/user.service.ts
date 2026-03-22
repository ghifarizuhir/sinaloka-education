import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import {
  buildPaginationMeta,
  PaginatedResponse,
} from '../../common/dto/pagination.dto.js';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from './user.dto.js';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    institutionId: string | null,
    query: UserQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (institutionId) {
      where.institution_id = institutionId;
    } else if (query.institution_id) {
      where.institution_id = query.institution_id;
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.is_active !== undefined) {
      where.is_active = query.is_active;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          is_active: true,
          institution_id: true,
          avatar_url: true,
          last_login_at: true,
          created_at: true,
          updated_at: true,
          institution: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string, institutionId?: string | null) {
    const where: Record<string, unknown> = { id };
    if (institutionId) {
      where.institution_id = institutionId;
    }

    const user = await this.prisma.user.findFirst({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        institution_id: true,
        avatar_url: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
        institution: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }

  async create(dto: CreateUserDto) {
    // Check email uniqueness
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException(`Email "${dto.email}" is already in use`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password_hash: passwordHash,
        role: dto.role,
        institution_id: dto.institution_id ?? null,
        must_change_password: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        institution_id: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  async update(id: string, dto: UpdateUserDto, institutionId?: string | null) {
    await this.findOne(id, institutionId); // throws NotFoundException if not found or out of scope

    const data: Record<string, unknown> = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) {
      // Check email uniqueness
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Email "${dto.email}" is already in use`);
      }
      data.email = dto.email;
    }
    if (dto.password !== undefined) {
      data.password_hash = await bcrypt.hash(dto.password, 10);
      data.must_change_password = true;
    }
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.institution_id !== undefined)
      data.institution_id = dto.institution_id;
    if (dto.is_active !== undefined) data.is_active = dto.is_active;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        institution_id: true,
        created_at: true,
        updated_at: true,
      },
    });

    // Revoke all refresh tokens when password is reset — forces re-login on all devices
    if (dto.password !== undefined) {
      await this.prisma.refreshToken.deleteMany({
        where: { user_id: id },
      });
    }

    return updatedUser;
  }

  async remove(id: string, institutionId?: string | null) {
    await this.findOne(id, institutionId); // throws NotFoundException if not found or out of scope

    // Delete related refresh tokens first
    await this.prisma.refreshToken.deleteMany({
      where: { user_id: id },
    });

    return this.prisma.user.delete({
      where: { id },
    });
  }
}
