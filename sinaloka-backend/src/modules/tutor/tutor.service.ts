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
import {
  CreateTutorDto,
  UpdateTutorDto,
  TutorQueryDto,
  UpdateTutorProfileDto,
} from './tutor.dto.js';

@Injectable()
export class TutorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, dto: CreateTutorDto) {
    // Check email uniqueness
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException(`Email "${dto.email}" is already in use`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password_hash: passwordHash,
          role: 'TUTOR',
          institution_id: institutionId,
          is_active: true,
        },
      });

      const tutor = await tx.tutor.create({
        data: {
          user_id: user.id,
          institution_id: institutionId,
          subjects: dto.subjects,
          experience_years: dto.experience_years ?? 0,
          availability: dto.availability ?? undefined,
          bank_name: dto.bank_name ?? null,
          bank_account_number: dto.bank_account_number ?? null,
          bank_account_holder: dto.bank_account_holder ?? null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              is_active: true,
            },
          },
        },
      });

      return tutor;
    });

    return result;
  }

  async findAll(
    institutionId: string,
    query: TutorQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const { page, limit, search, subject, is_verified, sort_by, sort_order } =
      query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      institution_id: institutionId,
    };

    if (subject) {
      where.subjects = { has: subject };
    }

    if (is_verified !== undefined) {
      where.is_verified = is_verified;
    }

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    // Handle sort_by - 'name' needs to sort via user relation
    const orderBy: Record<string, unknown> =
      sort_by === 'name'
        ? { user: { name: sort_order } }
        : { [sort_by]: sort_order };

    const [data, total] = await Promise.all([
      this.prisma.tutor.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              is_active: true,
            },
          },
        },
      }),
      this.prisma.tutor.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(institutionId: string, id: string) {
    const tutor = await this.prisma.tutor.findFirst({
      where: { id, institution_id: institutionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            is_active: true,
          },
        },
      },
    });

    if (!tutor) {
      throw new NotFoundException(`Tutor with ID "${id}" not found`);
    }

    return tutor;
  }

  async update(institutionId: string, id: string, dto: UpdateTutorDto) {
    const existing = await this.findOne(institutionId, id);

    const tutorData: Record<string, unknown> = {};
    if (dto.subjects !== undefined) tutorData.subjects = dto.subjects;
    if (dto.experience_years !== undefined)
      tutorData.experience_years = dto.experience_years;
    if (dto.availability !== undefined)
      tutorData.availability = dto.availability;
    if (dto.bank_name !== undefined) tutorData.bank_name = dto.bank_name;
    if (dto.bank_account_number !== undefined)
      tutorData.bank_account_number = dto.bank_account_number;
    if (dto.bank_account_holder !== undefined)
      tutorData.bank_account_holder = dto.bank_account_holder;
    if (dto.is_verified !== undefined) tutorData.is_verified = dto.is_verified;
    if (dto.rating !== undefined) tutorData.rating = dto.rating;

    // If name is updated, also update the user record
    if (dto.name !== undefined) {
      await this.prisma.user.update({
        where: { id: existing.user_id },
        data: { name: dto.name },
      });
    }

    return this.prisma.tutor.update({
      where: { id },
      data: tutorData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            is_active: true,
          },
        },
      },
    });
  }

  async delete(institutionId: string, id: string) {
    const existing = await this.findOne(institutionId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.tutor.delete({ where: { id } });
      await tx.refreshToken.deleteMany({
        where: { user_id: existing.user_id },
      });
      await tx.user.delete({ where: { id: existing.user_id } });
    });
  }

  async getProfile(userId: string) {
    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            is_active: true,
          },
        },
      },
    });

    if (!tutor) {
      throw new NotFoundException('Tutor profile not found');
    }

    return tutor;
  }

  async updateProfile(userId: string, dto: UpdateTutorProfileDto) {
    const tutor = await this.getProfile(userId);

    return this.prisma.tutor.update({
      where: { id: tutor.id },
      data: dto,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            is_active: true,
          },
        },
      },
    });
  }
}
