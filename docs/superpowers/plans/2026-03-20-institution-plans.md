# Institution Plans & Tier System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 3-tier plan system (Starter/Growth/Business) for institutions with limit enforcement, feature gating, upgrade requests, and SUPER_ADMIN management.

**Architecture:** Plan tiers are hardcoded constants in the backend. A `plan_type` enum column on `Institution` determines the active plan. A `PlanGuard` enforces limits (students/tutors) and feature access via decorators. Upgrade requests are stored in a new `UpgradeRequest` table. Frontend displays plan info in sidebar, navbar, a dedicated pricing page, and warning banners.

**Tech Stack:** NestJS, Prisma, PostgreSQL, React, TanStack Query, TailwindCSS v4, Zod, i18n

**Spec:** `docs/superpowers/specs/2026-03-20-institution-plans-design.md`

---

## File Structure

### Backend — New Files
- `src/common/constants/plans.ts` — Plan tier config (limits, features, pricing)
- `src/common/decorators/plan.decorator.ts` — `@PlanLimit()` and `@PlanFeature()` decorators
- `src/common/guards/plan.guard.ts` — Guard that enforces plan limits and features
- `src/common/interceptors/plan-warning.interceptor.ts` — Surfaces `_warning` in response body
- `src/modules/plan/plan.module.ts` — Plan module
- `src/modules/plan/plan.controller.ts` — Plan endpoints (admin + super admin)
- `src/modules/plan/plan.service.ts` — Plan business logic
- `src/modules/plan/plan.dto.ts` — Zod schemas for plan endpoints

### Backend — Modified Files
- `prisma/schema.prisma` — Add `PlanType` enum, `UpgradeRequest` model, fields on `Institution`
- `src/app.module.ts` — Register `PlanModule` and `PlanGuard`
- `src/modules/student/student.controller.ts` — Add `@PlanLimit('students')` on create/import
- `src/modules/tutor/tutor.controller.ts` — Add `@PlanLimit('tutors')` on create

### Frontend — New Files
- `src/services/plan.service.ts` — API calls for plan endpoints
- `src/hooks/usePlan.ts` — TanStack Query hooks for plan data
- `src/types/plan.ts` — TypeScript types for plan
- `src/pages/Settings/tabs/PlansTab.tsx` — Plans & Pricing page (3 cards)
- `src/components/PlanWarningBanner.tsx` — Warning banner component
- `src/components/FeatureLock.tsx` — Feature lock overlay for gated features
- `src/pages/SuperAdmin/UpgradeRequests.tsx` — SUPER_ADMIN upgrade request management

### Frontend — Modified Files
- `src/components/Layout.tsx` — Replace mock "Pro Plan" with real data
- `src/pages/Settings/index.tsx` — Add Plans tab
- `src/pages/SuperAdmin/Institutions.tsx` — Add Plan column
- `src/pages/SuperAdmin/InstitutionDetail.tsx` — Add Plan Management tab
- `src/components/SuperAdminLayout.tsx` — Add Upgrade Requests nav item
- `src/App.tsx` — Add upgrade-requests route
- `src/lib/api.ts` — Add `_warning` interceptor for plan warnings
- `src/locales/en.json` — Add plan-related strings
- `src/locales/id.json` — Add plan-related strings (Indonesian)

---

## Task 1: Database Schema & Migration

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`

- [ ] **Step 1: Add PlanType enum and UpgradeRequest model to schema**

In `prisma/schema.prisma`, add enums after existing enums:

```prisma
enum PlanType {
  STARTER
  GROWTH
  BUSINESS
}

enum UpgradeRequestStatus {
  PENDING
  APPROVED
  REJECTED
}
```

Add fields to `Institution` model (after `default_language`):

```prisma
  plan_type              PlanType  @default(STARTER)
  plan_limit_reached_at  DateTime?
  plan_changed_at        DateTime?
```

Add relation to `Institution` model (in the relations section):

```prisma
  upgrade_requests  UpgradeRequest[]
```

Add new model after `Institution`:

```prisma
model UpgradeRequest {
  id              String               @id @default(uuid())
  institution_id  String
  institution     Institution          @relation(fields: [institution_id], references: [id])
  current_plan    PlanType
  requested_plan  PlanType
  status          UpgradeRequestStatus @default(PENDING)
  message         String?
  review_notes    String?
  reviewed_by     String?
  reviewed_at     DateTime?
  created_at      DateTime             @default(now())
  updated_at      DateTime             @updatedAt

  @@index([status])
  @@index([institution_id])
  @@map("upgrade_requests")
}
```

- [ ] **Step 2: Run migration**

```bash
cd sinaloka-backend
npx prisma migrate dev --name add-institution-plans
```

Expected: Migration created and applied successfully.

- [ ] **Step 3: Regenerate Prisma client**

```bash
npm run prisma:generate
```

- [ ] **Step 4: Verify migration**

```bash
npx prisma db pull --print | grep -A5 "plan_type"
```

Expected: See `plan_type` column with default `STARTER`.

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "feat(backend): add plan system schema — PlanType enum, UpgradeRequest model, plan fields on Institution"
```

---

## Task 2: Plan Constants & Types

**Files:**
- Create: `sinaloka-backend/src/common/constants/plans.ts`

- [ ] **Step 1: Create plan constants file**

```ts
import type { PlanType } from '../../../generated/prisma/client.js';

export interface PlanFeatures {
  whatsappNotification: boolean;
  advancedReporting: boolean;
  multiBranch: boolean;
}

export interface PlanConfig {
  label: string;
  maxStudents: number | null; // null = unlimited
  maxTutors: number | null;   // null = unlimited
  features: PlanFeatures;
  price: number | null;       // null = free
  priceDisplay: string;
  gracePeriodDays: number;
  order: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanConfig> = {
  STARTER: {
    label: 'Starter',
    maxStudents: 30,
    maxTutors: 5,
    features: {
      whatsappNotification: false,
      advancedReporting: false,
      multiBranch: false,
    },
    price: null,
    priceDisplay: 'Gratis',
    gracePeriodDays: 7,
    order: 0,
  },
  GROWTH: {
    label: 'Growth',
    maxStudents: 200,
    maxTutors: 20,
    features: {
      whatsappNotification: true,
      advancedReporting: true,
      multiBranch: false,
    },
    price: 150000,
    priceDisplay: 'Rp 150.000/bulan',
    gracePeriodDays: 7,
    order: 1,
  },
  BUSINESS: {
    label: 'Business',
    maxStudents: null,
    maxTutors: null,
    features: {
      whatsappNotification: true,
      advancedReporting: true,
      multiBranch: true,
    },
    price: 500000,
    priceDisplay: 'Rp 500.000/bulan',
    gracePeriodDays: 7,
    order: 2,
  },
};

export type PlanFeatureKey = keyof PlanFeatures;
export type PlanLimitResource = 'students' | 'tutors';
```

- [ ] **Step 2: Commit**

```bash
git add src/common/constants/plans.ts
git commit -m "feat(backend): add plan tier constants and types"
```

---

## Task 3: Plan Decorators

**Files:**
- Create: `sinaloka-backend/src/common/decorators/plan.decorator.ts`

- [ ] **Step 1: Create plan decorators**

```ts
import { SetMetadata } from '@nestjs/common';
import type { PlanFeatureKey, PlanLimitResource } from '../constants/plans.js';

export const PLAN_FEATURE_KEY = 'plan_feature';
export const PLAN_LIMIT_KEY = 'plan_limit';

export const PlanFeature = (feature: PlanFeatureKey) =>
  SetMetadata(PLAN_FEATURE_KEY, feature);

export const PlanLimit = (resource: PlanLimitResource) =>
  SetMetadata(PLAN_LIMIT_KEY, resource);
```

- [ ] **Step 2: Commit**

```bash
git add src/common/decorators/plan.decorator.ts
git commit -m "feat(backend): add @PlanFeature and @PlanLimit decorators"
```

---

## Task 4: Plan Guard

**Files:**
- Create: `sinaloka-backend/src/common/guards/plan.guard.ts`

- [ ] **Step 1: Create plan guard**

```ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service.js';
import { PLAN_FEATURE_KEY, PLAN_LIMIT_KEY } from '../decorators/plan.decorator.js';
import { PLAN_LIMITS } from '../constants/plans.js';
import type { PlanFeatureKey, PlanLimitResource } from '../constants/plans.js';
import type { JwtPayload } from '../decorators/current-user.decorator.js';
import type { PlanType } from '../../../generated/prisma/client.js';

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

    // No plan decorator on this route — skip
    if (!featureKey && !limitResource) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user?.institutionId) {
      return true; // SUPER_ADMIN without institution context — skip
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

    const planConfig = PLAN_LIMITS[institution.plan_type as PlanType];

    // Feature gating
    if (featureKey) {
      if (!planConfig.features[featureKey]) {
        const requiredPlan = this.getRequiredPlanForFeature(featureKey);
        throw new ForbiddenException(
          `Fitur ini membutuhkan plan ${requiredPlan}. Upgrade plan Anda untuk mengakses fitur ini.`,
        );
      }
    }

    // Limit enforcement
    if (limitResource) {
      await this.enforcePlanLimit(
        institution.plan_type as PlanType,
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
    request: any,
  ) {
    const maxLimit =
      resource === 'students' ? planConfig.maxStudents : planConfig.maxTutors;

    // null = unlimited
    if (maxLimit === null) {
      return;
    }

    const count = await this.getResourceCount(institutionId, resource);

    if (count < maxLimit) {
      // Under limit — reset plan_limit_reached_at if it was set
      if (limitReachedAt) {
        await this.prisma.institution.update({
          where: { id: institutionId },
          data: { plan_limit_reached_at: null },
        });
      }
      return;
    }

    // At or over limit
    const now = new Date();

    if (!limitReachedAt) {
      // First time hitting limit — start grace period
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
      // Grace period expired
      throw new ForbiddenException({
        message: `Batas ${maxLimit} ${resource === 'students' ? 'murid' : 'tutor'} telah tercapai dan masa tenggang telah habis. Upgrade plan untuk menambah kapasitas.`,
        code: 'PLAN_LIMIT_EXCEEDED',
        resource,
        current: count,
        limit: maxLimit,
        planType,
      });
    }

    // Within grace period — allow but add warning to request
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
```

- [ ] **Step 2: Register PlanGuard globally in `app.module.ts`**

In `sinaloka-backend/src/app.module.ts`, add import:

```ts
import { PlanGuard } from './common/guards/plan.guard.js';
```

Add to providers array (after RolesGuard):

```ts
{
  provide: APP_GUARD,
  useClass: PlanGuard,
},
```

- [ ] **Step 3: Commit**

```bash
git add src/common/guards/plan.guard.ts src/app.module.ts
git commit -m "feat(backend): add PlanGuard with limit enforcement and feature gating"
```

---

## Task 5: Plan Warning Interceptor

**Files:**
- Create: `sinaloka-backend/src/common/interceptors/plan-warning.interceptor.ts`
- Modify: `sinaloka-backend/src/app.module.ts`

- [ ] **Step 1: Create plan warning interceptor**

This interceptor reads `request._planWarning` (set by PlanGuard) and adds it to the response body.

```ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class PlanWarningInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data) => {
        if (request._planWarning) {
          return {
            ...data,
            _warning: request._planWarning,
          };
        }
        return data;
      }),
    );
  }
}
```

- [ ] **Step 2: Register interceptor globally in `app.module.ts`**

Add import:

```ts
import { PlanWarningInterceptor } from './common/interceptors/plan-warning.interceptor.js';
```

Add to providers array (after TenantInterceptor):

```ts
{
  provide: APP_INTERCEPTOR,
  useClass: PlanWarningInterceptor,
},
```

- [ ] **Step 3: Commit**

```bash
git add src/common/interceptors/plan-warning.interceptor.ts src/app.module.ts
git commit -m "feat(backend): add PlanWarningInterceptor to surface plan limit warnings in response body"
```

---

## Task 6: Plan Module — Service

**Files:**
- Create: `sinaloka-backend/src/modules/plan/plan.service.ts`
- Create: `sinaloka-backend/src/modules/plan/plan.dto.ts`

- [ ] **Step 1: Create plan DTOs**

```ts
import { z } from 'zod';

export const UpgradeRequestSchema = z.object({
  requested_plan: z.enum(['GROWTH', 'BUSINESS']),
  message: z.string().max(500).optional(),
});

export type UpgradeRequestDto = z.infer<typeof UpgradeRequestSchema>;

export const ReviewUpgradeRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  review_notes: z.string().max(500).optional(),
});

export type ReviewUpgradeRequestDto = z.infer<typeof ReviewUpgradeRequestSchema>;

export const UpdateInstitutionPlanSchema = z.object({
  plan_type: z.enum(['STARTER', 'GROWTH', 'BUSINESS']),
});

export type UpdateInstitutionPlanDto = z.infer<typeof UpdateInstitutionPlanSchema>;

export const UpgradeRequestQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type UpgradeRequestQueryDto = z.infer<typeof UpgradeRequestQuerySchema>;
```

- [ ] **Step 2: Create plan service**

```ts
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

    // Grace period info
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

    // Check for existing pending request
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
      // Approve: update request + change institution plan
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
            plan_limit_reached_at: null, // reset grace period
          },
        }),
      ]);
      return updated;
    }

    // Reject
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

    // Check if downgrading and usage exceeds new limit
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
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/plan/
git commit -m "feat(backend): add PlanService with plan info, upgrade requests, and plan management"
```

---

## Task 7: Plan Module — Controller & Module

**Files:**
- Create: `sinaloka-backend/src/modules/plan/plan.controller.ts`
- Create: `sinaloka-backend/src/modules/plan/plan.module.ts`
- Modify: `sinaloka-backend/src/app.module.ts`

- [ ] **Step 1: Create plan controller**

```ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { PlanService } from './plan.service.js';
import {
  UpgradeRequestSchema,
  ReviewUpgradeRequestSchema,
  UpdateInstitutionPlanSchema,
  UpgradeRequestQuerySchema,
} from './plan.dto.js';
import type {
  UpgradeRequestDto,
  ReviewUpgradeRequestDto,
  UpdateInstitutionPlanDto,
  UpgradeRequestQueryDto,
} from './plan.dto.js';

@Controller('admin/plan')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  async getPlanInfo(@CurrentUser() user: JwtPayload) {
    return this.planService.getPlanInfo(user.institutionId!);
  }

  @Post('upgrade-request')
  async requestUpgrade(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpgradeRequestSchema)) dto: UpgradeRequestDto,
  ) {
    return this.planService.requestUpgrade(user.institutionId!, dto);
  }

  @Get('upgrade-requests')
  @Roles(Role.SUPER_ADMIN)
  async getUpgradeRequests(
    @Query(new ZodValidationPipe(UpgradeRequestQuerySchema))
    query: UpgradeRequestQueryDto,
  ) {
    return this.planService.getUpgradeRequests(query);
  }

  @Patch('upgrade-requests/:id')
  @Roles(Role.SUPER_ADMIN)
  async reviewUpgradeRequest(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(ReviewUpgradeRequestSchema))
    dto: ReviewUpgradeRequestDto,
  ) {
    return this.planService.reviewUpgradeRequest(id, user.userId, dto);
  }

  @Patch('institutions/:id')
  @Roles(Role.SUPER_ADMIN)
  async updateInstitutionPlan(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateInstitutionPlanSchema))
    dto: UpdateInstitutionPlanDto,
  ) {
    return this.planService.updateInstitutionPlan(id, dto);
  }
}
```

- [ ] **Step 2: Create plan module**

```ts
import { Module } from '@nestjs/common';
import { PlanController } from './plan.controller.js';
import { PlanService } from './plan.service.js';

@Module({
  controllers: [PlanController],
  providers: [PlanService],
  exports: [PlanService],
})
export class PlanModule {}
```

- [ ] **Step 3: Register PlanModule in app.module.ts**

Add import:

```ts
import { PlanModule } from './modules/plan/plan.module.js';
```

Add to `imports` array (after `SettingsModule`):

```ts
PlanModule,
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/plan/ src/app.module.ts
git commit -m "feat(backend): add PlanController with admin and super-admin endpoints"
```

---

## Task 8: Apply Plan Decorators to Student & Tutor Controllers

**Files:**
- Modify: `sinaloka-backend/src/modules/student/student.controller.ts`
- Modify: `sinaloka-backend/src/modules/tutor/tutor.controller.ts`

- [ ] **Step 1: Add @PlanLimit to StudentController**

In `student.controller.ts`, add import:

```ts
import { PlanLimit } from '../../common/decorators/plan.decorator.js';
```

Add `@PlanLimit('students')` decorator to the `create` method (before `@Post()`):

```ts
@PlanLimit('students')
@Post()
async create(
```

Add `@PlanLimit('students')` decorator to the `importCsv` method (before `@Post('import')`):

```ts
@PlanLimit('students')
@Post('import')
```

- [ ] **Step 2: Add @PlanLimit to TutorController**

In `tutor.controller.ts`, add import:

```ts
import { PlanLimit } from '../../common/decorators/plan.decorator.js';
```

Add `@PlanLimit('tutors')` decorator to the `create` method:

```ts
@PlanLimit('tutors')
@Post()
async create(
```

- [ ] **Step 3: Verify backend compiles**

```bash
cd sinaloka-backend
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/modules/student/student.controller.ts src/modules/tutor/tutor.controller.ts
git commit -m "feat(backend): apply @PlanLimit decorators to student and tutor creation endpoints"
```

---

## Task 9: Frontend — Plan Types & Service

**Files:**
- Create: `sinaloka-platform/src/types/plan.ts`
- Create: `sinaloka-platform/src/services/plan.service.ts`
- Create: `sinaloka-platform/src/hooks/usePlan.ts`

- [ ] **Step 1: Create plan types**

```ts
export type PlanType = 'STARTER' | 'GROWTH' | 'BUSINESS';

export interface PlanFeatures {
  whatsappNotification: boolean;
  advancedReporting: boolean;
  multiBranch: boolean;
}

export interface PlanConfig {
  label: string;
  maxStudents: number | null;
  maxTutors: number | null;
  features: PlanFeatures;
  price: number | null;
  priceDisplay: string;
  gracePeriodDays: number;
  order: number;
}

export interface PlanUsage {
  current: number;
  limit: number | null;
}

export interface GracePeriod {
  startedAt: string;
  endsAt: string;
  daysRemaining: number;
  expired: boolean;
}

export interface PlanInfo {
  currentPlan: PlanType;
  planConfig: PlanConfig;
  usage: {
    students: PlanUsage;
    tutors: PlanUsage;
  };
  gracePeriod: GracePeriod | null;
  allPlans: Record<PlanType, PlanConfig>;
  planChangedAt: string | null;
}

export interface UpgradeRequest {
  id: string;
  institution_id: string;
  institution?: { id: string; name: string; plan_type: PlanType };
  current_plan: PlanType;
  requested_plan: PlanType;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  message: string | null;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanWarning {
  type: string;
  resource: string;
  current: number;
  limit: number;
  gracePeriodEnds: string;
  message: string;
}
```

- [ ] **Step 2: Create plan service**

```ts
import api from '../lib/api';
import type { PlanInfo, UpgradeRequest } from '../types/plan';

export const planService = {
  getPlan: () =>
    api.get<PlanInfo>('/api/admin/plan').then((r) => r.data),

  requestUpgrade: (data: { requested_plan: string; message?: string }) =>
    api.post<UpgradeRequest>('/api/admin/plan/upgrade-request', data).then((r) => r.data),

  // SUPER_ADMIN
  getUpgradeRequests: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ data: UpgradeRequest[]; total: number }>('/api/admin/plan/upgrade-requests', { params }).then((r) => r.data),

  reviewUpgradeRequest: (id: string, data: { status: 'APPROVED' | 'REJECTED'; review_notes?: string }) =>
    api.patch<UpgradeRequest>(`/api/admin/plan/upgrade-requests/${id}`, data).then((r) => r.data),

  updateInstitutionPlan: (institutionId: string, data: { plan_type: string }) =>
    api.patch(`/api/admin/plan/institutions/${institutionId}`, data).then((r) => r.data),
};
```

- [ ] **Step 3: Create plan hooks**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planService } from '../services/plan.service';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function usePlan() {
  return useQuery({
    queryKey: ['plan'],
    queryFn: planService.getPlan,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRequestUpgrade() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: planService.requestUpgrade,
    onSuccess: () => {
      toast.success(t('plan.upgradeRequestSent'));
      queryClient.invalidateQueries({ queryKey: ['plan'] });
    },
    onError: () => {
      toast.error(t('plan.upgradeRequestFailed'));
    },
  });
}

export function useUpgradeRequests(params?: { status?: string; page?: number }) {
  return useQuery({
    queryKey: ['upgrade-requests', params],
    queryFn: () => planService.getUpgradeRequests(params),
  });
}

export function useReviewUpgradeRequest() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status: 'APPROVED' | 'REJECTED'; review_notes?: string }) =>
      planService.reviewUpgradeRequest(id, data),
    onSuccess: () => {
      toast.success(t('plan.reviewSuccess'));
      queryClient.invalidateQueries({ queryKey: ['upgrade-requests'] });
    },
    onError: () => {
      toast.error(t('plan.reviewFailed'));
    },
  });
}

export function useUpdateInstitutionPlan() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ institutionId, ...data }: { institutionId: string; plan_type: string }) =>
      planService.updateInstitutionPlan(institutionId, data),
    onSuccess: () => {
      toast.success(t('plan.planUpdated'));
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
    onError: () => {
      toast.error(t('plan.planUpdateFailed'));
    },
  });
}
```

- [ ] **Step 4: Commit**

```bash
cd sinaloka-platform
git add src/types/plan.ts src/services/plan.service.ts src/hooks/usePlan.ts
git commit -m "feat(platform): add plan types, service, and TanStack Query hooks"
```

---

## Task 10: Frontend — i18n Strings

**Files:**
- Modify: `sinaloka-platform/src/locales/en.json`
- Modify: `sinaloka-platform/src/locales/id.json`

- [ ] **Step 1: Add plan strings to en.json**

Add a new `"plan"` key at the root level:

```json
"plan": {
  "title": "Plans & Pricing",
  "currentPlan": "Current Plan",
  "starter": "Starter",
  "growth": "Growth",
  "business": "Business",
  "free": "Free",
  "perMonth": "/month",
  "features": "Features",
  "maxStudents": "Max Students",
  "maxTutors": "Max Tutors",
  "unlimited": "Unlimited",
  "whatsappNotification": "WhatsApp Notifications",
  "advancedReporting": "Advanced Reporting",
  "multiBranch": "Multi-Branch",
  "requestUpgrade": "Request Upgrade",
  "upgradeMessage": "Message (optional)",
  "upgradeMessagePlaceholder": "Tell us why you want to upgrade...",
  "upgradeRequestSent": "Upgrade request sent successfully",
  "upgradeRequestFailed": "Failed to send upgrade request",
  "alreadyPending": "You already have a pending upgrade request",
  "usageStudents": "{current}/{limit} students",
  "usageTutors": "{current}/{limit} tutors",
  "usageUnlimited": "{current} students (unlimited)",
  "warningApproaching": "You're using {percent}% of your {resource} limit",
  "warningReached": "You've reached your {resource} limit. {days} days remaining in grace period.",
  "warningExpired": "Grace period expired. Upgrade to add more {resource}.",
  "reviewSuccess": "Upgrade request reviewed",
  "reviewFailed": "Failed to review upgrade request",
  "planUpdated": "Institution plan updated",
  "planUpdateFailed": "Failed to update plan",
  "planManagement": "Plan Management",
  "changePlan": "Change Plan",
  "upgradeRequests": "Upgrade Requests",
  "approve": "Approve",
  "reject": "Reject",
  "reviewNotes": "Notes",
  "reviewNotesPlaceholder": "Add a note (optional)...",
  "pending": "Pending",
  "approved": "Approved",
  "rejected": "Rejected",
  "requestedBy": "Requested by",
  "from": "From",
  "to": "To",
  "noRequests": "No upgrade requests",
  "downgradeWarning": "Current usage exceeds this plan's limits. A 7-day grace period will start."
}
```

Also update existing layout keys:

```json
"layout.proPlan" → keep but will be replaced dynamically
"layout.storageUsage" → remove (no longer needed)
"layout.upgradeNow" → keep
```

- [ ] **Step 2: Add plan strings to id.json**

```json
"plan": {
  "title": "Paket & Harga",
  "currentPlan": "Paket Saat Ini",
  "starter": "Starter",
  "growth": "Growth",
  "business": "Business",
  "free": "Gratis",
  "perMonth": "/bulan",
  "features": "Fitur",
  "maxStudents": "Maks Murid",
  "maxTutors": "Maks Tutor",
  "unlimited": "Tidak Terbatas",
  "whatsappNotification": "Notifikasi WhatsApp",
  "advancedReporting": "Laporan Lanjutan",
  "multiBranch": "Multi-Cabang",
  "requestUpgrade": "Ajukan Upgrade",
  "upgradeMessage": "Pesan (opsional)",
  "upgradeMessagePlaceholder": "Ceritakan alasan Anda ingin upgrade...",
  "upgradeRequestSent": "Permintaan upgrade berhasil dikirim",
  "upgradeRequestFailed": "Gagal mengirim permintaan upgrade",
  "alreadyPending": "Anda sudah memiliki permintaan upgrade yang menunggu",
  "usageStudents": "{current}/{limit} murid",
  "usageTutors": "{current}/{limit} tutor",
  "usageUnlimited": "{current} murid (tidak terbatas)",
  "warningApproaching": "Anda menggunakan {percent}% dari batas {resource}",
  "warningReached": "Anda telah mencapai batas {resource}. {days} hari tersisa dalam masa tenggang.",
  "warningExpired": "Masa tenggang habis. Upgrade untuk menambah {resource}.",
  "reviewSuccess": "Permintaan upgrade telah ditinjau",
  "reviewFailed": "Gagal meninjau permintaan upgrade",
  "planUpdated": "Paket institusi diperbarui",
  "planUpdateFailed": "Gagal memperbarui paket",
  "planManagement": "Manajemen Paket",
  "changePlan": "Ubah Paket",
  "upgradeRequests": "Permintaan Upgrade",
  "approve": "Setujui",
  "reject": "Tolak",
  "reviewNotes": "Catatan",
  "reviewNotesPlaceholder": "Tambahkan catatan (opsional)...",
  "pending": "Menunggu",
  "approved": "Disetujui",
  "rejected": "Ditolak",
  "requestedBy": "Diajukan oleh",
  "from": "Dari",
  "to": "Ke",
  "noRequests": "Tidak ada permintaan upgrade",
  "downgradeWarning": "Penggunaan saat ini melebihi batas paket ini. Masa tenggang 7 hari akan dimulai."
}
```

- [ ] **Step 3: Commit**

```bash
git add src/locales/
git commit -m "feat(platform): add plan-related i18n strings for English and Indonesian"
```

---

## Task 11: Frontend — Axios Warning Interceptor

**Files:**
- Modify: `sinaloka-platform/src/lib/api.ts`

- [ ] **Step 1: Add plan warning interceptor to Axios instance**

In `api.ts`, in the existing response interceptor (success handler), add plan warning detection before the `return response`:

```ts
// Plan warning interceptor
if (response.data?._warning) {
  const warning = response.data._warning;
  // Dispatch custom event for PlanWarningBanner to pick up
  window.dispatchEvent(
    new CustomEvent('plan-warning', { detail: warning }),
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat(platform): add plan warning detection to Axios response interceptor"
```

---

## Task 12: Frontend — Sidebar Plan Widget

**Files:**
- Modify: `sinaloka-platform/src/components/Layout.tsx`

- [ ] **Step 1: Replace mock "Pro Plan" in sidebar**

In `Layout.tsx`, replace the hardcoded Pro Plan section with dynamic plan data. Import `usePlan`:

```ts
import { usePlan } from '../hooks/usePlan';
```

Replace the mock section (the `{!isSidebarMinimized && ( ... )}` block containing "proPlan") with:

```tsx
{!isSidebarMinimized && <SidebarPlanWidget />}
```

Add a `SidebarPlanWidget` component in the same file (or just inline):

```tsx
function SidebarPlanWidget() {
  const { t } = useTranslation();
  const { data: plan } = usePlan();
  const navigate = useNavigate();

  if (!plan) return null;

  const { usage, planConfig } = plan;
  const studentPercent = planConfig.maxStudents
    ? Math.round((usage.students.current / planConfig.maxStudents) * 100)
    : 0;

  const planColors: Record<string, string> = {
    STARTER: 'text-zinc-500',
    GROWTH: 'text-blue-500',
    BUSINESS: 'text-amber-500',
  };

  return (
    <div className="p-4 border-t border-border/50">
      <div className="p-4 bg-muted/50 rounded-2xl">
        <p className={cn('text-xs font-bold mb-1', planColors[plan.currentPlan])}>
          {planConfig.label}
        </p>
        <p className="text-[10px] text-muted-foreground mb-3">
          {planConfig.maxStudents
            ? `${usage.students.current}/${planConfig.maxStudents} ${t('plan.maxStudents').toLowerCase()}`
            : `${usage.students.current} ${t('plan.maxStudents').toLowerCase()} (${t('plan.unlimited').toLowerCase()})`}
        </p>
        {planConfig.maxStudents && (
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden mb-4">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                studentPercent >= 100 ? 'bg-red-500' : studentPercent >= 80 ? 'bg-amber-500' : 'bg-primary',
              )}
              style={{ width: `${Math.min(studentPercent, 100)}%` }}
            />
          </div>
        )}
        {plan.currentPlan !== 'BUSINESS' && (
          <button
            onClick={() => navigate('/settings', { state: { tab: 'plans' } })}
            className="text-[10px] font-bold text-foreground hover:underline"
          >
            {t('layout.upgradeNow')}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd sinaloka-platform
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat(platform): replace mock Pro Plan sidebar with real plan data widget"
```

---

## Task 13: Frontend — Plans Tab (Pricing Cards)

**Files:**
- Create: `sinaloka-platform/src/pages/Settings/tabs/PlansTab.tsx`
- Modify: `sinaloka-platform/src/pages/Settings/index.tsx`

- [ ] **Step 1: Create PlansTab component**

Create `PlansTab.tsx` with 3 pricing cards (Starter, Growth, Business). Each card shows:
- Plan name + price
- Feature checklist (check/cross icons)
- Limits (students, tutors)
- "Current Plan" badge or "Request Upgrade" button
- Modal form for upgrade request with message field

Use existing UI components (`Card`, `Button`, `Badge`, `Modal`, `Label`) from `../../components/UI`. Follow the same pattern as `BillingTab.tsx`.

The component receives `usePlan()` data and `useRequestUpgrade()` mutation.

- [ ] **Step 2: Add Plans section to Settings page**

In `sinaloka-platform/src/pages/Settings/index.tsx`:
- Add `'plans'` to the `SECTION_IDS` array (the scroll-spy nav)
- Add `PlansTab` component rendered in the page content area (same pattern as other tabs — always rendered, scroll-spy highlights when visible)
- Add a `useEffect` that reads `useLocation().state?.tab` — if it equals `'plans'`, scroll to the plans section on mount:

```tsx
const location = useLocation();
useEffect(() => {
  if (location.state?.tab === 'plans') {
    document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' });
  }
}, [location.state]);
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Settings/
git commit -m "feat(platform): add Plans & Pricing tab to Settings with pricing cards and upgrade request"
```

---

## Task 14: Frontend — Plan Warning Banner

**Files:**
- Create: `sinaloka-platform/src/components/PlanWarningBanner.tsx`
- Modify: `sinaloka-platform/src/components/Layout.tsx`

- [ ] **Step 1: Create PlanWarningBanner component**

```tsx
import { useTranslation } from 'react-i18next';
import { usePlan } from '../hooks/usePlan';
import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export function PlanWarningBanner() {
  const { t } = useTranslation();
  const { data: plan } = usePlan();
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (!plan || dismissed) return null;

  const { usage, planConfig, gracePeriod } = plan;

  // Check if approaching or at limit for students
  const studentPercent = planConfig.maxStudents
    ? (usage.students.current / planConfig.maxStudents) * 100
    : 0;
  const tutorPercent = planConfig.maxTutors
    ? (usage.tutors.current / planConfig.maxTutors) * 100
    : 0;

  const isApproaching = studentPercent >= 80 || tutorPercent >= 80;
  const isAtLimit = studentPercent >= 100 || tutorPercent >= 100;

  if (!isApproaching && !isAtLimit) return null;

  const resource = studentPercent >= tutorPercent ? 'murid' : 'tutor';
  const percent = Math.round(Math.max(studentPercent, tutorPercent));

  let message: string;
  let severity: 'warning' | 'error';

  if (gracePeriod?.expired) {
    message = t('plan.warningExpired', { resource });
    severity = 'error';
  } else if (isAtLimit && gracePeriod) {
    message = t('plan.warningReached', { resource, days: gracePeriod.daysRemaining });
    severity = 'error';
  } else {
    message = t('plan.warningApproaching', { resource, percent });
    severity = 'warning';
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 text-sm',
        severity === 'error'
          ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} />
        <span>{message}</span>
        <button
          onClick={() => navigate('/settings', { state: { tab: 'plans' } })}
          className="font-bold underline ml-2"
        >
          {t('layout.upgradeNow')}
        </button>
      </div>
      <button onClick={() => setDismissed(true)}>
        <X size={16} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add PlanWarningBanner to Layout**

In `Layout.tsx`, import and add `PlanWarningBanner` at the top of the main content area (above `<Outlet />`).

- [ ] **Step 3: Commit**

```bash
git add src/components/PlanWarningBanner.tsx src/components/Layout.tsx
git commit -m "feat(platform): add plan warning banner for approaching/exceeding limits"
```

---

## Task 15: Frontend — Navbar Plan Badge

**Files:**
- Modify: `sinaloka-platform/src/components/Layout.tsx`

- [ ] **Step 1: Add plan badge to navbar/header**

In `Layout.tsx`, in the header/navbar area (near the institution name or user info), add a small plan badge:

```tsx
const planBadgeColors: Record<string, string> = {
  STARTER: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  GROWTH: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  BUSINESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};
```

Use `usePlan()` to get the plan data and render:

```tsx
{plan && (
  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', planBadgeColors[plan.currentPlan])}>
    {plan.planConfig.label}
  </span>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat(platform): add plan badge to navbar"
```

---

## Task 16: Backend — Grace Period Reset on Student/Tutor Deletion

**Files:**
- Modify: `sinaloka-backend/src/modules/student/student.service.ts`
- Modify: `sinaloka-backend/src/modules/tutor/tutor.service.ts`

- [ ] **Step 1: Add grace period reset logic to StudentService.delete()**

In `student.service.ts`, after the delete operation in the `delete` method, add a check: count remaining active students, if below limit → reset `plan_limit_reached_at` to null.

```ts
// After deleting/deactivating the student:
const institution = await this.prisma.institution.findUnique({
  where: { id: institutionId },
  select: { plan_type: true, plan_limit_reached_at: true },
});

if (institution?.plan_limit_reached_at) {
  const { PLAN_LIMITS } = await import('../../common/constants/plans.js');
  const planConfig = PLAN_LIMITS[institution.plan_type as any];
  if (planConfig.maxStudents !== null) {
    const count = await this.prisma.student.count({
      where: { institution_id: institutionId, status: 'ACTIVE' },
    });
    if (count < planConfig.maxStudents) {
      await this.prisma.institution.update({
        where: { id: institutionId },
        data: { plan_limit_reached_at: null },
      });
    }
  }
}
```

- [ ] **Step 2: Add same logic to TutorService.delete()**

Same pattern but count tutors and check `maxTutors`.

- [ ] **Step 3: Commit**

```bash
git add src/modules/student/student.service.ts src/modules/tutor/tutor.service.ts
git commit -m "feat(backend): reset plan grace period when student/tutor count drops below limit"
```

---

## Task 17: Frontend — SUPER_ADMIN Plan Management

**Files:**
- Modify: `sinaloka-platform/src/pages/SuperAdmin/InstitutionDetail.tsx`
- Modify: `sinaloka-platform/src/pages/SuperAdmin/Institutions.tsx`

- [ ] **Step 1: Add Plan column to Institutions list**

In `Institutions.tsx`, add a "Plan" column to the table showing a colored badge:
- STARTER → gray badge
- GROWTH → blue badge
- BUSINESS → amber/gold badge

- [ ] **Step 2: Add Plan Management tab to InstitutionDetail**

In `InstitutionDetail.tsx`, add a new tab `'plan'` with a `PlanManagementTab` component that shows:
- Current plan badge
- Usage stats (students, tutors) vs limits
- Dropdown to change plan (select with STARTER/GROWTH/BUSINESS options)
- Warning if downgrading would exceed new limits
- "Save" button that calls `useUpdateInstitutionPlan()`

- [ ] **Step 3: Commit**

```bash
git add src/pages/SuperAdmin/
git commit -m "feat(platform): add plan column to institutions list and plan management tab"
```

---

## Task 18: Frontend — SUPER_ADMIN Upgrade Requests Page

**Files:**
- Create: `sinaloka-platform/src/pages/SuperAdmin/UpgradeRequests.tsx`
- Modify: `sinaloka-platform/src/App.tsx`
- Modify: `sinaloka-platform/src/components/SuperAdminLayout.tsx`

- [ ] **Step 1: Create UpgradeRequests page**

Table listing all upgrade requests with:
- Institution name
- Current plan → Requested plan (with arrows)
- Status badge (Pending/Approved/Rejected)
- Message from institution admin
- Filter by status (tabs: All, Pending, Approved, Rejected)
- Actions: Approve/Reject buttons (for PENDING) with modal for review notes

- [ ] **Step 2: Add route in App.tsx**

Add route under `/super`:

```tsx
<Route path="upgrade-requests" element={<UpgradeRequests />} />
```

- [ ] **Step 3: Add nav item in SuperAdminLayout**

Add "Upgrade Requests" nav item with a badge showing pending count.

- [ ] **Step 4: Commit**

```bash
git add src/pages/SuperAdmin/UpgradeRequests.tsx src/App.tsx src/components/SuperAdminLayout.tsx
git commit -m "feat(platform): add Upgrade Requests page for SUPER_ADMIN with approve/reject flow"
```

---

## Task 19: Frontend — Feature Lock Overlay

**Files:**
- Create: `sinaloka-platform/src/components/FeatureLock.tsx`

- [ ] **Step 1: Create FeatureLock wrapper component**

A reusable component that wraps any gated feature. If the current plan doesn't have access, it shows an overlay with the required plan name and upgrade CTA.

```tsx
import { usePlan } from '../hooks/usePlan';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PlanFeatures } from '../types/plan';

interface FeatureLockProps {
  feature: keyof PlanFeatures;
  children: React.ReactNode;
}

export function FeatureLock({ feature, children }: FeatureLockProps) {
  const { data: plan } = usePlan();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!plan || plan.planConfig.features[feature]) {
    return <>{children}</>;
  }

  // Find which plan unlocks this feature
  const requiredPlan = Object.values(plan.allPlans).find(
    (p) => p.features[feature],
  );

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px] rounded-lg">
        <div className="text-center space-y-2">
          <Lock size={24} className="mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">
            {requiredPlan?.label} {t('common.proFeature')}
          </p>
          <button
            onClick={() => navigate('/settings', { state: { tab: 'plans' } })}
            className="text-xs font-bold text-primary hover:underline"
          >
            {t('layout.upgradeNow')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Apply FeatureLock to WhatsApp page**

In `src/pages/WhatsApp.tsx` (or wherever WhatsApp features are rendered), wrap the content with:

```tsx
<FeatureLock feature="whatsappNotification">
  {/* existing WhatsApp content */}
</FeatureLock>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/FeatureLock.tsx src/pages/WhatsApp.tsx
git commit -m "feat(platform): add FeatureLock overlay component and apply to gated features"
```

---

## Task 20: Build Verification & Final Checks

**Files:** None (verification only)

- [ ] **Step 1: Backend build check**

```bash
cd sinaloka-backend
npm run lint
npm run build
```

- [ ] **Step 2: Frontend build check**

```bash
cd sinaloka-platform
npm run lint
npm run build
```

- [ ] **Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: resolve build issues from plan system implementation"
```
