# Unified Midtrans & Settlement Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify Midtrans config to a single platform account and add settlement tracking for Super Admin to manage money transfers to institutions.

**Architecture:** Replace per-institution Midtrans keys (DB) with single env vars. Add Settlement model to track money flow from Midtrans → Sinaloka → Institution. Webhook creates Settlement atomically with payment status update.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Zod, React, TailwindCSS, TanStack Query

**Spec:** `docs/superpowers/specs/2026-03-21-unified-midtrans-settlement-design.md`

---

## File Structure

### New Files
- `sinaloka-backend/prisma/migrations/<timestamp>_add_settlement_model/migration.sql` — Settlement table + enum + Payment.midtrans_payment_type column
- `sinaloka-backend/src/modules/settlement/settlement.module.ts` — Module registration
- `sinaloka-backend/src/modules/settlement/settlement.controller.ts` — 5 SUPER_ADMIN endpoints
- `sinaloka-backend/src/modules/settlement/settlement.service.ts` — CRUD, summary, report, fee calculation
- `sinaloka-backend/src/modules/settlement/settlement.dto.ts` — Zod schemas for query/transfer DTOs
- `sinaloka-backend/src/modules/settlement/fee-rates.ts` — Fee rate config + calculation helper
- `sinaloka-platform/src/pages/SuperAdmin/Settlements.tsx` — Settlement management page

### Modified Files
- `sinaloka-backend/prisma/schema.prisma` — Add Settlement model, SettlementStatus enum, Payment.midtrans_payment_type, backrefs
- `sinaloka-backend/.env.example` — Rename SUBSCRIPTION_MIDTRANS_* → MIDTRANS_*
- `sinaloka-backend/src/modules/settings/settings.service.ts` — getPaymentGatewayConfig() reads env vars
- `sinaloka-backend/src/modules/subscription/subscription-payment.service.ts` — Rename env var keys
- `sinaloka-backend/src/modules/payment/payment-gateway.controller.ts` — Atomic webhook + settlement creation + ConfigService injection
- `sinaloka-backend/src/app.module.ts` — Import SettlementModule
- `sinaloka-backend/src/modules/parent/parent.service.ts` — Simplify gateway_configured
- `sinaloka-parent/src/components/PaymentList.tsx` — Remove gateway_configured check
- `sinaloka-platform/src/pages/SuperAdmin/BillingPaymentTab.tsx` — Remove Midtrans keys config section
- `sinaloka-platform/src/App.tsx` — Add settlements route
- `sinaloka-platform/src/services/settlements.ts` — API service for settlement endpoints

---

## Task 1: Prisma Schema — Settlement Model & Payment Field

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`

- [ ] **Step 1: Add SettlementStatus enum and Settlement model to schema.prisma**

Add after the existing `PayoutStatus` enum:

```prisma
enum SettlementStatus {
  PENDING
  TRANSFERRED
}
```

Add after the `Payment` model block (after line 561):

```prisma
model Settlement {
  id               String           @id @default(uuid())
  institution_id   String
  payment_id       String           @unique
  gross_amount     Decimal
  midtrans_fee     Decimal
  transfer_amount  Decimal
  platform_cost    Decimal
  status           SettlementStatus @default(PENDING)
  transferred_at   DateTime?
  transferred_by   String?
  notes            String?
  created_at       DateTime         @default(now())
  updated_at       DateTime         @updatedAt

  institution      Institution      @relation(fields: [institution_id], references: [id])
  payment          Payment          @relation(fields: [payment_id], references: [id])

  @@map("settlements")
}
```

- [ ] **Step 2: Add midtrans_payment_type field to Payment model**

In the Payment model (around line 552), add after `snap_redirect_url`:

```prisma
  midtrans_payment_type   String?
```

- [ ] **Step 3: Add backref on Payment model**

In the Payment model, add after the `enrollment` relation:

```prisma
  settlement      Settlement?
```

- [ ] **Step 4: Add backref on Institution model**

In the Institution model (around line 171), add after `subscription_invoices`:

```prisma
  settlements            Settlement[]
```

- [ ] **Step 5: Generate migration and Prisma client**

Run:
```bash
cd sinaloka-backend
npx prisma migrate dev --name add_settlement_model
npm run prisma:generate
```

Expected: Migration created successfully, Prisma client regenerated.

- [ ] **Step 6: Commit**

```bash
git add prisma/
git commit -m "feat(prisma): add Settlement model and midtrans_payment_type field"
```

---

## Task 2: Unified Midtrans Config — Environment Variables

**Files:**
- Modify: `sinaloka-backend/.env.example`
- Modify: `sinaloka-backend/src/modules/settings/settings.service.ts`
- Modify: `sinaloka-backend/src/modules/subscription/subscription-payment.service.ts`

**Note:** No change to `settings.module.ts` — `ConfigService` resolves from the global `ConfigModule` in `AppModule`.

- [ ] **Step 1: Update .env.example**

Replace lines 19-22:

```
# Subscription Midtrans (platform-level — Sinaloka as merchant)
SUBSCRIPTION_MIDTRANS_SERVER_KEY=
SUBSCRIPTION_MIDTRANS_CLIENT_KEY=
SUBSCRIPTION_MIDTRANS_SANDBOX=true
```

With:

```
# Midtrans (single account for all payments — SPP + subscription)
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_SANDBOX=true
MIDTRANS_FEE_RATES=
```

- [ ] **Step 2: Inject ConfigService into SettingsModule**

In `sinaloka-backend/src/modules/settings/settings.module.ts`, the module doesn't need to import ConfigModule because it's already registered globally in AppModule. But `SettingsService` needs `ConfigService` injected.

Modify `sinaloka-backend/src/modules/settings/settings.service.ts`:

Add import:
```typescript
import { ConfigService } from '@nestjs/config';
```

Update constructor:
```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly configService: ConfigService,
) {}
```

- [ ] **Step 3: Change getPaymentGatewayConfig() to read from env vars**

Replace the `getPaymentGatewayConfig` method (lines 267-279) with:

```typescript
async getPaymentGatewayConfig(_institutionId?: string) {
  return {
    provider: 'midtrans' as const,
    midtrans_server_key: this.configService.get<string>('MIDTRANS_SERVER_KEY') ?? '',
    midtrans_client_key: this.configService.get<string>('MIDTRANS_CLIENT_KEY') ?? '',
    is_sandbox: this.configService.get<string>('MIDTRANS_IS_SANDBOX') !== 'false',
  };
}
```

- [ ] **Step 4: Change getPaymentGateway() to read from env vars**

Replace the `getPaymentGateway` method (lines 172-197) with:

```typescript
async getPaymentGateway(_institutionId?: string) {
  const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY') ?? '';
  const clientKey = this.configService.get<string>('MIDTRANS_CLIENT_KEY') ?? '';

  const maskedServerKey = serverKey
    ? `${serverKey.slice(0, 4)}${'*'.repeat(Math.max(0, serverKey.length - 4))}`
    : '';

  return {
    provider: 'midtrans' as const,
    midtrans_server_key: maskedServerKey,
    midtrans_client_key: clientKey,
    is_sandbox: this.configService.get<string>('MIDTRANS_IS_SANDBOX') !== 'false',
    is_configured: !!serverKey && !!clientKey,
  };
}
```

- [ ] **Step 5: Make updatePaymentGateway() return 410 Gone**

Replace the `updatePaymentGateway` method (lines 199-224) with:

```typescript
async updatePaymentGateway(
  _institutionId: string,
  _dto: UpdatePaymentGatewayDto,
) {
  throw new GoneException(
    'Payment gateway configuration is now managed at platform level. Contact Super Admin.',
  );
}
```

Add `GoneException` to the imports from `@nestjs/common`.

- [ ] **Step 6: Remove PAYMENT_GATEWAY_DEFAULTS constant**

Delete lines 16-21 (the `PAYMENT_GATEWAY_DEFAULTS` constant) — no longer used.

- [ ] **Step 7: Update SubscriptionPaymentService env var names**

In `sinaloka-backend/src/modules/subscription/subscription-payment.service.ts`, update `getMidtransConfig()` (lines 31-43):

```typescript
private getMidtransConfig() {
  return {
    midtrans_server_key:
      this.configService.get<string>('MIDTRANS_SERVER_KEY') ?? '',
    midtrans_client_key:
      this.configService.get<string>('MIDTRANS_CLIENT_KEY') ?? '',
    is_sandbox:
      this.configService.get<string>('MIDTRANS_IS_SANDBOX') !== 'false',
  };
}
```

- [ ] **Step 8: Verify build passes**

Run:
```bash
cd sinaloka-backend
npm run build
```

Expected: Build succeeds.

- [ ] **Step 9: Commit**

```bash
git add sinaloka-backend/
git commit -m "refactor(settings): unify Midtrans config to single platform env vars"
```

---

## Task 3: Fee Rate Config & Calculation Helper

**Files:**
- Create: `sinaloka-backend/src/modules/settlement/fee-rates.ts`

- [ ] **Step 1: Create fee-rates.ts**

```typescript
import { ConfigService } from '@nestjs/config';

interface FeeRate {
  type: 'percentage' | 'flat';
  value: number;
}

const DEFAULT_FEE_RATES: Record<string, FeeRate> = {
  qris: { type: 'percentage', value: 0.007 },
  bank_transfer: { type: 'flat', value: 4000 },
  echannel: { type: 'flat', value: 4000 },
  cstore: { type: 'flat', value: 5000 },
  credit_card: { type: 'percentage', value: 0.029 },
  gopay: { type: 'percentage', value: 0.02 },
  shopeepay: { type: 'percentage', value: 0.02 },
};

export function getFeeRates(configService?: ConfigService): Record<string, FeeRate> {
  const overrideJson = configService?.get<string>('MIDTRANS_FEE_RATES');
  if (overrideJson) {
    try {
      return { ...DEFAULT_FEE_RATES, ...JSON.parse(overrideJson) };
    } catch {
      return DEFAULT_FEE_RATES;
    }
  }
  return DEFAULT_FEE_RATES;
}

export function calculateFee(
  grossAmount: number,
  paymentType: string,
  configService?: ConfigService,
): { midtransFee: number; transferAmount: number; platformCost: number } {
  const rates = getFeeRates(configService);
  const rate = rates[paymentType];

  let midtransFee = 0;
  if (rate) {
    midtransFee =
      rate.type === 'percentage'
        ? Math.round(grossAmount * rate.value)
        : rate.value;
  }

  // Platform absorbs fee — institution receives full gross amount
  return {
    midtransFee,
    transferAmount: grossAmount,
    platformCost: midtransFee,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-backend/src/modules/settlement/
git commit -m "feat(settlement): add fee rate config and calculation helper"
```

---

## Task 4: Settlement Service

**Files:**
- Create: `sinaloka-backend/src/modules/settlement/settlement.dto.ts`
- Create: `sinaloka-backend/src/modules/settlement/settlement.service.ts`

- [ ] **Step 1: Create settlement.dto.ts**

```typescript
import { z } from 'zod';

export const SettlementQuerySchema = z.object({
  institution_id: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'TRANSFERRED']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type SettlementQueryDto = z.infer<typeof SettlementQuerySchema>;

export const TransferSettlementSchema = z.object({
  transferred_at: z.coerce.date(),
  notes: z.string().optional(),
});
export type TransferSettlementDto = z.infer<typeof TransferSettlementSchema>;

export const BatchTransferSchema = z.object({
  settlement_ids: z.array(z.string().uuid()).min(1),
  transferred_at: z.coerce.date(),
  notes: z.string().optional(),
});
export type BatchTransferDto = z.infer<typeof BatchTransferSchema>;

export const ReportQuerySchema = z.object({
  institution_id: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM'),
});
export type ReportQueryDto = z.infer<typeof ReportQuerySchema>;
```

- [ ] **Step 2: Create settlement.service.ts**

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { calculateFee } from './fee-rates.js';
import type {
  SettlementQueryDto,
  TransferSettlementDto,
  BatchTransferDto,
  ReportQueryDto,
} from './settlement.dto.js';
import { buildPaginationMeta } from '../../common/dto/pagination.dto.js';

@Injectable()
export class SettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createFromPayment(
    paymentId: string,
    institutionId: string,
    grossAmount: number,
    paymentType: string,
  ) {
    const { midtransFee, transferAmount, platformCost } = calculateFee(
      grossAmount,
      paymentType,
      this.configService,
    );

    return this.prisma.settlement.create({
      data: {
        institution_id: institutionId,
        payment_id: paymentId,
        gross_amount: grossAmount,
        midtrans_fee: midtransFee,
        transfer_amount: transferAmount,
        platform_cost: platformCost,
        status: 'PENDING',
      },
    });
  }

  async findAll(query: SettlementQueryDto) {
    const { page, limit, institution_id, status, from, to } = query;
    const where: Record<string, unknown> = {};
    if (institution_id) where.institution_id = institution_id;
    if (status) where.status = status;
    if (from || to) {
      where.created_at = {
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.settlement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          institution: { select: { id: true, name: true } },
          payment: {
            select: {
              id: true,
              amount: true,
              student: { select: { id: true, name: true } },
              midtrans_payment_type: true,
            },
          },
        },
      }),
      this.prisma.settlement.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async getSummary() {
    const institutions = await this.prisma.settlement.groupBy({
      by: ['institution_id', 'status'],
      _sum: { transfer_amount: true, platform_cost: true },
      _count: { id: true },
    });

    const institutionIds = [
      ...new Set(institutions.map((i) => i.institution_id)),
    ];
    const institutionNames = await this.prisma.institution.findMany({
      where: { id: { in: institutionIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(institutionNames.map((i) => [i.id, i.name]));

    const grouped: Record<
      string,
      {
        institution_id: string;
        institution_name: string;
        pending_count: number;
        pending_amount: number;
        transferred_count: number;
        transferred_amount: number;
        total_platform_cost: number;
      }
    > = {};

    for (const row of institutions) {
      if (!grouped[row.institution_id]) {
        grouped[row.institution_id] = {
          institution_id: row.institution_id,
          institution_name: nameMap.get(row.institution_id) ?? 'Unknown',
          pending_count: 0,
          pending_amount: 0,
          transferred_count: 0,
          transferred_amount: 0,
          total_platform_cost: 0,
        };
      }
      const entry = grouped[row.institution_id];
      const amount = Number(row._sum.transfer_amount ?? 0);
      const cost = Number(row._sum.platform_cost ?? 0);

      if (row.status === 'PENDING') {
        entry.pending_count = row._count.id;
        entry.pending_amount = amount;
      } else {
        entry.transferred_count = row._count.id;
        entry.transferred_amount = amount;
      }
      entry.total_platform_cost += cost;
    }

    const list = Object.values(grouped);
    return {
      institutions: list,
      totals: {
        total_pending: list.reduce((s, i) => s + i.pending_amount, 0),
        total_transferred: list.reduce((s, i) => s + i.transferred_amount, 0),
        total_platform_cost: list.reduce(
          (s, i) => s + i.total_platform_cost,
          0,
        ),
      },
    };
  }

  async markTransferred(
    id: string,
    dto: TransferSettlementDto,
    userId: string,
  ) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
    });
    if (!settlement) throw new NotFoundException('Settlement not found');
    if (settlement.status === 'TRANSFERRED') {
      throw new BadRequestException('Settlement already transferred');
    }

    return this.prisma.settlement.update({
      where: { id },
      data: {
        status: 'TRANSFERRED',
        transferred_at: dto.transferred_at,
        transferred_by: userId,
        notes: dto.notes,
      },
    });
  }

  async batchTransfer(dto: BatchTransferDto, userId: string) {
    const count = await this.prisma.settlement.count({
      where: { id: { in: dto.settlement_ids }, status: 'PENDING' },
    });

    if (count !== dto.settlement_ids.length) {
      throw new BadRequestException(
        'Some settlements not found or already transferred',
      );
    }

    const result = await this.prisma.settlement.updateMany({
      where: { id: { in: dto.settlement_ids } },
      data: {
        status: 'TRANSFERRED',
        transferred_at: dto.transferred_at,
        transferred_by: userId,
        notes: dto.notes,
      },
    });

    return { updated: result.count };
  }

  async getReport(query: ReportQueryDto) {
    const [year, month] = query.period.split('-').map(Number);
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59);

    const institution = await this.prisma.institution.findUnique({
      where: { id: query.institution_id },
      select: { name: true },
    });

    if (!institution) throw new NotFoundException('Institution not found');

    const settlements = await this.prisma.settlement.findMany({
      where: {
        institution_id: query.institution_id,
        created_at: { gte: from, lte: to },
      },
      orderBy: { created_at: 'asc' },
      include: {
        payment: {
          select: {
            student: { select: { name: true } },
            midtrans_payment_type: true,
          },
        },
      },
    });

    const transactions = settlements.map((s) => ({
      date: s.created_at,
      student_name: s.payment.student?.name ?? 'Unknown',
      payment_type: s.payment.midtrans_payment_type,
      gross_amount: Number(s.gross_amount),
      midtrans_fee: Number(s.midtrans_fee),
      transfer_amount: Number(s.transfer_amount),
      platform_cost: Number(s.platform_cost),
      status: s.status,
      transferred_at: s.transferred_at,
    }));

    return {
      institution_name: institution.name,
      period: query.period,
      transactions,
      summary: {
        total_gross: transactions.reduce((s, t) => s + t.gross_amount, 0),
        total_fee: transactions.reduce((s, t) => s + t.midtrans_fee, 0),
        total_net: transactions.reduce(
          (s, t) => s + t.transfer_amount,
          0,
        ),
        total_platform_cost: transactions.reduce(
          (s, t) => s + t.platform_cost,
          0,
        ),
      },
    };
  }
}
```

- [ ] **Step 3: Verify build passes**

Run:
```bash
cd sinaloka-backend
npm run build
```

Expected: May fail because module not registered yet — that's OK, proceed to Task 5.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/settlement/
git commit -m "feat(settlement): add settlement service with fee calculation, CRUD, summary and report"
```

---

## Task 5: Settlement Controller & Module

**Files:**
- Create: `sinaloka-backend/src/modules/settlement/settlement.controller.ts`
- Create: `sinaloka-backend/src/modules/settlement/settlement.module.ts`
- Modify: `sinaloka-backend/src/app.module.ts`

- [ ] **Step 1: Create settlement.controller.ts**

```typescript
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { SettlementService } from './settlement.service.js';
import {
  SettlementQuerySchema,
  TransferSettlementSchema,
  BatchTransferSchema,
  ReportQuerySchema,
} from './settlement.dto.js';
import type {
  SettlementQueryDto,
  TransferSettlementDto,
  BatchTransferDto,
  ReportQueryDto,
} from './settlement.dto.js';

@Controller('admin/settlements')
@Roles(Role.SUPER_ADMIN)
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(SettlementQuerySchema))
    query: SettlementQueryDto,
  ) {
    return this.settlementService.findAll(query);
  }

  @Get('summary')
  async getSummary() {
    return this.settlementService.getSummary();
  }

  @Get('report')
  async getReport(
    @Query(new ZodValidationPipe(ReportQuerySchema)) query: ReportQueryDto,
  ) {
    return this.settlementService.getReport(query);
  }

  @Patch('batch-transfer')
  async batchTransfer(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(BatchTransferSchema)) dto: BatchTransferDto,
  ) {
    return this.settlementService.batchTransfer(dto, user.userId);
  }

  @Patch(':id/transfer')
  async markTransferred(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(TransferSettlementSchema))
    dto: TransferSettlementDto,
  ) {
    return this.settlementService.markTransferred(id, dto, user.userId);
  }
}
```

**Note:** `batch-transfer` route is defined before `:id/transfer` to avoid NestJS route matching conflict.

- [ ] **Step 2: Create settlement.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { SettlementController } from './settlement.controller.js';
import { SettlementService } from './settlement.service.js';

@Module({
  controllers: [SettlementController],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}
```

- [ ] **Step 3: Register SettlementModule in AppModule**

In `sinaloka-backend/src/app.module.ts`:

Add import:
```typescript
import { SettlementModule } from './modules/settlement/settlement.module.js';
```

Add `SettlementModule` to the `imports` array (after `SubscriptionModule`).

- [ ] **Step 4: Verify build passes**

Run:
```bash
cd sinaloka-backend
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/settlement/ sinaloka-backend/src/app.module.ts
git commit -m "feat(settlement): add settlement controller and module with 5 Super Admin endpoints"
```

---

## Task 6: Webhook — Atomic Payment + Settlement Creation

**Files:**
- Modify: `sinaloka-backend/src/modules/payment/payment-gateway.controller.ts`

**Note:** The existing gateway config check block (lines 165-176) is intentionally preserved. After Task 2, it reads from env vars instead of DB — if `MIDTRANS_SERVER_KEY` is not set, all webhooks will fail. This is correct behavior (fail-fast if config missing).

- [ ] **Step 1: Add imports to PaymentGatewayController**

In `payment-gateway.controller.ts`, add imports:
```typescript
import { ConfigService } from '@nestjs/config';
import { calculateFee } from '../settlement/fee-rates.js';
```

Add `ConfigService` to constructor:
```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly settingsService: SettingsService,
  private readonly midtransService: MidtransService,
  private readonly configService: ConfigService,
  @Inject(forwardRef(() => SubscriptionPaymentService))
  private readonly subscriptionPaymentService: SubscriptionPaymentService,
) {}
```

- [ ] **Step 2: Update webhook to save midtrans_payment_type and create Settlement atomically**

Replace the webhook's status update block (lines 197-211) with:

```typescript
    const paymentType = (body.payment_type as string) ?? 'unknown';

    if (newStatus !== null) {
      if (newStatus === 'PAID') {
        const { midtransFee, transferAmount, platformCost } = calculateFee(
          Number(payment.amount),
          paymentType,
          this.configService,
        );

        await this.prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: 'PAID',
              paid_date: new Date(),
              method: 'MIDTRANS',
              midtrans_payment_type: paymentType,
            },
          });

          await tx.settlement.create({
            data: {
              institution_id: payment.institution_id,
              payment_id: payment.id,
              gross_amount: Number(payment.amount),
              midtrans_fee: midtransFee,
              transfer_amount: transferAmount,
              platform_cost: platformCost,
              status: 'PENDING',
            },
          });
        });
      } else {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: newStatus,
            midtrans_payment_type: paymentType,
          },
        });
      }
    }
```

- [ ] **Step 3: Verify build passes**

Run:
```bash
cd sinaloka-backend
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/payment/
git commit -m "feat(payment): create settlement atomically on webhook PAID with fee calculation"
```

---

## Task 7: Simplify Parent Gateway Check

**Files:**
- Modify: `sinaloka-backend/src/modules/parent/parent.service.ts`
- Modify: `sinaloka-parent/src/components/PaymentList.tsx`

- [ ] **Step 1: Simplify gateway_configured in ParentService**

In `sinaloka-backend/src/modules/parent/parent.service.ts`, around lines 317-339, replace the `getPaymentGatewayConfig` call. Change:

```typescript
    const [data, total, gatewayConfig] = await Promise.all([
      this.prisma.payment.findMany({...}),
      this.prisma.payment.count({ where }),
      this.settingsService.getPaymentGatewayConfig(institutionId),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
      gateway_configured: !!gatewayConfig.midtrans_server_key,
    };
```

To:

```typescript
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({...}),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
      gateway_configured: true,
    };
```

Remove the `getPaymentGatewayConfig` call entirely — Midtrans is always available now. Keep `gateway_configured: true` for backward compatibility with the parent app during transition.

- [ ] **Step 2: Remove gateway_configured check in PaymentList.tsx**

In `sinaloka-parent/src/components/PaymentList.tsx`, change line 51-53:

From:
```typescript
        const canPay =
          (payment.status === 'PENDING' || payment.status === 'OVERDUE') &&
          payment.gateway_configured;
```

To:
```typescript
        const canPay =
          payment.status === 'PENDING' || payment.status === 'OVERDUE';
```

- [ ] **Step 3: Verify both builds pass**

Run:
```bash
cd sinaloka-backend && npm run build
cd ../sinaloka-parent && npm run build
```

Expected: Both build successfully.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/parent/ sinaloka-parent/src/components/PaymentList.tsx
git commit -m "refactor(parent): remove per-institution gateway check — Midtrans always available"
```

---

## Task 8: Remove Midtrans Keys Config UI from Platform

**Files:**
- Modify: `sinaloka-platform/src/pages/SuperAdmin/BillingPaymentTab.tsx`

- [ ] **Step 1: Read the current BillingPaymentTab.tsx to understand its structure**

Read: `sinaloka-platform/src/pages/SuperAdmin/BillingPaymentTab.tsx`

Identify the Midtrans keys config section (server key, client key, sandbox toggle inputs).

- [ ] **Step 2: Remove the Midtrans keys configuration section**

Remove the section that allows per-institution Midtrans key configuration. Keep the rest of the BillingPaymentTab if it has other billing-related functionality. If the entire file is only about Midtrans keys, hide the whole tab or replace its content with a notice:

```tsx
<div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center">
  <p className="text-zinc-400 text-sm">
    Payment gateway dikelola di level platform. Semua institusi otomatis terhubung ke Midtrans.
  </p>
</div>
```

- [ ] **Step 3: Verify platform build passes**

Run:
```bash
cd sinaloka-platform && npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/
git commit -m "refactor(platform): remove per-institution Midtrans keys config UI"
```

---

## Task 9: Settlement Page in Super Admin

**Files:**
- Create: `sinaloka-platform/src/services/settlements.ts`
- Create: `sinaloka-platform/src/pages/SuperAdmin/Settlements.tsx`
- Modify: `sinaloka-platform/src/App.tsx`
- Modify: `sinaloka-platform/src/components/SuperAdminLayout.tsx`

- [ ] **Step 1: Read existing Super Admin pages to understand patterns**

Read: `sinaloka-platform/src/pages/SuperAdmin/SubscriptionManagement.tsx` (for data table + action pattern)
Read: `sinaloka-platform/src/services/` — check an existing service file for API call patterns (e.g. `subscriptions.ts` or `payments.ts`)

- [ ] **Step 2: Create API service file**

Create `sinaloka-platform/src/services/settlements.ts` with functions for:
- `getSettlements(params)` → `GET /api/admin/settlements`
- `getSettlementSummary()` → `GET /api/admin/settlements/summary`
- `getSettlementReport(params)` → `GET /api/admin/settlements/report`
- `markTransferred(id, data)` → `PATCH /api/admin/settlements/:id/transfer`
- `batchTransfer(data)` → `PATCH /api/admin/settlements/batch-transfer`

Follow existing service patterns for Axios calls and auth headers.

- [ ] **Step 3: Create Settlements.tsx**

Build a page with:
- **Summary section** at top — cards showing total PENDING amount, total TRANSFERRED amount, total platform cost
- **Table** — list of settlements with columns: Date, Institution, Student, Amount, Fee, Transfer Amount, Status, Action
- **Filters** — institution dropdown, status filter, date range
- **Actions** — "Mark as Transferred" button per row, batch select + transfer
- **Report** — link/tab to view per-institution monthly report

Use TanStack Query hooks wrapping the service functions from Step 2. Follow existing patterns from `SubscriptionManagement.tsx` for data fetching, table layout, action buttons, and toast notifications.

- [ ] **Step 4: Add route in App.tsx**

In `sinaloka-platform/src/App.tsx`, add import:
```tsx
import Settlements from './pages/SuperAdmin/Settlements';
```

Add route after line 52 (inside the `<Route element={<SuperAdminLayout />}>` block):
```tsx
<Route path="settlements" element={<Settlements />} />
```

- [ ] **Step 5: Add sidebar link in SuperAdminLayout.tsx**

In `sinaloka-platform/src/components/SuperAdminLayout.tsx`, after line 108 (after the Subscriptions sidebar item), add:
```tsx
<SidebarItem icon={Banknote} label="Settlements" href="/super/settlements" active={location.pathname === '/super/settlements'} minimized={isSidebarMinimized} />
```

Add `Banknote` to the Lucide icons import at the top of the file.

- [ ] **Step 4: Verify platform build passes**

Run:
```bash
cd sinaloka-platform && npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/
git commit -m "feat(platform): add Settlement management page for Super Admin"
```

---

## Task 10: Environment Variables & Final Verification

**Files:**
- Railway dashboard (manual)
- Local `.env` file

- [ ] **Step 1: Update local .env file**

Add to your local `sinaloka-backend/.env`:
```
MIDTRANS_SERVER_KEY=<your sandbox server key>
MIDTRANS_CLIENT_KEY=<your sandbox client key>
MIDTRANS_IS_SANDBOX=true
```

Remove old `SUBSCRIPTION_MIDTRANS_*` vars if present.

- [ ] **Step 2: Run full build verification**

```bash
cd sinaloka-backend && npm run build && npm run lint
cd ../sinaloka-platform && npm run build
cd ../sinaloka-parent && npm run build
```

Expected: All pass.

- [ ] **Step 3: Test locally (manual)**

1. Start backend: `cd sinaloka-backend && npm run start:dev`
2. Start parent app: `cd sinaloka-parent && npm run dev`
3. Create a test payment, try checkout — should redirect to Midtrans sandbox
4. Use Midtrans sandbox simulator to complete payment
5. Check webhook arrives and Settlement record is created
6. Open platform Super Admin → Settlements page → verify data shows

- [ ] **Step 4: Set Railway environment variables (production)**

In Railway dashboard, add:
```
MIDTRANS_SERVER_KEY=<production server key>
MIDTRANS_CLIENT_KEY=<production client key>
MIDTRANS_IS_SANDBOX=false
```

Remove old `SUBSCRIPTION_MIDTRANS_*` vars.

- [ ] **Step 5: Configure Midtrans webhook URL**

In Midtrans dashboard (sandbox + production):
- Set webhook/notification URL to: `https://api.sinaloka.com/api/payments/midtrans-webhook`
- Enable QRIS payment method
- Disable other payment methods for now

- [ ] **Step 6: Final commit if any remaining changes**

```bash
git add -A
git commit -m "chore: final cleanup and env var updates for unified Midtrans integration"
```
