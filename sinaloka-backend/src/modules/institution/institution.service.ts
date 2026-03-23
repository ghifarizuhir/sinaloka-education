import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import {
  PaginationDto,
  buildPaginationMeta,
  PaginatedResponse,
} from '../../common/dto/pagination.dto.js';
import {
  CreateInstitutionDto,
  UpdateInstitutionDto,
} from './institution.dto.js';

@Injectable()
export class InstitutionService {
  private static readonly RESERVED_SLUGS = [
    'platform',
    'parent',
    'tutors',
    'api',
    'www',
    'mail',
    'ftp',
    'admin',
    'app',
    'dashboard',
  ];

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationDto): Promise<PaginatedResponse<any>> {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const include = {
      users: {
        where: { role: 'ADMIN' as const },
        select: { id: true, name: true, email: true },
      },
    };

    const [data, total] = await Promise.all([
      this.prisma.institution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include,
      }),
      this.prisma.institution.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id },
      include: {
        users: {
          where: { role: 'ADMIN' as const },
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!institution) {
      throw new NotFoundException(`Institution with ID "${id}" not found`);
    }

    return institution;
  }

  async create(data: CreateInstitutionDto) {
    const { admin, ...institutionData } = data;
    const slug = await this.generateUniqueSlug(institutionData.name);

    if (admin) {
      const hashedPassword = await bcrypt.hash(admin.password, 10);
      return this.prisma.$transaction(async (tx) => {
        const institution = await tx.institution.create({
          data: {
            ...institutionData,
            settings: institutionData.settings as any,
            slug,
          },
        });
        await tx.user.create({
          data: {
            name: admin.name,
            email: admin.email,
            password_hash: hashedPassword,
            role: 'ADMIN',
            institution_id: institution.id,
            must_change_password: true,
          },
        });
        const created = await tx.institution.findUnique({
          where: { id: institution.id },
          include: {
            users: {
              where: { role: 'ADMIN' as const },
              select: { id: true, name: true, email: true },
            },
          },
        });
        return created!;
      });
    }

    return this.prisma.institution.create({
      data: {
        ...institutionData,
        settings: institutionData.settings as any,
        slug,
      },
    });
  }

  async update(id: string, dto: UpdateInstitutionDto) {
    await this.findOne(id); // throws NotFoundException if not found

    const data: Record<string, unknown> = { ...dto };

    if (dto.name) {
      data.slug = await this.generateUniqueSlug(dto.name, id);
    }

    return this.prisma.institution.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    throw new ForbiddenException(
      'Institution deletion is not supported. Use deactivation instead.',
    );
  }

  // Public endpoint — no tenantId scoping needed (pre-authentication discovery).
  // settings is selected to extract registration_enabled; the full blob is never returned.
  async findBySlugPublic(slug: string): Promise<{
    name: string;
    slug: string;
    logo_url: string | null;
    description: string | null;
    brand_color: string | null;
    background_image_url: string | null;
    registration_enabled: boolean;
  }> {
    const institution = await this.prisma.institution.findFirst({
      where: { slug, is_active: true },
      select: {
        name: true,
        slug: true,
        logo_url: true,
        description: true,
        brand_color: true,
        background_image_url: true,
        settings: true,
      },
    });
    if (!institution) {
      throw new NotFoundException('Institution not found');
    }
    const settings = institution.settings as Record<string, any> | null;
    const registrationEnabled =
      settings?.registration?.student_enabled ?? false;
    return {
      name: institution.name,
      slug: institution.slug,
      logo_url: institution.logo_url,
      description: institution.description,
      brand_color: institution.brand_color,
      background_image_url: institution.background_image_url,
      registration_enabled: registrationEnabled,
    };
  }

  async getSummary(institutionId: string) {
    const [studentCount, tutorCount, adminCount, activeClassCount] =
      await Promise.all([
        this.prisma.student.count({ where: { institution_id: institutionId } }),
        this.prisma.tutor.count({ where: { institution_id: institutionId } }),
        this.prisma.user.count({
          where: { institution_id: institutionId, role: 'ADMIN' },
        }),
        this.prisma.class.count({
          where: { institution_id: institutionId, status: 'ACTIVE' },
        }),
      ]);
    return { studentCount, tutorCount, adminCount, activeClassCount };
  }

  private async generateUniqueSlug(
    name: string,
    excludeId?: string,
  ): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    if (InstitutionService.RESERVED_SLUGS.includes(baseSlug)) {
      throw new BadRequestException(
        `Institution name "${name}" generates a reserved slug "${baseSlug}". Please choose a different name.`,
      );
    }

    let slug = baseSlug;
    let suffix = 2;

    while (true) {
      const existing = await this.prisma.institution.findUnique({
        where: { slug },
      });

      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }

      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }
  }
}
