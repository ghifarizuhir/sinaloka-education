import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PLAN_LIMITS } from '../../common/constants/plans.js';
import type { PlanType } from '../../../generated/prisma/client.js';
import type {
  UpgradeRequestDto,
  ReviewUpgradeRequestDto,
  UpdateInstitutionPlanDto,
  UpgradeRequestQueryDto,
} from './plan.dto.js';

@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlanInfo(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: {
        plan_type: true,
        plan_limit_reached_at: true,
        plan_changed_at: true,
      },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const planConfig = PLAN_LIMITS[institution.plan_type as PlanType];

    const [studentCount, tutorCount] = await Promise.all([
      this.prisma.student.count({
        where: { institution_id: institutionId, status: 'ACTIVE' },
      }),
      this.prisma.tutor.count({
        where: { institution_id: institutionId },
      }),
    ]);

    let gracePeriod = null;
    if (institution.plan_limit_reached_at) {
      const end = new Date(institution.plan_limit_reached_at);
      end.setDate(end.getDate() + planConfig.gracePeriodDays);
      const now = new Date();
      gracePeriod = {
        startedAt: institution.plan_limit_reached_at.toISOString(),
        endsAt: end.toISOString(),
        daysRemaining: Math.max(
          0,
          Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        ),
        expired: now > end,
      };
    }

    return {
      currentPlan: institution.plan_type,
      planConfig,
      usage: {
        students: { current: studentCount, limit: planConfig.maxStudents },
        tutors: { current: tutorCount, limit: planConfig.maxTutors },
      },
      gracePeriod,
      allPlans: PLAN_LIMITS,
      planChangedAt: institution.plan_changed_at,
    };
  }

  async requestUpgrade(institutionId: string, dto: UpgradeRequestDto) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { plan_type: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const currentOrder = PLAN_LIMITS[institution.plan_type as PlanType].order;
    const requestedOrder = PLAN_LIMITS[dto.requested_plan as PlanType].order;

    if (requestedOrder <= currentOrder) {
      throw new BadRequestException(
        'Requested plan must be higher than current plan',
      );
    }

    const existingPending = await this.prisma.upgradeRequest.findFirst({
      where: {
        institution_id: institutionId,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      throw new ConflictException(
        'You already have a pending upgrade request',
      );
    }

    return this.prisma.upgradeRequest.create({
      data: {
        institution_id: institutionId,
        current_plan: institution.plan_type,
        requested_plan: dto.requested_plan as PlanType,
        message: dto.message,
      },
    });
  }

  async getUpgradeRequests(query: UpgradeRequestQueryDto) {
    const where = query.status ? { status: query.status as any } : {};
    const skip = (query.page - 1) * query.limit;

    const [data, total] = await Promise.all([
      this.prisma.upgradeRequest.findMany({
        where,
        include: {
          institution: {
            select: { id: true, name: true, plan_type: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.upgradeRequest.count({ where }),
    ]);

    return { data, total, page: query.page, limit: query.limit };
  }

  async reviewUpgradeRequest(
    requestId: string,
    reviewerId: string,
    dto: ReviewUpgradeRequestDto,
  ) {
    const upgradeRequest = await this.prisma.upgradeRequest.findUnique({
      where: { id: requestId },
    });

    if (!upgradeRequest) {
      throw new NotFoundException('Upgrade request not found');
    }

    if (upgradeRequest.status !== 'PENDING') {
      throw new BadRequestException('This request has already been reviewed');
    }

    if (dto.status === 'APPROVED') {
      const [updated] = await this.prisma.$transaction([
        this.prisma.upgradeRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            reviewed_by: reviewerId,
            reviewed_at: new Date(),
            review_notes: dto.review_notes,
          },
        }),
        this.prisma.institution.update({
          where: { id: upgradeRequest.institution_id },
          data: {
            plan_type: upgradeRequest.requested_plan,
            plan_changed_at: new Date(),
            plan_limit_reached_at: null,
          },
        }),
      ]);
      return updated;
    }

    return this.prisma.upgradeRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
        review_notes: dto.review_notes,
      },
    });
  }

  async updateInstitutionPlan(
    institutionId: string,
    dto: UpdateInstitutionPlanDto,
  ) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { plan_type: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const newPlan = PLAN_LIMITS[dto.plan_type as PlanType];
    let planLimitReachedAt: Date | null = null;

    if (newPlan.maxStudents !== null || newPlan.maxTutors !== null) {
      const [studentCount, tutorCount] = await Promise.all([
        this.prisma.student.count({
          where: { institution_id: institutionId, status: 'ACTIVE' },
        }),
        this.prisma.tutor.count({
          where: { institution_id: institutionId },
        }),
      ]);

      const exceedsStudents =
        newPlan.maxStudents !== null && studentCount >= newPlan.maxStudents;
      const exceedsTutors =
        newPlan.maxTutors !== null && tutorCount >= newPlan.maxTutors;

      if (exceedsStudents || exceedsTutors) {
        planLimitReachedAt = new Date();
      }
    }

    return this.prisma.institution.update({
      where: { id: institutionId },
      data: {
        plan_type: dto.plan_type as PlanType,
        plan_changed_at: new Date(),
        plan_limit_reached_at: planLimitReachedAt,
      },
    });
  }
}
