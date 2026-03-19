# Midtrans Payment Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Midtrans Snap so parents can pay tuition fees online, with per-institution merchant accounts, webhook-based status updates, and payment links shareable by admins.

**Architecture:** New `PaymentGatewayController` + `MidtransService` in backend. Extend Prisma Payment model with 3 fields + add MIDTRANS to PaymentMethod enum. Extend SettingsService with payment_gateway namespace. Add Payment Gateway tab to platform settings. Add "Bayar" button + status page to parent app.

**Tech Stack:** NestJS, Prisma, midtrans-client SDK, React, TailwindCSS v4

---

## File Structure

### Backend — New files
- `sinaloka-backend/src/modules/payment/midtrans.service.ts` — Midtrans SDK wrapper (create transaction, verify signature)
- `sinaloka-backend/src/modules/payment/payment-gateway.controller.ts` — checkout, webhook, status endpoints
- `sinaloka-backend/src/modules/payment/payment-gateway.controller.spec.ts` — controller tests
- `sinaloka-backend/src/modules/payment/midtrans.service.spec.ts` — service tests

### Backend — Modified files
- `sinaloka-backend/prisma/schema.prisma` — add 3 fields to Payment, add MIDTRANS to enum
- `sinaloka-backend/src/modules/payment/payment.module.ts` — register new controller + service
- `sinaloka-backend/src/modules/settings/settings.service.ts` — add getPaymentGateway/updatePaymentGateway
- `sinaloka-backend/src/modules/settings/settings.controller.ts` — add payment-gateway endpoints
- `sinaloka-backend/src/modules/settings/settings.dto.ts` — add PaymentGateway Zod schema
- `sinaloka-backend/src/modules/parent/parent.service.ts` — add gateway_configured to payment response

### Platform frontend — Modified files
- `sinaloka-platform/src/pages/Settings/index.tsx` — add 4th tab to scroll-spy
- `sinaloka-platform/src/pages/Settings/tabs/PaymentGatewayTab.tsx` — new tab component
- `sinaloka-platform/src/pages/Settings/useSettingsPage.ts` — add payment gateway state
- `sinaloka-platform/src/hooks/useSettings.ts` — add payment gateway query/mutation hooks
- `sinaloka-platform/src/services/settings.service.ts` — add API calls
- `sinaloka-platform/src/types/settings.ts` — add PaymentGatewaySettings type

### Parent frontend — Modified files
- `sinaloka-parent/src/App.tsx` — add payment status view
- `sinaloka-parent/src/services/api.ts` — add checkout + status API calls

---

### Task 1: Prisma Schema Migration

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`

- [ ] **Step 1: Add MIDTRANS to PaymentMethod enum**

In `schema.prisma`, find the `PaymentMethod` enum and add `MIDTRANS`:

```prisma
enum PaymentMethod {
  CASH
  TRANSFER
  OTHER
  MIDTRANS
}
```

- [ ] **Step 2: Add 3 new fields to Payment model**

In the `Payment` model, add after `invoice_url`:

```prisma
  midtrans_transaction_id String?
  snap_token              String?
  snap_redirect_url       String?
```

- [ ] **Step 3: Run migration**

Run: `cd sinaloka-backend && npx prisma migrate dev --name add-midtrans-payment-fields`
Expected: Migration created and applied successfully

- [ ] **Step 4: Regenerate Prisma client**

Run: `cd sinaloka-backend && npm run prisma:generate`
Expected: Prisma client regenerated

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/prisma/
git commit -m "feat(backend): add Midtrans fields to Payment schema"
```

---

### Task 2: Install midtrans-client SDK

**Files:**
- Modify: `sinaloka-backend/package.json`

- [ ] **Step 1: Install the package**

Run: `cd sinaloka-backend && npm install midtrans-client`

- [ ] **Step 2: Install types (if available)**

Run: `cd sinaloka-backend && npm install -D @types/midtrans-client 2>/dev/null || echo "No types package — will use declare module"`

If no types exist, create a type declaration:

Create: `sinaloka-backend/src/types/midtrans-client.d.ts`

```typescript
declare module 'midtrans-client' {
  export class Snap {
    constructor(options: { isProduction: boolean; serverKey: string; clientKey: string });
    createTransaction(params: {
      transaction_details: { order_id: string; gross_amount: number };
      customer_details?: { first_name?: string; email?: string; phone?: string };
      item_details?: Array<{ id: string; price: number; quantity: number; name: string }>;
    }): Promise<{ token: string; redirect_url: string }>;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/package.json sinaloka-backend/package-lock.json sinaloka-backend/src/types/
git commit -m "feat(backend): install midtrans-client SDK"
```

---

### Task 3: MidtransService — Snap Transaction + Signature Verification

**Files:**
- Create: `sinaloka-backend/src/modules/payment/midtrans.service.ts`
- Create: `sinaloka-backend/src/modules/payment/midtrans.service.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MidtransService } from './midtrans.service.js';
import * as crypto from 'crypto';

describe('MidtransService', () => {
  let service: MidtransService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MidtransService],
    }).compile();

    service = module.get(MidtransService);
  });

  describe('verifySignature', () => {
    it('should return true for valid signature', () => {
      const serverKey = 'SB-Mid-server-test';
      const orderId = 'order-123';
      const statusCode = '200';
      const grossAmount = '100000.00';
      const expected = crypto
        .createHash('sha512')
        .update(orderId + statusCode + grossAmount + serverKey)
        .digest('hex');

      expect(
        service.verifySignature({
          orderId,
          statusCode,
          grossAmount,
          serverKey,
          signatureKey: expected,
        }),
      ).toBe(true);
    });

    it('should return false for invalid signature', () => {
      expect(
        service.verifySignature({
          orderId: 'order-123',
          statusCode: '200',
          grossAmount: '100000.00',
          serverKey: 'SB-Mid-server-test',
          signatureKey: 'invalid-signature',
        }),
      ).toBe(false);
    });
  });

  describe('mapTransactionStatus', () => {
    it('should map settlement to PAID', () => {
      expect(service.mapTransactionStatus('settlement')).toBe('PAID');
    });

    it('should map capture to PAID', () => {
      expect(service.mapTransactionStatus('capture')).toBe('PAID');
    });

    it('should map expire to PENDING', () => {
      expect(service.mapTransactionStatus('expire')).toBe('PENDING');
    });

    it('should return null for pending/cancel/deny', () => {
      expect(service.mapTransactionStatus('pending')).toBeNull();
      expect(service.mapTransactionStatus('cancel')).toBeNull();
      expect(service.mapTransactionStatus('deny')).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd sinaloka-backend && npm run test -- --testPathPattern=midtrans.service`
Expected: FAIL — module not found

- [ ] **Step 3: Implement MidtransService**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Snap } from 'midtrans-client';
import * as crypto from 'crypto';

interface CreateTransactionParams {
  orderId: string;
  grossAmount: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  itemName: string;
  invoiceNumber?: string;
}

interface GatewayConfig {
  midtrans_server_key: string;
  midtrans_client_key: string;
  is_sandbox: boolean;
}

interface VerifySignatureParams {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  serverKey: string;
  signatureKey: string;
}

@Injectable()
export class MidtransService {
  private readonly logger = new Logger(MidtransService.name);

  async createSnapTransaction(
    config: GatewayConfig,
    params: CreateTransactionParams,
  ): Promise<{ token: string; redirect_url: string }> {
    const snap = new Snap({
      isProduction: !config.is_sandbox,
      serverKey: config.midtrans_server_key,
      clientKey: config.midtrans_client_key,
    });

    const transactionParams = {
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.grossAmount,
      },
      customer_details: {
        first_name: params.customerName,
        email: params.customerEmail,
        phone: params.customerPhone,
      },
      item_details: [
        {
          id: params.orderId,
          price: params.grossAmount,
          quantity: 1,
          name: params.itemName.slice(0, 50),
        },
      ],
    };

    this.logger.log(`Creating Snap transaction for order ${params.orderId}`);
    return snap.createTransaction(transactionParams);
  }

  verifySignature(params: VerifySignatureParams): boolean {
    const hash = crypto
      .createHash('sha512')
      .update(
        params.orderId +
          params.statusCode +
          params.grossAmount +
          params.serverKey,
      )
      .digest('hex');

    return hash === params.signatureKey;
  }

  mapTransactionStatus(
    transactionStatus: string,
  ): 'PAID' | 'PENDING' | null {
    switch (transactionStatus) {
      case 'settlement':
      case 'capture':
        return 'PAID';
      case 'expire':
        return 'PENDING';
      default:
        return null;
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd sinaloka-backend && npm run test -- --testPathPattern=midtrans.service`
Expected: PASS — all tests green

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/payment/midtrans.service.ts sinaloka-backend/src/modules/payment/midtrans.service.spec.ts
git commit -m "feat(backend): add MidtransService with Snap transaction and signature verification"
```

---

### Task 4: Settings — Payment Gateway CRUD

**Files:**
- Modify: `sinaloka-backend/src/modules/settings/settings.dto.ts`
- Modify: `sinaloka-backend/src/modules/settings/settings.service.ts`
- Modify: `sinaloka-backend/src/modules/settings/settings.controller.ts`

- [ ] **Step 1: Add Zod schema to settings.dto.ts**

Add to the end of `settings.dto.ts`:

```typescript
export const UpdatePaymentGatewaySchema = z.object({
  midtrans_server_key: z.string().min(1).optional(),
  midtrans_client_key: z.string().min(1).optional(),
  is_sandbox: z.boolean().optional(),
});

export type UpdatePaymentGatewayDto = z.infer<typeof UpdatePaymentGatewaySchema>;
```

- [ ] **Step 2: Add getPaymentGateway and updatePaymentGateway to SettingsService**

Add to `settings.service.ts` after `updateAcademic`:

```typescript
  private readonly PAYMENT_GATEWAY_DEFAULTS = {
    provider: 'midtrans' as const,
    midtrans_server_key: '',
    midtrans_client_key: '',
    is_sandbox: true,
  };

  async getPaymentGateway(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { settings: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const stored = (institution.settings as any)?.payment_gateway ?? {};
    const config = { ...this.PAYMENT_GATEWAY_DEFAULTS, ...stored };

    // Mask server key for frontend display
    return {
      ...config,
      midtrans_server_key_masked: config.midtrans_server_key
        ? config.midtrans_server_key.slice(0, 8) + '***' + config.midtrans_server_key.slice(-4)
        : '',
      is_configured: !!config.midtrans_server_key,
    };
  }

  async updatePaymentGateway(institutionId: string, dto: UpdatePaymentGatewayDto) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { settings: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const currentSettings = (institution.settings as any) ?? {};
    const currentGateway = currentSettings.payment_gateway ?? {};
    const updatedGateway = { ...currentGateway, ...dto, provider: 'midtrans' };

    await this.prisma.institution.update({
      where: { id: institutionId },
      data: {
        settings: { ...currentSettings, payment_gateway: updatedGateway },
      },
    });

    return this.getPaymentGateway(institutionId);
  }

  async getPaymentGatewayConfig(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { settings: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const stored = (institution.settings as any)?.payment_gateway ?? {};
    return { ...this.PAYMENT_GATEWAY_DEFAULTS, ...stored };
  }
```

Note: `getPaymentGateway` returns masked key (for frontend). `getPaymentGatewayConfig` returns raw key (for internal use by MidtransService).

- [ ] **Step 3: Add controller endpoints**

Add to `settings.controller.ts`:

Import the new schema/type:
```typescript
import {
  UpdateGeneralSettingsSchema,
  UpdateBillingSettingsSchema,
  UpdateAcademicSettingsSchema,
  UpdatePaymentGatewaySchema,
} from './settings.dto.js';
import type {
  UpdateGeneralSettingsDto,
  UpdateBillingSettingsDto,
  UpdateAcademicSettingsDto,
  UpdatePaymentGatewayDto,
} from './settings.dto.js';
```

Add endpoints after `updateAcademic`:

```typescript
  @Get('payment-gateway')
  async getPaymentGateway(@CurrentUser() user: JwtPayload) {
    return this.settingsService.getPaymentGateway(user.institutionId!);
  }

  @Patch('payment-gateway')
  async updatePaymentGateway(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdatePaymentGatewaySchema))
    dto: UpdatePaymentGatewayDto,
  ) {
    return this.settingsService.updatePaymentGateway(user.institutionId!, dto);
  }
```

- [ ] **Step 4: Type-check**

Run: `cd sinaloka-backend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to settings

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/settings/
git commit -m "feat(backend): add payment gateway settings CRUD"
```

---

### Task 5: PaymentGatewayController — Checkout, Webhook, Status

**Files:**
- Create: `sinaloka-backend/src/modules/payment/payment-gateway.controller.ts`
- Modify: `sinaloka-backend/src/modules/payment/payment.module.ts`

- [ ] **Step 1: Create the controller**

```typescript
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { MidtransService } from './midtrans.service.js';
import { SettingsService } from '../settings/settings.service.js';

@Controller('payments')
export class PaymentGatewayController {
  private readonly logger = new Logger(PaymentGatewayController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly midtransService: MidtransService,
    private readonly settingsService: SettingsService,
  ) {}

  @Post(':id/checkout')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PARENT)
  async checkout(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id },
      include: {
        student: true,
        enrollment: { include: { class: true } },
      },
    });

    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    // Parent access control: verify payment belongs to their child
    if (user.role === Role.PARENT) {
      await this.verifyParentOwnership(user.userId, payment.student_id);
    }

    if (payment.status !== 'PENDING' && payment.status !== 'OVERDUE') {
      throw new BadRequestException('Payment is not in a payable state');
    }

    const config = await this.settingsService.getPaymentGatewayConfig(
      payment.institution_id,
    );

    if (!config.midtrans_server_key) {
      throw new BadRequestException('Payment gateway not configured');
    }

    // Always create a fresh Snap transaction — tokens expire after 24h and
    // we don't track expiry. Midtrans deduplicates by order_id, so calling
    // createTransaction with the same order_id returns the existing token if
    // still valid, or creates a new one if expired.

    const result = await this.midtransService.createSnapTransaction(config, {
      orderId: payment.id,
      grossAmount: Number(payment.amount),
      customerName: payment.student.name,
      customerEmail: payment.student.email ?? undefined,
      customerPhone: payment.student.phone ?? undefined,
      itemName: payment.enrollment?.class?.name ?? 'Tuition Payment',
      invoiceNumber: payment.invoice_number ?? undefined,
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        snap_token: result.token,
        snap_redirect_url: result.redirect_url,
        midtrans_transaction_id: payment.id,
      },
    });

    return {
      snap_token: result.token,
      redirect_url: result.redirect_url,
    };
  }

  @Public()
  @Post('midtrans-webhook')
  async handleWebhook(@Body() body: any) {
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
    } = body;

    if (!order_id || !signature_key) {
      throw new BadRequestException('Invalid webhook payload');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: order_id },
    });

    if (!payment) {
      this.logger.warn(`Webhook for unknown payment: ${order_id}`);
      return { status: 'ignored' };
    }

    // Already paid — idempotent
    if (payment.status === 'PAID') {
      return { status: 'already_paid' };
    }

    const config = await this.settingsService.getPaymentGatewayConfig(
      payment.institution_id,
    );

    // Verify signature
    const isValid = this.midtransService.verifySignature({
      orderId: order_id,
      statusCode: status_code,
      grossAmount: gross_amount,
      serverKey: config.midtrans_server_key,
      signatureKey: signature_key,
    });

    if (!isValid) {
      this.logger.warn(`Invalid webhook signature for payment: ${order_id}`);
      throw new BadRequestException('Invalid signature');
    }

    // Verify amount
    if (Number(gross_amount) !== Number(payment.amount)) {
      this.logger.warn(
        `Amount mismatch for ${order_id}: expected ${payment.amount}, got ${gross_amount}`,
      );
      throw new BadRequestException('Amount mismatch');
    }

    const newStatus =
      this.midtransService.mapTransactionStatus(transaction_status);

    if (!newStatus) {
      return { status: 'no_change' };
    }

    if (newStatus === 'PAID') {
      await this.prisma.payment.update({
        where: { id: order_id },
        data: {
          status: 'PAID',
          paid_date: new Date(),
          method: 'MIDTRANS',
        },
      });
      this.logger.log(`Payment ${order_id} marked as PAID via Midtrans`);
    } else if (newStatus === 'PENDING') {
      await this.prisma.payment.update({
        where: { id: order_id },
        data: {
          status: 'PENDING',
          snap_token: null,
          snap_redirect_url: null,
        },
      });
      this.logger.log(`Payment ${order_id} reset to PENDING (expired)`);
    }

    return { status: 'ok' };
  }

  @Get(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PARENT)
  async getStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id },
      select: { id: true, status: true, paid_date: true, method: true, student_id: true },
    });

    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    if (user.role === Role.PARENT) {
      await this.verifyParentOwnership(user.userId, payment.student_id);
    }

    return {
      id: payment.id,
      status: payment.status,
      paid_date: payment.paid_date,
      method: payment.method,
    };
  }

  private async verifyParentOwnership(
    userId: string,
    studentId: string,
  ): Promise<void> {
    const parent = await this.prisma.parent.findFirst({
      where: { user_id: userId },
    });

    if (!parent) {
      throw new ForbiddenException('Parent not found');
    }

    const link = await this.prisma.parentStudent.findFirst({
      where: { parent_id: parent.id, student_id: studentId },
    });

    if (!link) {
      throw new ForbiddenException('Not authorized to access this payment');
    }
  }
}
```

- [ ] **Step 2: Register in payment.module.ts**

Add `MidtransService` and `PaymentGatewayController` to the module. Also import `SettingsModule` if not already imported.

Read the current `payment.module.ts` first, then add:
- `MidtransService` to `providers`
- `PaymentGatewayController` to `controllers`
- Import `SettingsModule` in `imports` (if not already there)

- [ ] **Step 3: Type-check**

Run: `cd sinaloka-backend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/payment/
git commit -m "feat(backend): add PaymentGatewayController with checkout, webhook, and status endpoints"
```

---

### Task 6: Parent Service — Add gateway_configured to Payment Response

**Files:**
- Modify: `sinaloka-backend/src/modules/parent/parent.service.ts`

- [ ] **Step 1: Update getChildPayments to include gateway_configured**

In `parent.service.ts`, find the `getChildPayments` method. After getting the paginated payment data, add a check for gateway configuration:

```typescript
// At the end of getChildPayments, before returning:
const gatewayConfig = await this.settingsService.getPaymentGatewayConfig(institutionId);
const gatewayConfigured = !!gatewayConfig.midtrans_server_key;

return { data, meta: buildPaginationMeta(total, page, limit), gateway_configured: gatewayConfigured };
```

This requires injecting `SettingsService` into `ParentService`. Add it to the constructor:

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly settingsService: SettingsService,
) {}
```

And import it + add `SettingsModule` to the parent module's imports.

- [ ] **Step 2: Type-check**

Run: `cd sinaloka-backend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/parent/
git commit -m "feat(backend): add gateway_configured flag to parent payment response"
```

---

### Task 7: Platform — Payment Gateway Settings Tab

**Files:**
- Create: `sinaloka-platform/src/pages/Settings/tabs/PaymentGatewayTab.tsx`
- Modify: `sinaloka-platform/src/pages/Settings/index.tsx`
- Modify: `sinaloka-platform/src/pages/Settings/useSettingsPage.ts`
- Modify: `sinaloka-platform/src/hooks/useSettings.ts`
- Modify: `sinaloka-platform/src/services/settings.service.ts`
- Modify: `sinaloka-platform/src/types/settings.ts`

- [ ] **Step 1: Add types**

In `types/settings.ts`, add:

```typescript
export interface PaymentGatewaySettings {
  provider: string;
  midtrans_server_key: string;
  midtrans_client_key: string;
  midtrans_server_key_masked: string;
  is_sandbox: boolean;
  is_configured: boolean;
}

export interface UpdatePaymentGatewayDto {
  midtrans_server_key?: string;
  midtrans_client_key?: string;
  is_sandbox?: boolean;
}
```

- [ ] **Step 2: Add service calls**

In `services/settings.service.ts`, add:

```typescript
export const getPaymentGatewaySettings = () =>
  api.get<PaymentGatewaySettings>('/settings/payment-gateway').then((r) => r.data);

export const updatePaymentGatewaySettings = (data: UpdatePaymentGatewayDto) =>
  api.patch<PaymentGatewaySettings>('/settings/payment-gateway', data).then((r) => r.data);
```

- [ ] **Step 3: Add hooks**

In `hooks/useSettings.ts`, add:

```typescript
export const usePaymentGatewaySettings = () =>
  useQuery({ queryKey: ['settings', 'payment-gateway'], queryFn: getPaymentGatewaySettings });

export const useUpdatePaymentGatewaySettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePaymentGatewaySettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'payment-gateway'] }),
  });
};
```

- [ ] **Step 4: Create PaymentGatewayTab component**

Create `tabs/PaymentGatewayTab.tsx` — a form with:
- Server Key input (type=password)
- Client Key input
- Sandbox/Production toggle (Switch component)
- Save button
- Follow the same pattern as GeneralTab/BillingTab (receive props from useSettingsPage)

- [ ] **Step 5: Add to Settings page scroll-spy**

In `index.tsx`:
- Import `PaymentGatewayTab` and `CreditCard` icon (or `Wallet` from lucide)
- Add 4th tab: `{ id: 'payment-gateway', label: t('settings.tabs.paymentGateway'), icon: Wallet }`
- Add 4th section: `<section id="payment-gateway" className="scroll-mt-32">...</section>`
- Update `SECTION_IDS` to include `'payment-gateway'`

In `useSettingsPage.ts`:
- Add payment gateway form state (formServerKey, formClientKey, formIsSandbox)
- Add handleSavePaymentGateway handler
- Wire up the query/mutation hooks

- [ ] **Step 6: Type-check and build**

Run: `cd sinaloka-platform && npm run lint && npm run build`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add sinaloka-platform/src/
git commit -m "feat(platform): add Payment Gateway settings tab with Midtrans configuration"
```

---

### Task 8: Platform — Send Invoice Action on Payments Page

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/StudentPayments.tsx` (or wherever the payments list is)
- Modify: `sinaloka-platform/src/services/payment.service.ts`

- [ ] **Step 1: Add checkout API call to payment service**

```typescript
export const checkoutPayment = (id: string) =>
  api.post<{ snap_token: string; redirect_url: string }>(`/payments/${id}/checkout`).then((r) => r.data);
```

- [ ] **Step 2: Add "Send Invoice" button to payment row actions**

On PENDING/OVERDUE payments, add a button that:
1. Calls `checkoutPayment(payment.id)`
2. Shows a modal with the `redirect_url` — copy button + "Send via WhatsApp" button
3. "Send via WhatsApp" reuses the existing WhatsApp reminder flow but includes the payment link

- [ ] **Step 3: Type-check and build**

Run: `cd sinaloka-platform && npm run lint && npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/
git commit -m "feat(platform): add Send Invoice action with Midtrans payment link"
```

---

### Task 9: Parent App — "Bayar" Button + Payment Status Page

**Files:**
- Modify: `sinaloka-parent/src/App.tsx`
- Modify: `sinaloka-parent/src/services/api.ts` (or equivalent)

- [ ] **Step 1: Add API calls**

```typescript
export const checkoutPayment = (id: string) =>
  api.post<{ snap_token: string; redirect_url: string }>(`/payments/${id}/checkout`).then((r) => r.data);

export const getPaymentStatus = (id: string) =>
  api.get<{ id: string; status: string; paid_date: string | null; method: string | null }>(`/payments/${id}/status`).then((r) => r.data);
```

- [ ] **Step 2: Add "Bayar" button to PaymentList**

In the payment list component (inside ChildDetailPage's Payments tab):
- Show "Bayar" button on PENDING/OVERDUE payments when `gateway_configured` is true
- On tap: call `checkoutPayment(payment.id)` → open `redirect_url` with `window.open(url, '_blank')`
- After window.open, navigate to a payment status view

- [ ] **Step 3: Create Payment Status view**

A simple state-based view (like ChildDetailPage pattern):
- Shows payment amount and "Processing..." spinner
- Polls `getPaymentStatus(paymentId)` every 3 seconds, max 10 attempts
- On `status === 'PAID'` → show success message with green checkmark
- On max attempts → show "Still Processing" with manual refresh button
- "Back to Payments" button returns to child detail

- [ ] **Step 4: Type-check and build**

Run: `cd sinaloka-parent && npm run lint && npm run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add sinaloka-parent/src/
git commit -m "feat(parent): add online payment with Bayar button and payment status page"
```

---

### Task 10: Build Verification & Integration Test

- [ ] **Step 1: Run backend tests**

Run: `cd sinaloka-backend && npm run test -- --ci`
Expected: All tests pass

- [ ] **Step 2: Run backend build**

Run: `cd sinaloka-backend && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Run platform build**

Run: `cd sinaloka-platform && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Run parent build**

Run: `cd sinaloka-parent && npm run build`
Expected: Build succeeds

- [ ] **Step 5: Manual integration test checklist**

1. Go to Settings → Payment Gateway → enter sandbox keys → save
2. Go to Payments → find a PENDING payment → click "Send Invoice" → verify link generated
3. Open link in browser → verify Midtrans Snap page loads
4. In parent app → open child's payments → verify "Bayar" button appears
5. Click "Bayar" → verify redirect to Midtrans
6. Use Midtrans sandbox test card to complete payment
7. Verify webhook updates payment to PAID
8. Verify parent app status page shows success
