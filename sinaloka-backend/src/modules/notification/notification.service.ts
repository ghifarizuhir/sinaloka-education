import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { ListNotificationsDto } from './dto/notification.dto.js';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: {
    institutionId: string;
    userId?: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    try {
      return await this.prisma.notification.create({
        data: {
          institution_id: data.institutionId,
          user_id: data.userId ?? null,
          type: data.type,
          title: data.title,
          body: data.body,
          data: data.data ? (data.data as object) : undefined,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create notification', error);
      return null;
    }
  }

  async findAll(
    institutionId: string,
    userId: string,
    dto: ListNotificationsDto,
    role?: string,
  ) {
    const userFilter =
      role === 'PARENT'
        ? { user_id: userId }
        : { OR: [{ user_id: null }, { user_id: userId }] };
    const where: any = {
      institution_id: institutionId,
      ...userFilter,
    };
    if (dto.type) where.type = dto.type;
    if (dto.unread) where.read_at = null;

    const [notifications, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page: dto.page,
        limit: dto.limit,
        totalPages: Math.ceil(total / dto.limit),
      },
    };
  }

  async getUnreadCount(institutionId: string, userId: string, role?: string) {
    const userFilter =
      role === 'PARENT'
        ? { user_id: userId }
        : { OR: [{ user_id: null }, { user_id: userId }] };
    return this.prisma.notification.count({
      where: {
        institution_id: institutionId,
        read_at: null,
        ...userFilter,
      },
    });
  }

  async markAsRead(
    id: string,
    institutionId: string,
    userId: string,
    role?: string,
  ) {
    const userFilter =
      role === 'PARENT'
        ? { user_id: userId }
        : { OR: [{ user_id: null }, { user_id: userId }] };
    return this.prisma.notification.update({
      where: {
        id,
        institution_id: institutionId,
        ...userFilter,
      },
      data: { read_at: new Date() },
    });
  }

  async markAllAsRead(institutionId: string, userId: string, role?: string) {
    const userFilter =
      role === 'PARENT'
        ? { user_id: userId }
        : { OR: [{ user_id: null }, { user_id: userId }] };
    return this.prisma.notification.updateMany({
      where: {
        institution_id: institutionId,
        read_at: null,
        ...userFilter,
      },
      data: { read_at: new Date() },
    });
  }
}
