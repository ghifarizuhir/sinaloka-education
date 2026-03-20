import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  PLAN_FEATURE_KEY,
  PLAN_LIMIT_KEY,
} from '../decorators/plan.decorator.js';
import { PLAN_LIMITS } from '../constants/plans.js';
import type { PlanFeatureKey, PlanLimitResource } from '../constants/plans.js';
import type { JwtPayload } from '../decorators/current-user.decorator.js';
import type { PlanType } from '../../../generated/prisma/client.js';

interface PlanGuardRequest {
  user: JwtPayload;
  _planWarning?: {
    type: string;
    resource: string;
    current: number;
    limit: number;
    gracePeriodEnds: string;
    message: string;
  };
}

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<PlanFeatureKey>(
      PLAN_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    const limitResource = this.reflector.getAllAndOverride<PlanLimitResource>(
      PLAN_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!featureKey && !limitResource) {
      return true;
    }

    const request = context.switchToHttp().getRequest<PlanGuardRequest>();
    const user: JwtPayload = request.user;

    if (!user?.institutionId) {
      return true;
    }

    const institution = await this.prisma.institution.findUnique({
      where: { id: user.institutionId },
      select: {
        plan_type: true,
        plan_limit_reached_at: true,
      },
    });

    if (!institution) {
      return true;
    }

    const planConfig = PLAN_LIMITS[institution.plan_type];

    if (featureKey) {
      if (!planConfig.features[featureKey]) {
        const requiredPlan = this.getRequiredPlanForFeature(featureKey);
        throw new ForbiddenException(
          `Fitur ini membutuhkan plan ${requiredPlan}. Upgrade plan Anda untuk mengakses fitur ini.`,
        );
      }
    }

    if (limitResource) {
      await this.enforcePlanLimit(
        institution.plan_type,
        institution.plan_limit_reached_at,
        user.institutionId,
        limitResource,
        planConfig,
        request,
      );
    }

    return true;
  }

  private async enforcePlanLimit(
    planType: PlanType,
    limitReachedAt: Date | null,
    institutionId: string,
    resource: PlanLimitResource,
    planConfig: (typeof PLAN_LIMITS)[PlanType],
    request: PlanGuardRequest,
  ) {
    const maxLimit =
      resource === 'students' ? planConfig.maxStudents : planConfig.maxTutors;

    if (maxLimit === null) {
      return;
    }

    const count = await this.getResourceCount(institutionId, resource);

    if (count < maxLimit) {
      if (limitReachedAt) {
        await this.prisma.institution.update({
          where: { id: institutionId },
          data: { plan_limit_reached_at: null },
        });
      }
      return;
    }

    const now = new Date();

    if (!limitReachedAt) {
      await this.prisma.institution.update({
        where: { id: institutionId },
        data: { plan_limit_reached_at: now },
      });
      limitReachedAt = now;
    }

    const gracePeriodEnd = new Date(limitReachedAt);
    gracePeriodEnd.setDate(
      gracePeriodEnd.getDate() + planConfig.gracePeriodDays,
    );

    if (now > gracePeriodEnd) {
      throw new ForbiddenException({
        message: `Batas ${maxLimit} ${resource === 'students' ? 'murid' : 'tutor'} telah tercapai dan masa tenggang telah habis. Upgrade plan untuk menambah kapasitas.`,
        code: 'PLAN_LIMIT_EXCEEDED',
        resource,
        current: count,
        limit: maxLimit,
        planType,
      });
    }

    request._planWarning = {
      type: 'plan_limit_reached',
      resource,
      current: count,
      limit: maxLimit,
      gracePeriodEnds: gracePeriodEnd.toISOString(),
      message: `Anda telah mencapai batas ${maxLimit} ${resource === 'students' ? 'murid' : 'tutor'}. Upgrade plan untuk menambah kapasitas.`,
    };
  }

  private async getResourceCount(
    institutionId: string,
    resource: PlanLimitResource,
  ): Promise<number> {
    if (resource === 'students') {
      return this.prisma.student.count({
        where: { institution_id: institutionId, status: 'ACTIVE' },
      });
    }
    return this.prisma.tutor.count({
      where: { institution_id: institutionId },
    });
  }

  private getRequiredPlanForFeature(feature: PlanFeatureKey): string {
    for (const [, config] of Object.entries(PLAN_LIMITS)) {
      if (config.features[feature]) {
        return config.label;
      }
    }
    return 'Business';
  }
}
