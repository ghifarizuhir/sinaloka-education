import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';

interface SubscriptionWarning {
  type: 'EXPIRED' | 'DOWNGRADE_PENDING' | 'GRACE_PERIOD' | 'EXPIRING_SOON';
  grace_ends_at?: string;
  days_remaining?: number;
}

interface SubscriptionGuardRequest {
  user?: JwtPayload;
  tenantId?: string;
  _subscriptionWarning?: SubscriptionWarning;
}

@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<SubscriptionGuardRequest>();
    const user = request.user;

    if (!user || user.role === 'SUPER_ADMIN' || !user.institutionId) {
      return true;
    }

    const tenantId = user.institutionId;

    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          institution_id: tenantId,
          status: { in: ['ACTIVE', 'GRACE_PERIOD'] },
        },
        orderBy: { created_at: 'desc' },
      });

      if (!subscription) {
        // No subscription means STARTER plan — skip
        return true;
      }

      const now = new Date();

      if (subscription.status === 'ACTIVE' && now > subscription.expires_at) {
        const graceEndsAt = new Date(subscription.expires_at);
        graceEndsAt.setDate(graceEndsAt.getDate() + 7);
        request._subscriptionWarning = {
          type: 'EXPIRED',
          grace_ends_at: graceEndsAt.toISOString(),
        };
      } else if (
        subscription.status === 'GRACE_PERIOD' &&
        subscription.grace_ends_at &&
        now > subscription.grace_ends_at
      ) {
        request._subscriptionWarning = {
          type: 'DOWNGRADE_PENDING',
        };
      } else if (subscription.status === 'GRACE_PERIOD') {
        const graceEndsAt =
          subscription.grace_ends_at ?? subscription.expires_at;
        const msRemaining = graceEndsAt.getTime() - now.getTime();
        const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
        request._subscriptionWarning = {
          type: 'GRACE_PERIOD',
          days_remaining: daysRemaining,
        };
      } else if (
        subscription.status === 'ACTIVE' &&
        now <= subscription.expires_at
      ) {
        const msRemaining = subscription.expires_at.getTime() - now.getTime();
        const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 7) {
          request._subscriptionWarning = {
            type: 'EXPIRING_SOON',
            days_remaining: daysRemaining,
          };
        }
      }
    } catch (error) {
      // Gracefully skip if subscription table doesn't exist yet (migration not applied)
      this.logger.warn(
        'Subscription guard skipped: ' + (error as Error).message,
      );
    }

    return true;
  }
}
