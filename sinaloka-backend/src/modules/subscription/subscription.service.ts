import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PLAN_LIMITS } from '../../common/constants/plans.js';
import {
  SUBSCRIPTION_DURATION_DAYS,
  GRACE_PERIOD_DAYS,
} from './subscription.constants.js';
import type {
  PlanType,
  SubscriptionStatus,
} from '../../../generated/prisma/client.js';
import type { SubscriptionQueryDto } from './dto/subscription-query.dto.js';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveSubscription(institutionId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        institution_id: institutionId,
        status: { in: ['ACTIVE', 'GRACE_PERIOD'] },
      },
      include: {
        payments: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });
  }

  async getStatus(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { plan_type: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const planConfig = PLAN_LIMITS[institution.plan_type];

    if (institution.plan_type === 'STARTER') {
      return {
        plan_type: institution.plan_type,
        plan_config: planConfig,
        subscription: null,
      };
    }

    const subscription = await this.getActiveSubscription(institutionId);

    let subscriptionDetails: {
      id: string;
      status: SubscriptionStatus;
      started_at: Date;
      expires_at: Date;
      grace_ends_at: Date | null;
      days_remaining: number;
      last_payment: NonNullable<typeof subscription>['payments'][0] | null;
    } | null = null;

    if (subscription) {
      const now = new Date();
      const expiresAt = new Date(subscription.expires_at);
      const daysRemaining = Math.max(
        0,
        Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );

      subscriptionDetails = {
        id: subscription.id,
        status: subscription.status,
        started_at: subscription.started_at,
        expires_at: subscription.expires_at,
        grace_ends_at: subscription.grace_ends_at,
        days_remaining: daysRemaining,
        last_payment: subscription.payments[0] ?? null,
      };
    }

    return {
      plan_type: institution.plan_type,
      plan_config: planConfig,
      subscription: subscriptionDetails,
    };
  }

  async activateSubscription(
    institutionId: string,
    planType: PlanType,
    type: 'new' | 'renewal',
  ): Promise<string> {
    const now = new Date();

    if (type === 'renewal') {
      return this.prisma.$transaction(async (tx) => {
        const existing = await tx.subscription.findFirst({
          where: {
            institution_id: institutionId,
            status: { in: ['ACTIVE', 'GRACE_PERIOD'] },
          },
        });

        let startDate: Date;
        if (existing) {
          const oldExpires = new Date(existing.expires_at);
          startDate = oldExpires > now ? oldExpires : now;
        } else {
          startDate = now;
        }

        const expiresAt = new Date(startDate);
        expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_DURATION_DAYS);

        const graceEndsAt = new Date(expiresAt);
        graceEndsAt.setDate(graceEndsAt.getDate() + GRACE_PERIOD_DAYS);

        let subscription: { id: string };
        if (existing) {
          subscription = await tx.subscription.update({
            where: { id: existing.id },
            data: {
              expires_at: expiresAt,
              grace_ends_at: graceEndsAt,
              status: 'ACTIVE',
            },
          });
        } else {
          subscription = await tx.subscription.create({
            data: {
              institution_id: institutionId,
              plan_type: planType,
              status: 'ACTIVE',
              started_at: now,
              expires_at: expiresAt,
              grace_ends_at: graceEndsAt,
            },
          });
        }

        await tx.institution.update({
          where: { id: institutionId },
          data: {
            plan_type: planType,
            plan_limit_reached_at: null,
            plan_changed_at: now,
          },
        });

        return subscription.id;
      });
    } else {
      // type === 'new'
      return this.prisma.$transaction(async (tx) => {
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_DURATION_DAYS);

        const graceEndsAt = new Date(expiresAt);
        graceEndsAt.setDate(graceEndsAt.getDate() + GRACE_PERIOD_DAYS);

        // Cancel any existing active subscriptions BEFORE creating the new one
        // to avoid unique index violations
        await tx.subscription.updateMany({
          where: {
            institution_id: institutionId,
            status: { in: ['ACTIVE', 'GRACE_PERIOD'] },
          },
          data: {
            status: 'CANCELLED',
            cancelled_at: now,
            cancelled_reason: 'Replaced by new subscription',
          },
        });

        const subscription = await tx.subscription.create({
          data: {
            institution_id: institutionId,
            plan_type: planType,
            status: 'ACTIVE',
            started_at: now,
            expires_at: expiresAt,
            grace_ends_at: graceEndsAt,
          },
        });

        await tx.institution.update({
          where: { id: institutionId },
          data: {
            plan_type: planType,
            plan_limit_reached_at: null,
            plan_changed_at: now,
          },
        });

        return subscription.id;
      });
    }
  }

  async overrideSubscription(
    subscriptionId: string,
    data: {
      plan_type?: PlanType;
      expires_at?: Date;
      status?: SubscriptionStatus;
      notes?: string;
    },
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const now = new Date();
    const updateData: Record<string, unknown> = {};

    if (data.plan_type) {
      updateData['plan_type'] = data.plan_type;
    }
    if (data.expires_at) {
      updateData['expires_at'] = data.expires_at;
      updateData['grace_ends_at'] = null;
    }
    if (data.status) {
      updateData['status'] = data.status;
      if (data.status === 'CANCELLED') {
        updateData['cancelled_at'] = now;
        updateData['cancelled_reason'] = data.notes ?? 'Cancelled by admin';
      }
    }

    const shouldUpdateInstitution =
      data.plan_type && data.plan_type !== subscription.plan_type;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id: subscriptionId },
        data: updateData,
      });

      if (shouldUpdateInstitution) {
        await tx.institution.update({
          where: { id: subscription.institution_id },
          data: {
            plan_type: data.plan_type!,
            plan_changed_at: now,
          },
        });
      }

      return updated;
    });
  }

  async listSubscriptions(query: SubscriptionQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.status) where['status'] = query.status;
    if (query.plan_type) where['plan_type'] = query.plan_type;
    if (query.institution_id) where['institution_id'] = query.institution_id;

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: {
          institution: {
            select: { id: true, name: true },
          },
          payments: {
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async getStats() {
    const now = new Date();
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const [planCounts, expiringSoon, pendingPaymentsCount, monthlyRevenue] =
      await Promise.all([
        this.prisma.institution.groupBy({
          by: ['plan_type'],
          _count: { id: true },
        }),
        this.prisma.subscription.count({
          where: {
            status: 'ACTIVE',
            expires_at: {
              gte: now,
              lte: sevenDaysLater,
            },
          },
        }),
        this.prisma.subscriptionPayment.count({
          where: { status: 'PENDING' },
        }),
        this.prisma.subscriptionPayment.aggregate({
          where: {
            status: 'PAID',
            paid_at: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          _sum: { amount: true },
        }),
      ]);

    return {
      planCounts: planCounts.map((p) => ({
        plan_type: p.plan_type,
        count: p._count.id,
      })),
      expiringSoon,
      pendingPayments: pendingPaymentsCount,
      monthlyRevenue: monthlyRevenue._sum.amount ?? 0,
    };
  }

  async getInvoices(institutionId: string) {
    return this.prisma.subscriptionInvoice.findMany({
      where: { institution_id: institutionId },
      include: {
        payment: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
