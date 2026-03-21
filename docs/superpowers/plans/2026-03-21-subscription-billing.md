# Subscription Billing System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add monthly subscription billing with Midtrans + manual transfer payments, auto-downgrade lifecycle, and self-service for institution ADMINs.

**Architecture:** Separate `SubscriptionModule` in NestJS backend with 3 new Prisma models (Subscription, SubscriptionPayment, SubscriptionInvoice). Read-only guard for warnings, cron job for state transitions. Frontend extends existing PlansTab for ADMIN and adds new SubscriptionManagement page for SUPER_ADMIN.

**Tech Stack:** NestJS, Prisma, PostgreSQL, @nestjs/schedule (already installed), Midtrans Snap, Resend email, React, TanStack Query, TailwindCSS v4, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-03-21-subscription-billing-design.md`

---

## File Map

### Backend — New Files

| File | Responsibility |
|------|---------------|
| `prisma/migrations/YYYYMMDD_subscription_billing/migration.sql` | Schema: enums, 3 models, partial unique index, invoice sequence |
| `src/modules/subscription/subscription.module.ts` | Module wiring |
| `src/modules/subscription/subscription.constants.ts` | Pricing, durations, reminder tiers |
| `src/modules/subscription/dto/create-payment.dto.ts` | Zod DTO for payment initiation |
| `src/modules/subscription/dto/confirm-payment.dto.ts` | Zod DTO for SUPER_ADMIN confirm/reject |
| `src/modules/subscription/dto/subscription-query.dto.ts` | Zod DTO for list filters |
| `src/modules/subscription/dto/override-subscription.dto.ts` | Zod DTO for SUPER_ADMIN override |
| `src/modules/subscription/subscription.service.ts` | Core lifecycle: create, activate, renew, downgrade |
| `src/modules/subscription/subscription-payment.service.ts` | Midtrans + manual payment, webhook handler |
| `src/modules/subscription/subscription-cron.service.ts` | Daily lifecycle cron + email reminders |
| `src/modules/subscription/subscription.guard.ts` | Read-only guard, attach warnings |
| `src/modules/subscription/subscription-warning.interceptor.ts` | Merge `_subscriptionWarning` into response |
| `src/modules/subscription/subscription.controller.ts` | ADMIN self-service endpoints |
| `src/modules/subscription/subscription-admin.controller.ts` | SUPER_ADMIN management endpoints |

### Backend — Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add enums, 3 models, `subscriptions` relation on Institution |
| `src/app.module.ts` | Import SubscriptionModule, register guard + interceptor |
| `src/modules/payment/payment-gateway.controller.ts` | Add `SUB-` prefix routing at top of webhook handler |
| `src/modules/email/email.service.ts` | Add subscription email methods |

### Frontend — New Files

| File | Responsibility |
|------|---------------|
| `src/types/subscription.ts` | TypeScript types for subscription API responses |
| `src/services/subscription.service.ts` | API calls for subscription endpoints |
| `src/hooks/useSubscription.ts` | TanStack Query hooks |
| `src/pages/Settings/tabs/PlansTab/SubscriptionStatusCard.tsx` | Status badge, expiry info, renew button |
| `src/pages/Settings/tabs/PlansTab/PaymentModal.tsx` | Midtrans / manual payment modal |
| `src/pages/Settings/tabs/PlansTab/InvoiceTable.tsx` | Invoice list with pay buttons |
| `src/pages/SuperAdmin/SubscriptionManagement.tsx` | SUPER_ADMIN subscription dashboard |

### Frontend — Modified Files

| File | Change |
|------|--------|
| `src/pages/Settings/tabs/PlansTab.tsx` | Import and render SubscriptionStatusCard, InvoiceTable |
| `src/components/PlanWarningBanner.tsx` | Add subscription expiry/grace period warnings |
| `src/components/SuperAdminLayout.tsx` | Add "Subscriptions" sidebar item |
| `src/App.tsx` | Add `/super/subscriptions` route |

---

## Task 1: Prisma Schema — Enums and Models

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`

- [ ] **Step 1: Add new enums after existing PlanType enum (line 88)**

After `enum UpgradeRequestStatus` (line 94), add:

```prisma
enum SubscriptionStatus {
  ACTIVE
  GRACE_PERIOD
  EXPIRED
  CANCELLED
}

enum SubscriptionPaymentMethod {
  MIDTRANS
  MANUAL_TRANSFER
}

enum SubscriptionPaymentStatus {
  PENDING
  PAID
  FAILED
  EXPIRED
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  CANCELLED
}
```

- [ ] **Step 2: Add Subscription model after UpgradeRequest model (line 190)**

```prisma
model Subscription {
  id                 String             @id @default(cuid())
  institution_id     String
  plan_type          PlanType
  status             SubscriptionStatus @default(ACTIVE)
  started_at         DateTime
  expires_at         DateTime
  grace_ends_at      DateTime?
  auto_downgraded_at DateTime?
  cancelled_at       DateTime?
  cancelled_reason   String?
  last_reminder_tier Int?
  created_at         DateTime           @default(now())
  updated_at         DateTime           @updatedAt

  institution Institution            @relation(fields: [institution_id], references: [id])
  payments    SubscriptionPayment[]
  invoices    SubscriptionInvoice[]

  @@index([institution_id])
  @@index([status])
  @@index([expires_at])
  @@map("subscription")
}
```

- [ ] **Step 3: Add SubscriptionPayment model**

```prisma
model SubscriptionPayment {
  id                       String                    @id @default(cuid())
  subscription_id          String
  institution_id           String
  amount                   Int
  method                   SubscriptionPaymentMethod
  status                   SubscriptionPaymentStatus @default(PENDING)
  midtrans_order_id        String?
  midtrans_transaction_id  String?
  proof_url                String?
  confirmed_by             String?
  confirmed_at             DateTime?
  notes                    String?
  paid_at                  DateTime?
  created_at               DateTime                  @default(now())

  subscription Subscription @relation(fields: [subscription_id], references: [id])
  institution  Institution  @relation(fields: [institution_id], references: [id])
  invoice      SubscriptionInvoice?

  @@index([institution_id])
  @@index([status])
  @@map("subscription_payment")
}
```

- [ ] **Step 4: Add SubscriptionInvoice model**

```prisma
model SubscriptionInvoice {
  id              String        @id @default(cuid())
  institution_id  String
  subscription_id String
  invoice_number  String        @unique
  amount          Int
  period_start    DateTime
  period_end      DateTime
  due_date        DateTime
  status          InvoiceStatus @default(DRAFT)
  payment_id      String?       @unique
  created_at      DateTime      @default(now())

  institution  Institution          @relation(fields: [institution_id], references: [id])
  subscription Subscription         @relation(fields: [subscription_id], references: [id])
  payment      SubscriptionPayment? @relation(fields: [payment_id], references: [id])

  @@index([institution_id])
  @@map("subscription_invoice")
}
```

- [ ] **Step 5: Add relations to Institution model**

In the Institution model (around line 138-140), add these relations:

```prisma
  subscriptions          Subscription[]
  subscription_payments  SubscriptionPayment[]
  subscription_invoices  SubscriptionInvoice[]
```

- [ ] **Step 6: Generate migration**

```bash
cd sinaloka-backend
npx prisma migrate dev --name subscription_billing
```

If shadow DB errors block `migrate dev`, create the migration directory and SQL file manually based on the schema diff.

- [ ] **Step 7: Add partial unique index and invoice sequence**

Create a new migration for the raw SQL:

```bash
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_subscription_indexes
```

Write `migration.sql`:

```sql
-- Partial unique index: only one ACTIVE or GRACE_PERIOD subscription per institution
CREATE UNIQUE INDEX idx_subscription_active_per_institution
ON subscription (institution_id)
WHERE status IN ('ACTIVE', 'GRACE_PERIOD');

-- Invoice number sequence
CREATE SEQUENCE subscription_invoice_seq;
```

Apply:

```bash
npx prisma migrate dev --name subscription_indexes
```

- [ ] **Step 8: Regenerate Prisma client**

```bash
npm run prisma:generate
```

- [ ] **Step 9: Commit**

```bash
git add prisma/
git commit -m "feat(backend): add subscription billing schema — enums, models, indexes"
```

---

## Task 2: Subscription Constants and DTOs

**Files:**
- Create: `sinaloka-backend/src/modules/subscription/subscription.constants.ts`
- Create: `sinaloka-backend/src/modules/subscription/dto/create-payment.dto.ts`
- Create: `sinaloka-backend/src/modules/subscription/dto/confirm-payment.dto.ts`
- Create: `sinaloka-backend/src/modules/subscription/dto/subscription-query.dto.ts`
- Create: `sinaloka-backend/src/modules/subscription/dto/override-subscription.dto.ts`

- [ ] **Step 1: Create subscription constants**

Reference `src/common/constants/plans.ts` for the existing `PLAN_LIMITS` structure. The `price` field already exists there (GROWTH: 150000, BUSINESS: 500000).

```ts
// src/modules/subscription/subscription.constants.ts

export const SUBSCRIPTION_DURATION_DAYS = 30;
export const GRACE_PERIOD_DAYS = 7;
export const REMINDER_TIERS = [7, 3, 1] as const;

// Midtrans order ID prefix to distinguish from student payments
export const SUBSCRIPTION_ORDER_PREFIX = 'SUB';
```

- [ ] **Step 2: Create create-payment DTO**

Follow the Zod pattern from `src/modules/plan/plan.dto.ts`:

```ts
// src/modules/subscription/dto/create-payment.dto.ts
import { z } from 'zod';

export const CreateSubscriptionPaymentSchema = z.object({
  plan_type: z.enum(['GROWTH', 'BUSINESS']),
  method: z.enum(['MIDTRANS', 'MANUAL_TRANSFER']),
  type: z.enum(['new', 'renewal']).default('new'),
  proof_url: z.string().url().optional(),
});

export type CreateSubscriptionPaymentDto = z.infer<typeof CreateSubscriptionPaymentSchema>;
```

- [ ] **Step 3: Create confirm-payment DTO**

```ts
// src/modules/subscription/dto/confirm-payment.dto.ts
import { z } from 'zod';

export const ConfirmSubscriptionPaymentSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(500).optional(),
});

export type ConfirmSubscriptionPaymentDto = z.infer<typeof ConfirmSubscriptionPaymentSchema>;
```

- [ ] **Step 4: Create subscription-query DTO**

```ts
// src/modules/subscription/dto/subscription-query.dto.ts
import { z } from 'zod';

export const SubscriptionQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'GRACE_PERIOD', 'EXPIRED', 'CANCELLED']).optional(),
  plan_type: z.enum(['GROWTH', 'BUSINESS']).optional(),
  institution_id: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SubscriptionQueryDto = z.infer<typeof SubscriptionQuerySchema>;

export const PaymentQuerySchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'EXPIRED']).optional(),
  method: z.enum(['MIDTRANS', 'MANUAL_TRANSFER']).optional(),
  institution_id: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaymentQueryDto = z.infer<typeof PaymentQuerySchema>;
```

- [ ] **Step 5: Create override-subscription DTO**

```ts
// src/modules/subscription/dto/override-subscription.dto.ts
import { z } from 'zod';

export const OverrideSubscriptionSchema = z.object({
  plan_type: z.enum(['STARTER', 'GROWTH', 'BUSINESS']).optional(),
  expires_at: z.coerce.date().optional(),
  status: z.enum(['ACTIVE', 'GRACE_PERIOD', 'EXPIRED', 'CANCELLED']).optional(),
  notes: z.string().min(1).max(500),
});

export type OverrideSubscriptionDto = z.infer<typeof OverrideSubscriptionSchema>;
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/subscription/
git commit -m "feat(backend): add subscription constants and DTOs"
```

---

## Task 3: Subscription Service — Core Lifecycle

**Files:**
- Create: `sinaloka-backend/src/modules/subscription/subscription.service.ts`
- Reference: `sinaloka-backend/src/modules/plan/plan.service.ts` for pattern

- [ ] **Step 1: Create subscription service with getStatus method**

```ts
// src/modules/subscription/subscription.service.ts
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PLAN_LIMITS } from '../../common/constants/plans';
import {
  SUBSCRIPTION_DURATION_DAYS,
  GRACE_PERIOD_DAYS,
} from './subscription.constants';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get active subscription for an institution. Returns null for STARTER.
   */
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

  /**
   * Get subscription status for ADMIN dashboard.
   */
  async getStatus(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { plan_type: true },
    });

    if (!institution) throw new NotFoundException('Institution not found');

    const subscription = await this.getActiveSubscription(institutionId);
    const planConfig = PLAN_LIMITS[institution.plan_type];

    return {
      plan_type: institution.plan_type,
      plan_config: planConfig,
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            started_at: subscription.started_at,
            expires_at: subscription.expires_at,
            grace_ends_at: subscription.grace_ends_at,
            days_remaining: Math.max(
              0,
              Math.ceil(
                (subscription.expires_at.getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24),
              ),
            ),
            last_payment: subscription.payments[0] ?? null,
          }
        : null,
    };
  }

  /**
   * Activate a subscription after payment is confirmed.
   * Called by SubscriptionPaymentService.
   */
  async activateSubscription(
    institutionId: string,
    planType: 'GROWTH' | 'BUSINESS',
    type: 'new' | 'renewal',
  ) {
    const existing = await this.getActiveSubscription(institutionId);
    const now = new Date();

    let startedAt: Date;
    let expiresAt: Date;

    if (type === 'renewal' && existing) {
      // Extend from old expires_at so early payment doesn't lose days
      startedAt = existing.expires_at > now ? existing.expires_at : now;
      expiresAt = new Date(startedAt);
      expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_DURATION_DAYS);

      // Update existing subscription
      await this.prisma.$transaction([
        this.prisma.subscription.update({
          where: { id: existing.id },
          data: {
            plan_type: planType,
            status: 'ACTIVE',
            started_at: startedAt,
            expires_at: expiresAt,
            grace_ends_at: null,
            auto_downgraded_at: null,
            last_reminder_tier: null,
          },
        }),
        this.prisma.institution.update({
          where: { id: institutionId },
          data: {
            plan_type: planType,
            plan_limit_reached_at: null,
          },
        }),
      ]);

      return existing.id;
    } else {
      // New subscription or re-subscribe after downgrade
      startedAt = now;
      expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_DURATION_DAYS);

      // If there's an existing expired subscription, mark it cancelled
      if (existing) {
        await this.prisma.subscription.update({
          where: { id: existing.id },
          data: { status: 'CANCELLED', cancelled_at: now, cancelled_reason: 'Replaced by new subscription' },
        });
      }

      const subscription = await this.prisma.$transaction(async (tx) => {
        const sub = await tx.subscription.create({
          data: {
            institution_id: institutionId,
            plan_type: planType,
            status: 'ACTIVE',
            started_at: startedAt,
            expires_at: expiresAt,
          },
        });

        await tx.institution.update({
          where: { id: institutionId },
          data: {
            plan_type: planType,
            plan_limit_reached_at: null,
          },
        });

        return sub;
      });

      return subscription.id;
    }
  }

  /**
   * SUPER_ADMIN override subscription.
   */
  async overrideSubscription(
    subscriptionId: string,
    data: {
      plan_type?: 'STARTER' | 'GROWTH' | 'BUSINESS';
      expires_at?: Date;
      status?: string;
      notes: string;
    },
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) throw new NotFoundException('Subscription not found');

    const updateData: any = {};
    if (data.plan_type) updateData.plan_type = data.plan_type;
    if (data.expires_at) updateData.expires_at = data.expires_at;
    if (data.status) updateData.status = data.status;
    if (data.status === 'CANCELLED') {
      updateData.cancelled_at = new Date();
      updateData.cancelled_reason = data.notes;
    }

    await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: updateData,
      }),
      // If plan_type changed, update institution too
      ...(data.plan_type
        ? [
            this.prisma.institution.update({
              where: { id: subscription.institution_id },
              data: {
                plan_type: data.plan_type,
                plan_limit_reached_at: null,
              },
            }),
          ]
        : []),
    ]);
  }

  /**
   * List all subscriptions (SUPER_ADMIN).
   */
  async listSubscriptions(query: {
    status?: string;
    plan_type?: string;
    institution_id?: string;
    page: number;
    limit: number;
  }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.plan_type) where.plan_type = query.plan_type;
    if (query.institution_id) where.institution_id = query.institution_id;

    const [items, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: {
          institution: { select: { id: true, name: true } },
          payments: { orderBy: { created_at: 'desc' }, take: 1 },
        },
        orderBy: { created_at: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  /**
   * Get aggregated stats for SUPER_ADMIN dashboard.
   */
  async getStats() {
    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      planCounts,
      expiringSoon,
      pendingPayments,
      monthlyRevenue,
    ] = await Promise.all([
      this.prisma.institution.groupBy({
        by: ['plan_type'],
        _count: true,
      }),
      this.prisma.subscription.count({
        where: {
          status: 'ACTIVE',
          expires_at: { lte: sevenDaysFromNow, gte: now },
        },
      }),
      this.prisma.subscriptionPayment.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.subscriptionPayment.aggregate({
        where: {
          status: 'PAID',
          paid_at: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      plan_counts: planCounts.reduce(
        (acc, { plan_type, _count }) => ({ ...acc, [plan_type]: _count }),
        { STARTER: 0, GROWTH: 0, BUSINESS: 0 },
      ),
      expiring_soon: expiringSoon,
      pending_payments: pendingPayments,
      monthly_revenue: monthlyRevenue._sum.amount ?? 0,
    };
  }

  /**
   * Get invoices for an institution.
   */
  async getInvoices(institutionId: string) {
    return this.prisma.subscriptionInvoice.findMany({
      where: { institution_id: institutionId },
      include: { payment: true },
      orderBy: { created_at: 'desc' },
    });
  }
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd sinaloka-backend
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: no errors related to `subscription.service.ts` (some unrelated errors may exist).

- [ ] **Step 3: Commit**

```bash
git add src/modules/subscription/subscription.service.ts
git commit -m "feat(backend): add subscription service with lifecycle management"
```

---

## Task 4: Subscription Payment Service

**Files:**
- Create: `sinaloka-backend/src/modules/subscription/subscription-payment.service.ts`
- Reference: `sinaloka-backend/src/modules/payment/midtrans.service.ts` for Midtrans pattern
- Reference: `sinaloka-backend/src/modules/payment/payment-gateway.controller.ts` for webhook pattern

- [ ] **Step 1: Create payment service**

```ts
// src/modules/subscription/subscription-payment.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MidtransService } from '../payment/midtrans.service';
import { EmailService } from '../email/email.service';
import { SubscriptionService } from './subscription.service';
import { PLAN_LIMITS } from '../../common/constants/plans';
import { SUBSCRIPTION_ORDER_PREFIX } from './subscription.constants';
import { CreateSubscriptionPaymentDto } from './dto/create-payment.dto';
import { ConfirmSubscriptionPaymentDto } from './dto/confirm-payment.dto';

@Injectable()
export class SubscriptionPaymentService {
  private readonly logger = new Logger(SubscriptionPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly midtransService: MidtransService,
    private readonly emailService: EmailService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  private getMidtransConfig() {
    return {
      midtrans_server_key: this.configService.get<string>('SUBSCRIPTION_MIDTRANS_SERVER_KEY'),
      midtrans_client_key: this.configService.get<string>('SUBSCRIPTION_MIDTRANS_CLIENT_KEY'),
      is_sandbox: this.configService.get<string>('SUBSCRIPTION_MIDTRANS_SANDBOX', 'false') === 'true',
    };
  }

  /**
   * Initiate a subscription payment (Midtrans or manual transfer).
   */
  async createPayment(
    institutionId: string,
    dto: CreateSubscriptionPaymentDto,
  ) {
    const planConfig = PLAN_LIMITS[dto.plan_type];
    if (!planConfig || !planConfig.price) {
      throw new BadRequestException('Invalid plan type for subscription');
    }

    // Check if there's already a pending payment
    const pendingPayment = await this.prisma.subscriptionPayment.findFirst({
      where: {
        institution_id: institutionId,
        status: 'PENDING',
      },
    });
    if (pendingPayment) {
      throw new BadRequestException(
        'You already have a pending payment. Please complete or cancel it first.',
      );
    }

    // Get or prepare subscription
    let subscription = await this.subscriptionService.getActiveSubscription(institutionId);

    if (dto.type === 'renewal' && !subscription) {
      throw new BadRequestException('No active subscription to renew');
    }

    // For new subscriptions, create a placeholder subscription record
    if (!subscription) {
      subscription = await this.prisma.subscription.create({
        data: {
          institution_id: institutionId,
          plan_type: dto.plan_type,
          status: 'EXPIRED', // Will be set to ACTIVE on payment confirmation
          started_at: new Date(),
          expires_at: new Date(), // Placeholder, updated on activation
        },
        include: { payments: { take: 0 } },
      });
    }

    const amount = planConfig.price;

    // Generate invoice number
    const seqResult = await this.prisma.$queryRaw<[{ nextval: bigint }]>`
      SELECT nextval('subscription_invoice_seq')
    `;
    const seq = Number(seqResult[0].nextval);
    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(seq).padStart(5, '0')}`;

    // Calculate period
    const periodStart =
      dto.type === 'renewal' && subscription.expires_at > now
        ? subscription.expires_at
        : now;
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 30);

    if (dto.method === 'MIDTRANS') {
      const orderId = `${SUBSCRIPTION_ORDER_PREFIX}-${subscription.id}-${Date.now()}`;

      const institution = await this.prisma.institution.findUnique({
        where: { id: institutionId },
        select: { name: true },
      });

      const config = this.getMidtransConfig();
      const snapResponse = await this.midtransService.createSnapTransaction(
        config,
        {
          orderId,
          grossAmount: amount,
          itemName: `Sinaloka ${dto.plan_type} Plan - 1 Month`,
          customerName: institution?.name ?? 'Institution',
        },
      );

      // Create payment + invoice in transaction
      const payment = await this.prisma.$transaction(async (tx) => {
        const pay = await tx.subscriptionPayment.create({
          data: {
            subscription_id: subscription.id,
            institution_id: institutionId,
            amount,
            method: 'MIDTRANS',
            status: 'PENDING',
            midtrans_order_id: orderId,
          },
        });

        await tx.subscriptionInvoice.create({
          data: {
            institution_id: institutionId,
            subscription_id: subscription.id,
            invoice_number: invoiceNumber,
            amount,
            period_start: periodStart,
            period_end: periodEnd,
            due_date: periodEnd,
            status: 'DRAFT',
            payment_id: pay.id,
          },
        });

        return pay;
      });

      return {
        payment_id: payment.id,
        snap_token: snapResponse.token,
        snap_redirect_url: snapResponse.redirect_url,
      };
    } else {
      // Manual transfer
      if (!dto.proof_url) {
        throw new BadRequestException('proof_url is required for manual transfer');
      }

      const payment = await this.prisma.$transaction(async (tx) => {
        const pay = await tx.subscriptionPayment.create({
          data: {
            subscription_id: subscription.id,
            institution_id: institutionId,
            amount,
            method: 'MANUAL_TRANSFER',
            status: 'PENDING',
            proof_url: dto.proof_url,
          },
        });

        await tx.subscriptionInvoice.create({
          data: {
            institution_id: institutionId,
            subscription_id: subscription.id,
            invoice_number: invoiceNumber,
            amount,
            period_start: periodStart,
            period_end: periodEnd,
            due_date: periodEnd,
            status: 'SENT',
            payment_id: pay.id,
          },
        });

        return pay;
      });

      // Notify SUPER_ADMINs
      const superAdmins = await this.prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
        select: { email: true },
      });
      for (const admin of superAdmins) {
        await this.emailService.sendSubscriptionPendingPaymentNotification(
          admin.email,
          institutionId,
        );
      }

      return { payment_id: payment.id, status: 'PENDING' };
    }
  }

  /**
   * Handle Midtrans webhook for subscription payments.
   * Called from PaymentGatewayController when order_id starts with 'SUB-'.
   */
  async handleWebhook(body: any) {
    const orderId = body.order_id;
    const transactionStatus = body.transaction_status;
    const statusCode = body.status_code;
    const grossAmount = body.gross_amount;

    const payment = await this.prisma.subscriptionPayment.findFirst({
      where: { midtrans_order_id: orderId },
      include: { subscription: true },
    });

    if (!payment) {
      this.logger.warn(`Subscription payment not found for order: ${orderId}`);
      return { status: 'payment_not_found' };
    }

    // Verify signature
    const config = this.getMidtransConfig();
    const isValid = this.midtransService.verifySignature({
      orderId,
      statusCode,
      grossAmount,
      serverKey: config.midtrans_server_key,
      signatureKey: body.signature_key,
    });

    if (!isValid) {
      this.logger.warn(`Invalid signature for order: ${orderId}`);
      return { status: 'invalid_signature' };
    }

    const mappedStatus = this.midtransService.mapTransactionStatus(transactionStatus);

    if (mappedStatus === 'PAID') {
      await this.prisma.$transaction([
        this.prisma.subscriptionPayment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
            paid_at: new Date(),
            midtrans_transaction_id: body.transaction_id,
          },
        }),
        this.prisma.subscriptionInvoice.updateMany({
          where: { payment_id: payment.id },
          data: { status: 'PAID' },
        }),
      ]);

      // Activate subscription (handles both new and renewal, and in-flight during grace period)
      const isRenewal = payment.subscription.status === 'ACTIVE';
      await this.subscriptionService.activateSubscription(
        payment.institution_id,
        payment.subscription.plan_type as 'GROWTH' | 'BUSINESS',
        isRenewal ? 'renewal' : 'new',
      );

      // Send confirmation email
      const admins = await this.prisma.user.findMany({
        where: {
          institution_id: payment.institution_id,
          role: 'ADMIN',
        },
        select: { email: true },
      });
      for (const admin of admins) {
        await this.emailService.sendSubscriptionPaymentConfirmed(
          admin.email,
          payment.subscription.plan_type,
          payment.subscription.expires_at,
        );
      }
    }

    return { status: 'ok' };
  }

  /**
   * SUPER_ADMIN confirm or reject manual transfer payment.
   */
  async confirmPayment(
    paymentId: string,
    dto: ConfirmSubscriptionPaymentDto,
    reviewerId: string,
  ) {
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: { subscription: true },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Payment is not pending');
    }
    if (payment.method !== 'MANUAL_TRANSFER') {
      throw new BadRequestException('Only manual transfer payments can be confirmed');
    }

    if (dto.action === 'approve') {
      await this.prisma.$transaction([
        this.prisma.subscriptionPayment.update({
          where: { id: paymentId },
          data: {
            status: 'PAID',
            paid_at: new Date(),
            confirmed_by: reviewerId,
            confirmed_at: new Date(),
            notes: dto.notes,
          },
        }),
        this.prisma.subscriptionInvoice.updateMany({
          where: { payment_id: paymentId },
          data: { status: 'PAID' },
        }),
      ]);

      // Activate subscription
      const isRenewal = payment.subscription.status === 'ACTIVE';
      await this.subscriptionService.activateSubscription(
        payment.institution_id,
        payment.subscription.plan_type as 'GROWTH' | 'BUSINESS',
        isRenewal ? 'renewal' : 'new',
      );

      // Email ADMIN: payment confirmed
      const admins = await this.prisma.user.findMany({
        where: {
          institution_id: payment.institution_id,
          role: 'ADMIN',
        },
        select: { email: true },
      });
      for (const admin of admins) {
        await this.emailService.sendSubscriptionPaymentConfirmed(
          admin.email,
          payment.subscription.plan_type,
          payment.subscription.expires_at,
        );
      }
    } else {
      // Reject
      await this.prisma.subscriptionPayment.update({
        where: { id: paymentId },
        data: {
          status: 'FAILED',
          confirmed_by: reviewerId,
          confirmed_at: new Date(),
          notes: dto.notes,
        },
      });

      await this.prisma.subscriptionInvoice.updateMany({
        where: { payment_id: paymentId },
        data: { status: 'CANCELLED' },
      });

      // Email ADMIN: payment rejected
      const admins = await this.prisma.user.findMany({
        where: {
          institution_id: payment.institution_id,
          role: 'ADMIN',
        },
        select: { email: true },
      });
      for (const admin of admins) {
        await this.emailService.sendSubscriptionPaymentRejected(
          admin.email,
          dto.notes ?? '',
        );
      }
    }
  }

  /**
   * List all subscription payments (SUPER_ADMIN).
   */
  async listPayments(query: {
    status?: string;
    method?: string;
    institution_id?: string;
    page: number;
    limit: number;
  }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.method) where.method = query.method;
    if (query.institution_id) where.institution_id = query.institution_id;

    const [items, total] = await Promise.all([
      this.prisma.subscriptionPayment.findMany({
        where,
        include: {
          institution: { select: { id: true, name: true } },
          subscription: { select: { plan_type: true, status: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.subscriptionPayment.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd sinaloka-backend
npx tsc --noEmit --pretty 2>&1 | head -20
```

Note: Will have errors about missing `EmailService` methods — those will be added in Task 7.

- [ ] **Step 3: Commit**

```bash
git add src/modules/subscription/subscription-payment.service.ts
git commit -m "feat(backend): add subscription payment service with Midtrans + manual transfer"
```

---

## Task 5: Extend Email Service

**Files:**
- Modify: `sinaloka-backend/src/modules/email/email.service.ts`

- [ ] **Step 1: Read current email service**

Read `src/modules/email/email.service.ts` to understand the exact pattern of existing methods.

- [ ] **Step 2: Add subscription email methods**

Add these methods to the `EmailService` class, following the same pattern as `sendTutorInvitation` etc. (inline HTML, return `{ success, error }`):

```ts
  // --- Subscription Emails ---

  async sendSubscriptionReminder(
    to: string,
    planType: string,
    expiresAt: Date,
    daysRemaining: number,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const subject =
        daysRemaining === 1
          ? 'Subscription berakhir besok'
          : `Subscription Anda akan berakhir dalam ${daysRemaining} hari`;

      await this.resend.emails.send({
        from: this.emailFrom,
        to,
        subject,
        html: this.buildSubscriptionReminderHtml(planType, expiresAt, daysRemaining),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendSubscriptionGracePeriodNotification(
    to: string,
    graceEndsAt: Date,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.resend.emails.send({
        from: this.emailFrom,
        to,
        subject: 'Subscription Anda telah expired — 7 hari grace period',
        html: this.buildGracePeriodHtml(graceEndsAt),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendSubscriptionDowngradeNotification(
    to: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.resend.emails.send({
        from: this.emailFrom,
        to,
        subject: 'Plan Anda telah di-downgrade ke STARTER',
        html: this.buildDowngradeHtml(),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendSubscriptionPaymentConfirmed(
    to: string,
    planType: string,
    expiresAt: Date,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.resend.emails.send({
        from: this.emailFrom,
        to,
        subject: `Pembayaran subscription ${planType} dikonfirmasi`,
        html: this.buildPaymentConfirmedHtml(planType, expiresAt),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendSubscriptionPaymentRejected(
    to: string,
    reason: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.resend.emails.send({
        from: this.emailFrom,
        to,
        subject: 'Pembayaran subscription ditolak',
        html: this.buildPaymentRejectedHtml(reason),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendSubscriptionPendingPaymentNotification(
    to: string,
    institutionId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.resend.emails.send({
        from: this.emailFrom,
        to,
        subject: 'Pembayaran subscription baru menunggu konfirmasi',
        html: `<p>Ada pembayaran subscription manual baru dari institution ${institutionId} yang menunggu konfirmasi Anda.</p>`,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // --- Private HTML builders for subscription ---

  private buildSubscriptionReminderHtml(
    planType: string,
    expiresAt: Date,
    daysRemaining: number,
  ): string {
    const urgency =
      daysRemaining <= 1
        ? 'Segera perpanjang untuk menghindari downgrade ke STARTER.'
        : `Anda memiliki ${daysRemaining} hari tersisa.`;
    return `
      <h2>Subscription ${planType} Anda akan berakhir</h2>
      <p>Subscription Anda berakhir pada <strong>${expiresAt.toLocaleDateString('id-ID')}</strong>.</p>
      <p>${urgency}</p>
      <p>Silakan login ke dashboard untuk memperpanjang subscription Anda.</p>
    `;
  }

  private buildGracePeriodHtml(graceEndsAt: Date): string {
    return `
      <h2>Subscription Anda telah expired</h2>
      <p>Anda memiliki waktu hingga <strong>${graceEndsAt.toLocaleDateString('id-ID')}</strong> (7 hari) untuk memperpanjang sebelum plan Anda di-downgrade ke STARTER.</p>
      <p>Selama grace period, semua fitur masih dapat digunakan.</p>
      <p>Silakan login ke dashboard untuk melakukan pembayaran.</p>
    `;
  }

  private buildDowngradeHtml(): string {
    return `
      <h2>Plan Anda telah di-downgrade ke STARTER</h2>
      <p>Karena pembayaran tidak diterima dalam waktu grace period, plan Anda telah di-downgrade ke STARTER.</p>
      <p>Limit baru: maksimal 30 siswa dan 5 tutor. Data yang ada tidak dihapus, tetapi Anda tidak dapat menambah siswa/tutor baru melebihi limit.</p>
      <p>Untuk upgrade kembali, silakan login ke dashboard dan lakukan pembayaran.</p>
    `;
  }

  private buildPaymentConfirmedHtml(planType: string, expiresAt: Date): string {
    return `
      <h2>Pembayaran Subscription Dikonfirmasi</h2>
      <p>Pembayaran untuk plan <strong>${planType}</strong> telah berhasil dikonfirmasi.</p>
      <p>Subscription Anda aktif sampai <strong>${expiresAt.toLocaleDateString('id-ID')}</strong>.</p>
    `;
  }

  private buildPaymentRejectedHtml(reason: string): string {
    return `
      <h2>Pembayaran Subscription Ditolak</h2>
      <p>Pembayaran subscription Anda telah ditolak.</p>
      ${reason ? `<p><strong>Alasan:</strong> ${reason}</p>` : ''}
      <p>Silakan hubungi admin atau coba kirim ulang pembayaran.</p>
    `;
  }
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/email/email.service.ts
git commit -m "feat(backend): add subscription email templates to EmailService"
```

---

## Task 6: Subscription Guard and Warning Interceptor

**Files:**
- Create: `sinaloka-backend/src/modules/subscription/subscription.guard.ts`
- Create: `sinaloka-backend/src/modules/subscription/subscription-warning.interceptor.ts`
- Reference: `sinaloka-backend/src/common/guards/plan.guard.ts` (line 37-93)
- Reference: `sinaloka-backend/src/common/interceptors/plan-warning.interceptor.ts` (line 25-40)

- [ ] **Step 1: Create subscription guard**

```ts
// src/modules/subscription/subscription.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Skip if no user or SUPER_ADMIN
    if (!user || user.role === 'SUPER_ADMIN') return true;

    const institutionId = request.tenantId || user.institution_id;
    if (!institutionId) return true;

    // Find active subscription
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        institution_id: institutionId,
        status: { in: ['ACTIVE', 'GRACE_PERIOD'] },
      },
      select: {
        status: true,
        expires_at: true,
        grace_ends_at: true,
      },
    });

    // No subscription = STARTER, no warning needed
    if (!subscription) return true;

    const now = new Date();

    if (subscription.status === 'ACTIVE' && now > subscription.expires_at) {
      // Expired but cron hasn't run yet — show expired warning
      const graceEndsAt = new Date(subscription.expires_at);
      graceEndsAt.setDate(graceEndsAt.getDate() + 7);
      request._subscriptionWarning = {
        type: 'EXPIRED',
        grace_ends_at: graceEndsAt,
      };
    } else if (
      subscription.status === 'GRACE_PERIOD' &&
      subscription.grace_ends_at &&
      now > subscription.grace_ends_at
    ) {
      // Grace period ended but cron hasn't downgraded yet
      request._subscriptionWarning = {
        type: 'DOWNGRADE_PENDING',
      };
    } else if (subscription.status === 'GRACE_PERIOD') {
      // In grace period
      const daysRemaining = Math.max(
        0,
        Math.ceil(
          ((subscription.grace_ends_at?.getTime() ?? 0) - now.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      request._subscriptionWarning = {
        type: 'GRACE_PERIOD',
        days_remaining: daysRemaining,
      };
    } else if (
      subscription.status === 'ACTIVE' &&
      now <= subscription.expires_at
    ) {
      const daysRemaining = Math.ceil(
        (subscription.expires_at.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysRemaining <= 7) {
        request._subscriptionWarning = {
          type: 'EXPIRING_SOON',
          days_remaining: daysRemaining,
        };
      }
    }

    return true;
  }
}
```

- [ ] **Step 2: Create subscription warning interceptor**

```ts
// src/modules/subscription/subscription-warning.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SubscriptionWarningInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const request = context.switchToHttp().getRequest();
        const warning = request._subscriptionWarning;

        if (warning && data && typeof data === 'object' && !Array.isArray(data)) {
          return { ...data, _subscriptionWarning: warning };
        }

        return data;
      }),
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/subscription/subscription.guard.ts src/modules/subscription/subscription-warning.interceptor.ts
git commit -m "feat(backend): add read-only subscription guard and warning interceptor"
```

---

## Task 7: Subscription Cron Service

**Files:**
- Create: `sinaloka-backend/src/modules/subscription/subscription-cron.service.ts`
- Reference: `sinaloka-backend/src/modules/whatsapp/whatsapp.cron.ts` for cron pattern

- [ ] **Step 1: Create cron service**

```ts
// src/modules/subscription/subscription-cron.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { GRACE_PERIOD_DAYS, REMINDER_TIERS } from './subscription.constants';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Daily at midnight: handle subscription lifecycle.
   * Step 1: Transition ACTIVE → GRACE_PERIOD for expired subscriptions
   * Step 2: Transition GRACE_PERIOD → EXPIRED + downgrade for past-grace subscriptions
   * Step 3: Send reminder emails for approaching-expiry subscriptions
   */
  @Cron('0 0 * * *')
  async handleSubscriptionLifecycle() {
    this.logger.log('Starting subscription lifecycle cron job');
    const now = new Date();

    // Step 1: ACTIVE → GRACE_PERIOD
    await this.transitionToGracePeriod(now);

    // Step 2: GRACE_PERIOD → EXPIRED + downgrade
    await this.transitionToExpiredAndDowngrade(now);

    // Step 3: Send reminders for still-ACTIVE subscriptions
    await this.sendReminders(now);

    this.logger.log('Subscription lifecycle cron job completed');
  }

  private async transitionToGracePeriod(now: Date) {
    const expiredSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        expires_at: { lt: now },
      },
      include: {
        institution: {
          include: {
            users: {
              where: { role: 'ADMIN' },
              select: { email: true },
            },
          },
        },
      },
    });

    for (const sub of expiredSubscriptions) {
      const graceEndsAt = new Date(sub.expires_at);
      graceEndsAt.setDate(graceEndsAt.getDate() + GRACE_PERIOD_DAYS);

      // Send email first, then update DB
      let emailSuccess = true;
      for (const admin of sub.institution.users) {
        const result = await this.emailService.sendSubscriptionGracePeriodNotification(
          admin.email,
          graceEndsAt,
        );
        if (!result.success) {
          this.logger.error(
            `Failed to send grace period email to ${admin.email}: ${result.error}`,
          );
          emailSuccess = false;
        }
      }

      if (emailSuccess || sub.institution.users.length === 0) {
        await this.prisma.subscription.updateMany({
          where: { id: sub.id, status: 'ACTIVE' }, // Idempotent
          data: {
            status: 'GRACE_PERIOD',
            grace_ends_at: graceEndsAt,
          },
        });
        this.logger.log(
          `Subscription ${sub.id} transitioned to GRACE_PERIOD (institution: ${sub.institution_id})`,
        );
      }
    }
  }

  private async transitionToExpiredAndDowngrade(now: Date) {
    const pastGraceSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'GRACE_PERIOD',
        grace_ends_at: { lt: now },
      },
      include: {
        institution: {
          include: {
            users: {
              where: { role: 'ADMIN' },
              select: { email: true },
            },
          },
        },
      },
    });

    for (const sub of pastGraceSubscriptions) {
      // Send downgrade email first
      let emailSuccess = true;
      for (const admin of sub.institution.users) {
        const result = await this.emailService.sendSubscriptionDowngradeNotification(
          admin.email,
        );
        if (!result.success) {
          this.logger.error(
            `Failed to send downgrade email to ${admin.email}: ${result.error}`,
          );
          emailSuccess = false;
        }
      }

      if (emailSuccess || sub.institution.users.length === 0) {
        await this.prisma.$transaction([
          this.prisma.subscription.updateMany({
            where: { id: sub.id, status: 'GRACE_PERIOD' }, // Idempotent
            data: {
              status: 'EXPIRED',
              auto_downgraded_at: now,
            },
          }),
          this.prisma.institution.update({
            where: { id: sub.institution_id },
            data: {
              plan_type: 'STARTER',
              plan_limit_reached_at: null,
            },
          }),
        ]);
        this.logger.log(
          `Subscription ${sub.id} expired + institution ${sub.institution_id} downgraded to STARTER`,
        );
      }
    }
  }

  private async sendReminders(now: Date) {
    // Find ACTIVE subscriptions expiring within 7 days
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const approachingExpiry = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        expires_at: { gte: now, lte: sevenDaysFromNow },
      },
      include: {
        institution: {
          include: {
            users: {
              where: { role: 'ADMIN' },
              select: { email: true },
            },
          },
        },
      },
    });

    for (const sub of approachingExpiry) {
      const daysRemaining = Math.ceil(
        (sub.expires_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Determine which reminder tier to send
      const tier = REMINDER_TIERS.find((t) => daysRemaining <= t);
      if (!tier) continue;

      // Skip if already sent this tier
      if (sub.last_reminder_tier !== null && sub.last_reminder_tier <= tier) {
        continue;
      }

      // Send email first
      let emailSuccess = true;
      for (const admin of sub.institution.users) {
        const result = await this.emailService.sendSubscriptionReminder(
          admin.email,
          sub.plan_type,
          sub.expires_at,
          daysRemaining,
        );
        if (!result.success) {
          this.logger.error(
            `Failed to send reminder email to ${admin.email}: ${result.error}`,
          );
          emailSuccess = false;
        }
      }

      // Update tier only on email success
      if (emailSuccess) {
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { last_reminder_tier: tier },
        });
        this.logger.log(
          `Sent H-${tier} reminder for subscription ${sub.id}`,
        );
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/subscription/subscription-cron.service.ts
git commit -m "feat(backend): add subscription cron service for lifecycle management"
```

---

## Task 8: Subscription Controllers

**Files:**
- Create: `sinaloka-backend/src/modules/subscription/subscription.controller.ts`
- Create: `sinaloka-backend/src/modules/subscription/subscription-admin.controller.ts`
- Reference: `sinaloka-backend/src/modules/plan/plan.controller.ts` for controller pattern

- [ ] **Step 1: Create ADMIN controller**

```ts
// src/modules/subscription/subscription.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubscriptionService } from './subscription.service';
import { SubscriptionPaymentService } from './subscription-payment.service';
import {
  CreateSubscriptionPaymentSchema,
  CreateSubscriptionPaymentDto,
} from './dto/create-payment.dto';

@Controller('subscription')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly paymentService: SubscriptionPaymentService,
  ) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getStatus(@Req() req: any) {
    return this.subscriptionService.getStatus(req.tenantId);
  }

  @Get('invoices')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getInvoices(@Req() req: any) {
    return this.subscriptionService.getInvoices(req.tenantId);
  }

  @Post('pay')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UsePipes(new ZodValidationPipe(CreateSubscriptionPaymentSchema))
  async createPayment(
    @Req() req: any,
    @Body() dto: CreateSubscriptionPaymentDto,
  ) {
    return this.paymentService.createPayment(req.tenantId, dto);
  }
}
```

- [ ] **Step 2: Create SUPER_ADMIN controller**

```ts
// src/modules/subscription/subscription-admin.controller.ts
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubscriptionService } from './subscription.service';
import { SubscriptionPaymentService } from './subscription-payment.service';
import {
  SubscriptionQuerySchema,
  SubscriptionQueryDto,
  PaymentQuerySchema,
  PaymentQueryDto,
} from './dto/subscription-query.dto';
import {
  OverrideSubscriptionSchema,
  OverrideSubscriptionDto,
} from './dto/override-subscription.dto';
import {
  ConfirmSubscriptionPaymentSchema,
  ConfirmSubscriptionPaymentDto,
} from './dto/confirm-payment.dto';

@Controller('admin/subscriptions')
@Roles('SUPER_ADMIN')
export class SubscriptionAdminController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly paymentService: SubscriptionPaymentService,
  ) {}

  @Get()
  async listSubscriptions(
    @Query(new ZodValidationPipe(SubscriptionQuerySchema))
    query: SubscriptionQueryDto,
  ) {
    return this.subscriptionService.listSubscriptions(query);
  }

  @Get('stats')
  async getStats() {
    return this.subscriptionService.getStats();
  }

  @Patch(':id')
  @UsePipes(new ZodValidationPipe(OverrideSubscriptionSchema))
  async overrideSubscription(
    @Param('id') id: string,
    @Body() dto: OverrideSubscriptionDto,
  ) {
    return this.subscriptionService.overrideSubscription(id, dto);
  }

  @Get('payments')
  async listPayments(
    @Query(new ZodValidationPipe(PaymentQuerySchema))
    query: PaymentQueryDto,
  ) {
    return this.paymentService.listPayments(query);
  }

  @Patch('payments/:id/confirm')
  @UsePipes(new ZodValidationPipe(ConfirmSubscriptionPaymentSchema))
  async confirmPayment(
    @Param('id') id: string,
    @Body() dto: ConfirmSubscriptionPaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.paymentService.confirmPayment(id, dto, user.id);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/subscription/subscription.controller.ts src/modules/subscription/subscription-admin.controller.ts
git commit -m "feat(backend): add subscription controllers for ADMIN and SUPER_ADMIN"
```

---

## Task 9: Subscription Module Wiring + App Integration

**Files:**
- Create: `sinaloka-backend/src/modules/subscription/subscription.module.ts`
- Modify: `sinaloka-backend/src/app.module.ts`
- Modify: `sinaloka-backend/src/modules/payment/payment-gateway.controller.ts`

- [ ] **Step 1: Create subscription module**

```ts
// src/modules/subscription/subscription.module.ts
import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionAdminController } from './subscription-admin.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionPaymentService } from './subscription-payment.service';
import { SubscriptionCronService } from './subscription-cron.service';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PaymentModule],
  controllers: [SubscriptionController, SubscriptionAdminController],
  providers: [
    SubscriptionService,
    SubscriptionPaymentService,
    SubscriptionCronService,
  ],
  exports: [SubscriptionService, SubscriptionPaymentService],
})
export class SubscriptionModule {}
```

Note: `PaymentModule` must export `MidtransService` for injection. Check if it does — if not, add `exports: [MidtransService]` to `PaymentModule`.

- [ ] **Step 2: Register in AppModule**

In `src/app.module.ts`:
- Add import: `import { SubscriptionModule } from './modules/subscription/subscription.module';`
- Add `SubscriptionModule` to the `imports` array
- Add `SubscriptionGuard` to the global guards (after `PlanGuard`)
- Add `SubscriptionWarningInterceptor` to the global interceptors (after `PlanWarningInterceptor`)

```ts
// Add to imports array:
SubscriptionModule,

// Add to providers array (after PlanGuard provider):
{
  provide: 'APP_GUARD',
  useClass: SubscriptionGuard,
},

// Add to providers array (after PlanWarningInterceptor):
{
  provide: 'APP_INTERCEPTOR',
  useClass: SubscriptionWarningInterceptor,
},
```

Add the necessary imports at the top:
```ts
import { SubscriptionGuard } from './modules/subscription/subscription.guard';
import { SubscriptionWarningInterceptor } from './modules/subscription/subscription-warning.interceptor';
```

- [ ] **Step 3: Add SUB- prefix routing to existing Midtrans webhook**

In `src/modules/payment/payment-gateway.controller.ts`, at the **top** of the `handleMidtransWebhook` method (before the existing `payment.findFirst` call), add:

```ts
// Route subscription payments to SubscriptionPaymentService
const orderId = body.order_id;
if (orderId && orderId.startsWith('SUB-')) {
  return this.subscriptionPaymentService.handleWebhook(body);
}
```

This requires injecting `SubscriptionPaymentService` into `PaymentGatewayController`:
- Add to constructor: `private readonly subscriptionPaymentService: SubscriptionPaymentService`
- Add import at top: `import { SubscriptionPaymentService } from '../subscription/subscription-payment.service';`
- `PaymentModule` needs to import `SubscriptionModule` or have `SubscriptionPaymentService` injected via forwardRef to avoid circular dependency.

**Circular dependency resolution:** Since `PaymentModule` is imported by `SubscriptionModule` (for `MidtransService`), and now `PaymentGatewayController` needs `SubscriptionPaymentService`, use `forwardRef`:

In `subscription.module.ts`, change:
```ts
imports: [forwardRef(() => PaymentModule)],
```

In `payment.module.ts`, add:
```ts
imports: [forwardRef(() => SubscriptionModule)],
```

And in `payment-gateway.controller.ts`:
```ts
constructor(
  // ... existing params
  @Inject(forwardRef(() => SubscriptionPaymentService))
  private readonly subscriptionPaymentService: SubscriptionPaymentService,
) {}
```

- [ ] **Step 4: Verify backend compiles**

```bash
cd sinaloka-backend
npx tsc --noEmit --pretty 2>&1 | head -30
```

Fix any TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/subscription/ src/app.module.ts src/modules/payment/
git commit -m "feat(backend): wire subscription module into app with guard, interceptor, and webhook routing"
```

---

## Task 10: Frontend — Types and Service Layer

**Files:**
- Create: `sinaloka-platform/src/types/subscription.ts`
- Create: `sinaloka-platform/src/services/subscription.service.ts`
- Create: `sinaloka-platform/src/hooks/useSubscription.ts`
- Reference: `sinaloka-platform/src/services/plan.service.ts` for API pattern
- Reference: `sinaloka-platform/src/hooks/usePlan.ts` for hook pattern

- [ ] **Step 1: Create types**

```ts
// src/types/subscription.ts
export interface SubscriptionStatus {
  plan_type: 'STARTER' | 'GROWTH' | 'BUSINESS';
  plan_config: {
    maxStudents: number | null;
    maxTutors: number | null;
    price: number | null;
    gracePeriodDays: number;
    features: Record<string, boolean>;
  };
  subscription: {
    id: string;
    status: 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED' | 'CANCELLED';
    started_at: string;
    expires_at: string;
    grace_ends_at: string | null;
    days_remaining: number;
    last_payment: SubscriptionPayment | null;
  } | null;
}

export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  institution_id: string;
  amount: number;
  method: 'MIDTRANS' | 'MANUAL_TRANSFER';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  midtrans_order_id: string | null;
  proof_url: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface SubscriptionInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  period_start: string;
  period_end: string;
  due_date: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  payment: SubscriptionPayment | null;
}

export interface CreatePaymentRequest {
  plan_type: 'GROWTH' | 'BUSINESS';
  method: 'MIDTRANS' | 'MANUAL_TRANSFER';
  type: 'new' | 'renewal';
  proof_url?: string;
}

export interface CreatePaymentResponse {
  payment_id: string;
  snap_token?: string;
  snap_redirect_url?: string;
  status?: string;
}

export interface SubscriptionWarning {
  type: 'EXPIRING_SOON' | 'EXPIRED' | 'GRACE_PERIOD' | 'DOWNGRADE_PENDING';
  days_remaining?: number;
  grace_ends_at?: string;
}

// SUPER_ADMIN types
export interface SubscriptionListItem {
  id: string;
  institution_id: string;
  plan_type: string;
  status: string;
  started_at: string;
  expires_at: string;
  grace_ends_at: string | null;
  institution: { id: string; name: string };
  payments: SubscriptionPayment[];
}

export interface SubscriptionStats {
  plan_counts: { STARTER: number; GROWTH: number; BUSINESS: number };
  expiring_soon: number;
  pending_payments: number;
  monthly_revenue: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
```

- [ ] **Step 2: Create service**

```ts
// src/services/subscription.service.ts
import api from '../lib/api';
import type {
  SubscriptionStatus,
  SubscriptionInvoice,
  CreatePaymentRequest,
  CreatePaymentResponse,
  SubscriptionListItem,
  SubscriptionPayment,
  SubscriptionStats,
  PaginatedResponse,
} from '../types/subscription';

export const subscriptionService = {
  // ADMIN endpoints
  getStatus: () =>
    api.get<SubscriptionStatus>('/api/subscription').then((r) => r.data),

  getInvoices: () =>
    api.get<SubscriptionInvoice[]>('/api/subscription/invoices').then((r) => r.data),

  createPayment: (data: CreatePaymentRequest) =>
    api.post<CreatePaymentResponse>('/api/subscription/pay', data).then((r) => r.data),

  // SUPER_ADMIN endpoints
  listSubscriptions: (params?: Record<string, any>) =>
    api
      .get<PaginatedResponse<SubscriptionListItem>>('/api/admin/subscriptions', { params })
      .then((r) => r.data),

  getStats: () =>
    api.get<SubscriptionStats>('/api/admin/subscriptions/stats').then((r) => r.data),

  overrideSubscription: (id: string, data: Record<string, any>) =>
    api.patch(`/api/admin/subscriptions/${id}`, data).then((r) => r.data),

  listPayments: (params?: Record<string, any>) =>
    api
      .get<PaginatedResponse<SubscriptionPayment>>('/api/admin/subscriptions/payments', { params })
      .then((r) => r.data),

  confirmPayment: (id: string, data: { action: 'approve' | 'reject'; notes?: string }) =>
    api.patch(`/api/admin/subscriptions/payments/${id}/confirm`, data).then((r) => r.data),
};
```

- [ ] **Step 3: Create hooks**

```ts
// src/hooks/useSubscription.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionService } from '../services/subscription.service';
import type { CreatePaymentRequest } from '../types/subscription';

// ADMIN hooks
export function useSubscriptionStatus() {
  return useQuery({
    queryKey: ['subscription-status'],
    queryFn: subscriptionService.getStatus,
  });
}

export function useSubscriptionInvoices() {
  return useQuery({
    queryKey: ['subscription-invoices'],
    queryFn: subscriptionService.getInvoices,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePaymentRequest) =>
      subscriptionService.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-invoices'] });
    },
  });
}

// SUPER_ADMIN hooks
export function useSubscriptionList(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['admin-subscriptions', params],
    queryFn: () => subscriptionService.listSubscriptions(params),
  });
}

export function useSubscriptionStats() {
  return useQuery({
    queryKey: ['admin-subscription-stats'],
    queryFn: subscriptionService.getStats,
  });
}

export function useOverrideSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      subscriptionService.overrideSubscription(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscription-stats'] });
    },
  });
}

export function useSubscriptionPayments(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['admin-subscription-payments', params],
    queryFn: () => subscriptionService.listPayments(params),
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { action: 'approve' | 'reject'; notes?: string };
    }) => subscriptionService.confirmPayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscription-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscription-stats'] });
    },
  });
}
```

- [ ] **Step 4: Commit**

```bash
cd sinaloka-platform
git add src/types/subscription.ts src/services/subscription.service.ts src/hooks/useSubscription.ts
git commit -m "feat(platform): add subscription types, service, and hooks"
```

---

## Task 11: Frontend — PlansTab Subscription Components

**Files:**
- Create: `sinaloka-platform/src/pages/Settings/tabs/PlansTab/SubscriptionStatusCard.tsx`
- Create: `sinaloka-platform/src/pages/Settings/tabs/PlansTab/PaymentModal.tsx`
- Create: `sinaloka-platform/src/pages/Settings/tabs/PlansTab/InvoiceTable.tsx`
- Modify: `sinaloka-platform/src/pages/Settings/tabs/PlansTab.tsx`

- [ ] **Step 1: Read current PlansTab to understand exact structure**

Read `src/pages/Settings/tabs/PlansTab.tsx` completely.

- [ ] **Step 2: Create SubscriptionStatusCard**

```tsx
// src/pages/Settings/tabs/PlansTab/SubscriptionStatusCard.tsx
import { Calendar, Clock, AlertTriangle } from 'lucide-react';
import type { SubscriptionStatus } from '../../../../types/subscription';

const statusConfig = {
  ACTIVE: { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  GRACE_PERIOD: { label: 'Grace Period', color: 'bg-amber-100 text-amber-700' },
  EXPIRED: { label: 'Expired', color: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-zinc-100 text-zinc-500' },
} as const;

interface Props {
  data: SubscriptionStatus;
  onRenew: () => void;
}

export function SubscriptionStatusCard({ data, onRenew }: Props) {
  if (!data.subscription) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500">
              Free Plan
            </span>
            <h3 className="mt-2 text-lg font-semibold text-zinc-900">STARTER</h3>
            <p className="text-sm text-zinc-500">
              {data.plan_config.maxStudents} siswa, {data.plan_config.maxTutors} tutor
            </p>
          </div>
        </div>
      </div>
    );
  }

  const sub = data.subscription;
  const config = statusConfig[sub.status] ?? statusConfig.EXPIRED;
  const expiresAt = new Date(sub.expires_at);
  const showRenew = sub.status === 'ACTIVE' && sub.days_remaining <= 7;
  const isGrace = sub.status === 'GRACE_PERIOD';

  return (
    <div
      className={`rounded-xl border p-6 mb-6 ${
        isGrace
          ? 'border-amber-300 bg-amber-50'
          : sub.status === 'EXPIRED'
            ? 'border-red-300 bg-red-50'
            : 'border-zinc-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${config.color}`}
          >
            {config.label}
          </span>
          <h3 className="mt-2 text-lg font-semibold text-zinc-900">
            {data.plan_type} Plan
          </h3>
          <div className="mt-2 flex items-center gap-4 text-sm text-zinc-500">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              Berlaku sampai {expiresAt.toLocaleDateString('id-ID')}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {sub.days_remaining} hari tersisa
            </span>
          </div>
        </div>

        {(showRenew || isGrace || sub.status === 'EXPIRED') && (
          <button
            onClick={onRenew}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {sub.status === 'EXPIRED' ? 'Upgrade Kembali' : 'Perpanjang'}
          </button>
        )}
      </div>

      {isGrace && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-100 p-3 text-sm text-amber-800">
          <AlertTriangle size={16} />
          <span>
            Subscription telah expired. Anda memiliki waktu hingga{' '}
            {sub.grace_ends_at
              ? new Date(sub.grace_ends_at).toLocaleDateString('id-ID')
              : '7 hari'}{' '}
            sebelum di-downgrade ke STARTER.
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create PaymentModal**

```tsx
// src/pages/Settings/tabs/PlansTab/PaymentModal.tsx
import { useState } from 'react';
import { CreditCard, Upload, Loader2 } from 'lucide-react';
import { useCreatePayment } from '../../../../hooks/useSubscription';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  planType: 'GROWTH' | 'BUSINESS';
  type: 'new' | 'renewal';
  price: number;
}

export function PaymentModal({ isOpen, onClose, planType, type, price }: Props) {
  const [method, setMethod] = useState<'MIDTRANS' | 'MANUAL_TRANSFER'>('MIDTRANS');
  const [proofUrl, setProofUrl] = useState('');
  const createPayment = useCreatePayment();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      const result = await createPayment.mutateAsync({
        plan_type: planType,
        method,
        type,
        proof_url: method === 'MANUAL_TRANSFER' ? proofUrl : undefined,
      });

      if (result.snap_redirect_url) {
        window.location.href = result.snap_redirect_url;
      } else {
        toast.success('Pembayaran dikirim. Menunggu konfirmasi admin.');
        onClose();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? 'Gagal membuat pembayaran');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-900">
          {type === 'renewal' ? 'Perpanjang' : 'Upgrade ke'} {planType}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Rp {price.toLocaleString('id-ID')} / bulan
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => setMethod('MIDTRANS')}
            className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition ${
              method === 'MIDTRANS'
                ? 'border-zinc-900 bg-zinc-50'
                : 'border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <CreditCard size={20} />
            <div>
              <p className="text-sm font-medium">Bayar via Midtrans</p>
              <p className="text-xs text-zinc-500">
                Transfer bank, e-wallet, kartu kredit
              </p>
            </div>
          </button>

          <button
            onClick={() => setMethod('MANUAL_TRANSFER')}
            className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition ${
              method === 'MANUAL_TRANSFER'
                ? 'border-zinc-900 bg-zinc-50'
                : 'border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <Upload size={20} />
            <div>
              <p className="text-sm font-medium">Transfer Manual</p>
              <p className="text-xs text-zinc-500">
                Transfer lalu upload bukti bayar
              </p>
            </div>
          </button>
        </div>

        {method === 'MANUAL_TRANSFER' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-zinc-700">
              URL Bukti Transfer
            </label>
            <input
              type="url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              createPayment.isPending ||
              (method === 'MANUAL_TRANSFER' && !proofUrl)
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {createPayment.isPending && <Loader2 size={16} className="animate-spin" />}
            Bayar
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create InvoiceTable**

```tsx
// src/pages/Settings/tabs/PlansTab/InvoiceTable.tsx
import { useSubscriptionInvoices } from '../../../../hooks/useSubscription';
import type { SubscriptionInvoice } from '../../../../types/subscription';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-zinc-100 text-zinc-600',
  SENT: 'bg-blue-100 text-blue-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-zinc-100 text-zinc-500',
};

export function InvoiceTable() {
  const { data: invoices, isLoading } = useSubscriptionInvoices();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-100" />
        ))}
      </div>
    );
  }

  if (!invoices?.length) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        Belum ada invoice
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-500">
              No. Invoice
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-500">
              Periode
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-500">
              Jumlah
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-500">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv: SubscriptionInvoice) => (
            <tr key={inv.id} className="border-b border-zinc-100 last:border-0">
              <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                {inv.invoice_number}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-500">
                {new Date(inv.period_start).toLocaleDateString('id-ID')} —{' '}
                {new Date(inv.period_end).toLocaleDateString('id-ID')}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-900">
                Rp {inv.amount.toLocaleString('id-ID')}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    statusColors[inv.status] ?? statusColors.DRAFT
                  }`}
                >
                  {inv.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Modify PlansTab to integrate new components**

Read the current `PlansTab.tsx` first, then add imports and render the new components above the existing pricing cards. Add the `SubscriptionStatusCard` at the top, `InvoiceTable` below it, and trigger `PaymentModal` from both the status card's renew button and the pricing card's upgrade button.

Key changes to `PlansTab.tsx`:
- Import `useSubscriptionStatus` and the 3 new components
- Add state for `paymentModal` (open/close, selected plan, type)
- Render `SubscriptionStatusCard` above pricing cards
- Render `InvoiceTable` below pricing cards (in a collapsible section)
- Render `PaymentModal`
- Replace the existing "Request Upgrade" button with a direct payment button that opens `PaymentModal`

- [ ] **Step 6: Commit**

```bash
cd sinaloka-platform
git add src/pages/Settings/tabs/PlansTab/
git commit -m "feat(platform): add subscription status, payment modal, and invoice table to PlansTab"
```

---

## Task 12: Frontend — Extend PlanWarningBanner

**Files:**
- Modify: `sinaloka-platform/src/components/PlanWarningBanner.tsx`

- [ ] **Step 1: Read current PlanWarningBanner**

Read `src/components/PlanWarningBanner.tsx` completely to understand current logic.

- [ ] **Step 2: Add subscription warning cases**

Add subscription warnings that take priority over plan limit warnings. The subscription warning comes from `_subscriptionWarning` in API responses. Add a hook or check in the banner component:

- Import `useSubscriptionStatus` from hooks
- Check `subscription?.status` and `days_remaining`
- If subscription is in `GRACE_PERIOD` → show red banner: "Subscription expired. X hari tersisa sebelum downgrade."
- If subscription is `ACTIVE` and `days_remaining <= 7` → show amber banner: "Subscription berakhir dalam X hari."
- These cases should render **above/before** the existing plan limit warnings
- Link to `/settings?tab=plans` for action

- [ ] **Step 3: Commit**

```bash
cd sinaloka-platform
git add src/components/PlanWarningBanner.tsx
git commit -m "feat(platform): add subscription expiry and grace period warnings to PlanWarningBanner"
```

---

## Task 13: Frontend — SUPER_ADMIN Subscription Management Page

**Files:**
- Create: `sinaloka-platform/src/pages/SuperAdmin/SubscriptionManagement.tsx`
- Modify: `sinaloka-platform/src/components/SuperAdminLayout.tsx`
- Modify: `sinaloka-platform/src/App.tsx`
- Reference: `sinaloka-platform/src/pages/SuperAdmin/UpgradeRequests.tsx` for pattern

- [ ] **Step 1: Read UpgradeRequests.tsx and SuperAdminLayout.tsx for patterns**

Read both files to understand the exact UI patterns.

- [ ] **Step 2: Create SubscriptionManagement page**

Follow the same pattern as `UpgradeRequests.tsx`:
- Import UI components from `../../components/UI`
- Use the subscription hooks from `../../hooks/useSubscription`
- Build 4 sections:
  1. **Stats cards** (top): plan counts, expiring soon, pending payments, monthly revenue
  2. **Subscription table** with filters (status, plan type)
  3. **Pending payments tab** with approve/reject buttons
  4. **Override modal** for direct plan changes

The page should use tabs (Subscriptions | Pending Payments | Payment History) similar to how UpgradeRequests uses filter tabs.

- [ ] **Step 3: Add sidebar item in SuperAdminLayout.tsx**

In `src/components/SuperAdminLayout.tsx`, add a new `SidebarItem` after the existing upgrade-requests item (around line 107):

```tsx
<SidebarItem
  icon={CreditCard}
  label="Subscriptions"
  href="/super/subscriptions"
  active={pathname === '/super/subscriptions'}
  minimized={minimized}
/>
```

Import `CreditCard` from `lucide-react`.

- [ ] **Step 4: Add route in App.tsx**

In `src/App.tsx`, inside the `<SuperAdminLayout>` routes section (around line 50), add:

```tsx
<Route path="/super/subscriptions" element={<SubscriptionManagement />} />
```

Import the component at the top.

- [ ] **Step 5: Verify frontend builds**

```bash
cd sinaloka-platform
npm run lint && npm run build
```

- [ ] **Step 6: Commit**

```bash
cd sinaloka-platform
git add src/pages/SuperAdmin/SubscriptionManagement.tsx src/components/SuperAdminLayout.tsx src/App.tsx
git commit -m "feat(platform): add SUPER_ADMIN subscription management page with sidebar and routing"
```

---

## Task 14: Backend Deprecation — UpgradeRequest Cleanup

**Files:**
- Modify: `sinaloka-backend/src/modules/plan/plan.controller.ts`
- Modify: `sinaloka-backend/src/modules/plan/plan.service.ts`

- [ ] **Step 1: Mark UpgradeRequest endpoints as deprecated**

In `plan.controller.ts`, add `@Deprecated()` comment and a response header to the upgrade-request endpoints. Don't remove them yet — just mark as deprecated so existing clients get a warning:

```ts
@Post('upgrade-request')
@Roles('ADMIN', 'SUPER_ADMIN')
async requestUpgrade(...) {
  // Deprecated: Use POST /api/subscription/pay instead
  throw new BadRequestException(
    'Upgrade requests are deprecated. Please use the subscription payment flow at /api/subscription/pay.',
  );
}
```

Keep `GET /upgrade-requests` and `PATCH /upgrade-requests/:id` functional for SUPER_ADMIN to resolve existing pending requests.

- [ ] **Step 2: Commit**

```bash
cd sinaloka-backend
git add src/modules/plan/
git commit -m "refactor(backend): deprecate UpgradeRequest in favor of subscription payment flow"
```

---

## Task 15: Environment Variables and Final Verification

**Files:**
- Modify: `sinaloka-backend/.env.example`

- [ ] **Step 1: Add new env vars to .env.example**

```
# Subscription Midtrans (platform-level)
SUBSCRIPTION_MIDTRANS_SERVER_KEY=
SUBSCRIPTION_MIDTRANS_CLIENT_KEY=
SUBSCRIPTION_MIDTRANS_SANDBOX=true
```

- [ ] **Step 2: Full backend verification**

```bash
cd sinaloka-backend
npm run lint
npm run build
npm run test -- --ci 2>&1 | tail -20
```

Fix any issues.

- [ ] **Step 3: Full frontend verification**

```bash
cd sinaloka-platform
npm run lint
npm run build
```

Fix any issues.

- [ ] **Step 4: Final commit**

```bash
git add sinaloka-backend/.env.example
git commit -m "docs(backend): add subscription Midtrans env vars to .env.example"
```

---

## Dependency Graph

```
Task 1 (Schema) ──┬── Task 2 (Constants/DTOs) ──┬── Task 3 (Service) ─── Task 4 (Payment Service)
                   │                              │                        │
                   │                              └── Task 6 (Guard)       ├── Task 5 (Email)
                   │                                                       │
                   │                                                       └── Task 7 (Cron)
                   │
                   └────────────────────────────── Task 9 (Module Wiring) ← depends on Tasks 3-8
                                                      │
                   Task 10 (FE Types/Service) ────────┘
                      │
                      ├── Task 11 (FE PlansTab Components)
                      ├── Task 12 (FE PlanWarningBanner)
                      └── Task 13 (FE SUPER_ADMIN Page)

Task 14 (Deprecation) — independent, can run anytime after Task 9
Task 15 (Env + Verification) — final, depends on all
```

**Parallelizable tasks:**
- Tasks 3, 5, 6, 7 can be worked in parallel after Task 2
- Tasks 11, 12, 13 can be worked in parallel after Task 10
- Task 14 is independent of frontend tasks
