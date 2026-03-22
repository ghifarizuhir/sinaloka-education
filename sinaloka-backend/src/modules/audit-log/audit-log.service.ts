import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { AuditLogQueryDto } from './dto/audit-log.dto.js';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(institutionId: string | null, query: AuditLogQueryDto) {
    const { page, limit, action, resource_type, user_id, date_from, date_to, sort_order } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (institutionId) {
      where.institution_id = institutionId;
    }

    if (action) where.action = action;
    if (resource_type) where.resource_type = resource_type;
    if (user_id) where.user_id = user_id;

    if (date_from || date_to) {
      where.created_at = {
        ...(date_from && { gte: date_from }),
        ...(date_to && { lte: date_to }),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: sort_order },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          institution: { select: { id: true, name: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, institutionId: string | null) {
    const where: Record<string, unknown> = { id };
    if (institutionId) {
      where.institution_id = institutionId;
    }

    return this.prisma.auditLog.findFirst({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        institution: { select: { id: true, name: true } },
      },
    });
  }
}
