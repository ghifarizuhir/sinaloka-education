import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PaginationDto, buildPaginationMeta, PaginatedResponse } from '../../common/dto/pagination.dto.js';
import { CreateInstitutionDto, UpdateInstitutionDto } from './institution.dto.js';

@Injectable()
export class InstitutionService {
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

    const [data, total] = await Promise.all([
      this.prisma.institution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
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
    });

    if (!institution) {
      throw new NotFoundException(`Institution with ID "${id}" not found`);
    }

    return institution;
  }

  async create(dto: CreateInstitutionDto) {
    const slug = await this.generateUniqueSlug(dto.name);

    return this.prisma.institution.create({
      data: {
        name: dto.name,
        slug,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        logo_url: dto.logo_url,
        settings: dto.settings as any,
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
    await this.findOne(id); // throws NotFoundException if not found

    return this.prisma.institution.delete({
      where: { id },
    });
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
