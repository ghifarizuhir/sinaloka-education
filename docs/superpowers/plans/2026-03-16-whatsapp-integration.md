# WhatsApp Cloud API Integration (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add WhatsApp Cloud API integration for sending payment reminders to parents, with both manual admin trigger and automatic daily cron job.

**Architecture:** New `whatsapp` NestJS module with service (native `fetch` to `graph.facebook.com`), webhook controller, cron job, and Prisma message log. No external npm dependencies.

**Tech Stack:** NestJS, Prisma, PostgreSQL, native `fetch`, `crypto` (HMAC), `@nestjs/schedule`

**Spec:** `docs/superpowers/specs/2026-03-16-whatsapp-integration-design.md`

---

## Chunk 1: Prisma schema + env config

### Task 1: Add WhatsappMessage model and update env

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`
- Modify: `sinaloka-backend/.env.example`

- [ ] **Step 1: Add WhatsappMessage model to Prisma schema**

Append before the closing of the schema file, after the last model. Also add `whatsapp_messages WhatsappMessage[]` to the Institution model's relations (after `invitations Invitation[]` at line 102):

```prisma
model WhatsappMessage {
  id              String   @id @default(uuid())
  institution_id  String
  phone           String
  template_name   String
  template_params Json
  wa_message_id   String?
  status          String   @default("PENDING")
  error           String?
  retry_count     Int      @default(0)
  related_type    String?
  related_id      String?
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  institution     Institution @relation(fields: [institution_id], references: [id])

  @@index([related_type, related_id, created_at])
  @@index([wa_message_id])
  @@index([institution_id, created_at])
  @@map("whatsapp_messages")
}
```

- [ ] **Step 2: Add WhatsApp env vars to .env.example**

Append to `sinaloka-backend/.env.example`:

```
# WhatsApp Cloud API (optional — module is no-op if not configured)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_APP_SECRET=
PARENT_PORTAL_URL=http://localhost:5174
```

- [ ] **Step 3: Run Prisma generate (skip migrate in dev — implementer runs migrate locally)**

Run: `cd sinaloka-backend && npm run prisma:generate`

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/prisma/schema.prisma sinaloka-backend/.env.example
git commit -m "feat(backend): add WhatsappMessage model and env config

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 2: WhatsApp module — service, controller, DTOs

### Task 2: Create WhatsApp DTOs

**Files:**
- Create: `sinaloka-backend/src/modules/whatsapp/whatsapp.dto.ts`

- [ ] **Step 1: Create the DTO file**

```typescript
import { z } from 'zod';

export const WebhookVerifySchema = z.object({
  'hub.mode': z.literal('subscribe'),
  'hub.verify_token': z.string(),
  'hub.challenge': z.string(),
});

export type WebhookVerifyDto = z.infer<typeof WebhookVerifySchema>;
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-backend/src/modules/whatsapp/whatsapp.dto.ts
git commit -m "feat(backend): add WhatsApp DTOs

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

### Task 3: Create WhatsApp Service

**Files:**
- Create: `sinaloka-backend/src/modules/whatsapp/whatsapp.service.ts`

- [ ] **Step 1: Create the service file**

```typescript
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service.js';

const GRAPH_API_URL = 'https://graph.facebook.com/v21.0';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly accessToken: string | undefined;
  private readonly phoneNumberId: string | undefined;
  private readonly appSecret: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.accessToken = this.config.get<string>('WHATSAPP_ACCESS_TOKEN');
    this.phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    this.appSecret = this.config.get<string>('WHATSAPP_APP_SECRET');

    if (this.accessToken) {
      this.logger.log('WhatsApp Cloud API configured');
    } else {
      this.logger.warn('WhatsApp Cloud API not configured — module is no-op');
    }
  }

  isConfigured(): boolean {
    return !!this.accessToken && !!this.phoneNumberId;
  }

  normalizePhone(raw: string): string {
    let phone = raw.replace(/[\s\-\(\)]/g, '');
    if (phone.startsWith('0')) {
      phone = '+62' + phone.slice(1);
    } else if (phone.startsWith('62')) {
      phone = '+' + phone;
    } else if (!phone.startsWith('+')) {
      phone = '+62' + phone;
    }
    if (!/^\+\d{10,15}$/.test(phone)) {
      throw new BadRequestException(`Invalid phone number: ${raw}`);
    }
    return phone;
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.appSecret || !signature) return false;
    const expected = 'sha256=' + crypto
      .createHmac('sha256', this.appSecret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  async sendTemplate(params: {
    institutionId: string;
    phone: string;
    templateName: string;
    templateLanguage: string;
    templateParams: string[];
    relatedType?: string;
    relatedId?: string;
  }) {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('WhatsApp is not configured');
    }

    const normalizedPhone = this.normalizePhone(params.phone);

    // Create pending record
    const message = await this.prisma.whatsappMessage.create({
      data: {
        institution_id: params.institutionId,
        phone: normalizedPhone,
        template_name: params.templateName,
        template_params: params.templateParams,
        related_type: params.relatedType ?? null,
        related_id: params.relatedId ?? null,
        status: 'PENDING',
      },
    });

    try {
      const response = await fetch(
        `${GRAPH_API_URL}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: normalizedPhone.replace('+', ''),
            type: 'template',
            template: {
              name: params.templateName,
              language: { code: params.templateLanguage },
              components: [
                {
                  type: 'body',
                  parameters: params.templateParams.map((value) => ({
                    type: 'text',
                    text: value,
                  })),
                },
              ],
            },
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP ${response.status}`;
        const isTransient = response.status >= 500 || response.status === 429;

        await this.prisma.whatsappMessage.update({
          where: { id: message.id },
          data: {
            status: 'FAILED',
            error: errorMsg,
            retry_count: isTransient ? { increment: 1 } : message.retry_count,
          },
        });

        this.logger.error(`WhatsApp send failed: ${errorMsg}`, { messageId: message.id });
        return this.prisma.whatsappMessage.findUnique({ where: { id: message.id } });
      }

      const waMessageId = data?.messages?.[0]?.id;
      return this.prisma.whatsappMessage.update({
        where: { id: message.id },
        data: {
          status: 'SENT',
          wa_message_id: waMessageId ?? null,
        },
      });
    } catch (error: any) {
      // Network error — transient, retryable
      await this.prisma.whatsappMessage.update({
        where: { id: message.id },
        data: {
          status: 'FAILED',
          error: error.message || 'Network error',
          retry_count: { increment: 1 },
        },
      });

      this.logger.error(`WhatsApp send error: ${error.message}`, { messageId: message.id });
      return this.prisma.whatsappMessage.findUnique({ where: { id: message.id } });
    }
  }

  async handleStatusUpdate(waMessageId: string, status: string): Promise<void> {
    if (!waMessageId) return;

    const statusMap: Record<string, string> = {
      sent: 'SENT',
      delivered: 'DELIVERED',
      read: 'READ',
      failed: 'FAILED',
    };

    const mappedStatus = statusMap[status];
    if (!mappedStatus) return;

    await this.prisma.whatsappMessage.updateMany({
      where: { wa_message_id: waMessageId },
      data: { status: mappedStatus },
    });
  }

  async sendPaymentReminder(institutionId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, institution_id: institutionId },
      include: {
        student: { select: { name: true, parent_phone: true } },
        institution: { select: { name: true, default_language: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    const parentPhone = payment.student.parent_phone;
    if (!parentPhone) {
      throw new BadRequestException('Student has no parent phone number');
    }

    // Dedup check — no successful message in last 24h
    const recentMessage = await this.prisma.whatsappMessage.findFirst({
      where: {
        related_type: 'payment',
        related_id: paymentId,
        status: { not: 'FAILED' },
        created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (recentMessage) {
      this.logger.debug(`Skipping payment ${paymentId} — reminder already sent`);
      return recentMessage;
    }

    const lang = payment.institution.default_language || 'id';
    const amount = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(payment.amount));
    const dueDate = new Date(payment.due_date).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const statusLabel = payment.status === 'OVERDUE'
      ? (lang === 'id' ? 'Terlambat' : 'Overdue')
      : (lang === 'id' ? 'Menunggu' : 'Pending');

    return this.sendTemplate({
      institutionId,
      phone: parentPhone,
      templateName: 'payment_reminder',
      templateLanguage: lang,
      templateParams: [
        payment.student.name,
        payment.institution.name,
        amount,
        dueDate,
        statusLabel,
      ],
      relatedType: 'payment',
      relatedId: paymentId,
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-backend/src/modules/whatsapp/whatsapp.service.ts
git commit -m "feat(backend): add WhatsApp service with send, normalize, webhook

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

### Task 4: Create WhatsApp Controller (webhook + admin endpoint)

**Files:**
- Create: `sinaloka-backend/src/modules/whatsapp/whatsapp.controller.ts`

- [ ] **Step 1: Create the controller**

```typescript
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { WhatsappService } from './whatsapp.service.js';
import type { Request } from 'express';

@Controller()
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  // --- Webhook endpoints (public, no auth) ---

  @Public()
  @Get('whatsapp/webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (mode === 'subscribe' && verifyToken === expected) {
      return challenge;
    }
    throw new ForbiddenException('Webhook verification failed');
  }

  @Public()
  @Post('whatsapp/webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    // Verify signature
    const rawBody = req.rawBody?.toString() || JSON.stringify(body);
    if (!this.whatsappService.verifyWebhookSignature(rawBody, signature)) {
      throw new ForbiddenException('Invalid webhook signature');
    }

    // Process status updates
    const entries = body?.entry ?? [];
    for (const entry of entries) {
      const changes = entry?.changes ?? [];
      for (const change of changes) {
        const statuses = change?.value?.statuses ?? [];
        for (const status of statuses) {
          await this.whatsappService.handleStatusUpdate(status.id, status.status);
        }
      }
    }

    return 'OK';
  }

  // --- Admin endpoint ---

  @Post('admin/whatsapp/payment-reminder/:paymentId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async sendPaymentReminder(
    @CurrentUser() user: JwtPayload,
    @Param('paymentId') paymentId: string,
  ) {
    const message = await this.whatsappService.sendPaymentReminder(
      user.institutionId!,
      paymentId,
    );
    return { success: true, message_id: message!.id };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-backend/src/modules/whatsapp/whatsapp.controller.ts
git commit -m "feat(backend): add WhatsApp controller with webhook and admin endpoint

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

### Task 5: Create WhatsApp Cron Job

**Files:**
- Create: `sinaloka-backend/src/modules/whatsapp/whatsapp.cron.ts`

- [ ] **Step 1: Create the cron file**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { WhatsappService } from './whatsapp.service.js';

@Injectable()
export class WhatsappCron {
  private readonly logger = new Logger(WhatsappCron.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly prisma: PrismaService,
  ) {}

  // Daily at 09:00 WIB (UTC+7 = 02:00 UTC)
  @Cron('0 2 * * *')
  async sendPaymentReminders() {
    if (!this.whatsappService.isConfigured()) {
      return;
    }

    this.logger.log('Starting daily payment reminder job');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    // Load institutions that haven't opted out
    const institutions = await this.prisma.institution.findMany({
      select: { id: true, settings: true },
    });
    const activeInstitutionIds = institutions
      .filter((inst) => {
        const settings = inst.settings as Record<string, any> | null;
        return settings?.whatsapp_auto_reminders !== false;
      })
      .map((inst) => inst.id);

    if (activeInstitutionIds.length === 0) {
      this.logger.log('No institutions with auto-reminders enabled');
      return;
    }

    // Find payments needing reminders
    const payments = await this.prisma.payment.findMany({
      where: {
        institution_id: { in: activeInstitutionIds },
        OR: [
          { status: 'PENDING', due_date: { lte: tomorrow } },
          { status: 'OVERDUE' },
        ],
      },
      include: {
        student: { select: { name: true, parent_phone: true } },
      },
    });

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const payment of payments) {
      if (!payment.student.parent_phone) {
        skipped++;
        continue;
      }

      try {
        await this.whatsappService.sendPaymentReminder(
          payment.institution_id,
          payment.id,
        );
        sent++;
      } catch (error: any) {
        failed++;
        this.logger.error(
          `Failed to send reminder for payment ${payment.id}: ${error.message}`,
        );
      }
    }

    // Retry failed messages (transient failures, retry_count < 3)
    let retried = 0;
    const failedMessages = await this.prisma.whatsappMessage.findMany({
      where: {
        status: 'FAILED',
        retry_count: { lt: 3 },
        related_type: 'payment',
        created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        institution_id: { in: activeInstitutionIds },
      },
    });

    for (const msg of failedMessages) {
      if (!msg.related_id) continue;
      try {
        await this.whatsappService.sendPaymentReminder(
          msg.institution_id,
          msg.related_id,
        );
        retried++;
      } catch {
        // Already logged by service
      }
    }

    this.logger.log(
      `Payment reminders: ${sent} sent, ${skipped} skipped (no phone), ${failed} failed, ${retried} retried`,
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-backend/src/modules/whatsapp/whatsapp.cron.ts
git commit -m "feat(backend): add WhatsApp cron job for daily payment reminders

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

### Task 6: Create WhatsApp Module and register in AppModule

**Files:**
- Create: `sinaloka-backend/src/modules/whatsapp/whatsapp.module.ts`
- Modify: `sinaloka-backend/src/app.module.ts`

- [ ] **Step 1: Create the module file**

```typescript
import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service.js';
import { WhatsappController } from './whatsapp.controller.js';
import { WhatsappCron } from './whatsapp.cron.js';

@Module({
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappCron],
  exports: [WhatsappService],
})
export class WhatsappModule {}
```

- [ ] **Step 2: Add WhatsappModule and ScheduleModule to app.module.ts**

Add imports at top of `app.module.ts`:

```typescript
import { ScheduleModule } from '@nestjs/schedule';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module.js';
```

Add to the `imports` array (after `SettingsModule`):

```typescript
ScheduleModule.forRoot(),
WhatsappModule,
```

- [ ] **Step 3: Verify it compiles**

Run: `cd sinaloka-backend && npm run build`

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/whatsapp/whatsapp.module.ts sinaloka-backend/src/app.module.ts
git commit -m "feat(backend): register WhatsApp module and ScheduleModule in app

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 3: Unit tests

### Task 7: Write unit tests for WhatsApp service

**Files:**
- Create: `sinaloka-backend/src/modules/whatsapp/whatsapp.service.spec.ts`

- [ ] **Step 1: Create the test file**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';

jest.mock('../../common/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { WhatsappService } from './whatsapp.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('WhatsappService', () => {
  let service: WhatsappService;
  let prisma: any;
  let configValues: Record<string, string>;

  beforeEach(async () => {
    configValues = {
      WHATSAPP_ACCESS_TOKEN: 'test-token',
      WHATSAPP_PHONE_NUMBER_ID: 'test-phone-id',
      WHATSAPP_APP_SECRET: 'test-secret',
    };

    prisma = {
      whatsappMessage: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => configValues[key],
          },
        },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
  });

  describe('isConfigured', () => {
    it('should return true when credentials are set', () => {
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('normalizePhone', () => {
    it('should convert 08xxx to +628xxx', () => {
      expect(service.normalizePhone('081234567890')).toBe('+6281234567890');
    });

    it('should prepend + to 62xxx', () => {
      expect(service.normalizePhone('6281234567890')).toBe('+6281234567890');
    });

    it('should keep +62xxx as-is', () => {
      expect(service.normalizePhone('+6281234567890')).toBe('+6281234567890');
    });

    it('should strip formatting characters', () => {
      expect(service.normalizePhone('08-123-456-7890')).toBe('+6281234567890');
    });

    it('should strip spaces and parentheses', () => {
      expect(service.normalizePhone('(081) 234 567 890')).toBe('+6281234567890');
    });

    it('should prepend +62 for bare numbers', () => {
      expect(service.normalizePhone('81234567890')).toBe('+6281234567890');
    });

    it('should throw for invalid phone', () => {
      expect(() => service.normalizePhone('123')).toThrow(BadRequestException);
    });

    it('should throw for empty string', () => {
      expect(() => service.normalizePhone('')).toThrow(BadRequestException);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true for valid signature', () => {
      const crypto = require('crypto');
      const payload = '{"test": true}';
      const expected = 'sha256=' + crypto.createHmac('sha256', 'test-secret').update(payload).digest('hex');
      expect(service.verifyWebhookSignature(payload, expected)).toBe(true);
    });

    it('should return false for invalid signature', () => {
      expect(service.verifyWebhookSignature('payload', 'sha256=invalid')).toBe(false);
    });
  });

  describe('sendPaymentReminder', () => {
    it('should throw NotFoundException when payment not found', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);
      await expect(service.sendPaymentReminder('inst-1', 'pay-1')).rejects.toThrow('not found');
    });

    it('should throw when student has no parent phone', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        student: { name: 'Alice', parent_phone: null },
        institution: { name: 'School', default_language: 'id' },
        amount: 500000,
        due_date: new Date(),
        status: 'PENDING',
      });
      await expect(service.sendPaymentReminder('inst-1', 'pay-1')).rejects.toThrow('no parent phone');
    });

    it('should skip when recent reminder exists', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        student: { name: 'Alice', parent_phone: '081234567890' },
        institution: { name: 'School', default_language: 'id' },
        amount: 500000,
        due_date: new Date(),
        status: 'PENDING',
      });
      prisma.whatsappMessage.findFirst.mockResolvedValue({ id: 'existing-msg' });

      const result = await service.sendPaymentReminder('inst-1', 'pay-1');
      expect(result).toEqual({ id: 'existing-msg' });
      expect(prisma.whatsappMessage.create).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd sinaloka-backend && npm run test -- --testPathPatterns=whatsapp`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/whatsapp/whatsapp.service.spec.ts
git commit -m "test(backend): add WhatsApp service unit tests

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```
