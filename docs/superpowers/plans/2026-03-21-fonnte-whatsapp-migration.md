# Fonnte WhatsApp Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Meta Cloud API with Fonnte for outbound WhatsApp notifications (payment reminders).

**Architecture:** Swap the HTTP client layer in `WhatsappService` from Meta Graph API to Fonnte REST API (`api.fonnte.com/send`). Update webhook handler for Fonnte's simpler payload format. All changes are isolated to the `whatsapp/` module — no other modules affected.

**Tech Stack:** NestJS, Prisma, Zod, Jest, Fonnte REST API

**Spec:** `docs/superpowers/specs/2026-03-21-fonnte-whatsapp-migration-design.md`

**Note:** `ConfigModule.forRoot({ isGlobal: true })` is registered in `app.module.ts`, so `ConfigService` is available to all modules without explicit imports.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `src/modules/whatsapp/whatsapp.service.ts` | Replace Meta API calls with Fonnte, update config, remove HMAC |
| Modify | `src/modules/whatsapp/whatsapp.controller.ts` | Simplify webhook, remove GET verify endpoint |
| Modify | `src/modules/whatsapp/whatsapp.dto.ts` | Replace Meta webhook DTOs with Fonnte schema |
| Modify | `src/modules/whatsapp/whatsapp.service.spec.ts` | Update all tests for Fonnte |
| Modify | `.env.example` | Replace WHATSAPP_* vars with FONNTE_TOKEN + FONNTE_DEVICE_NUMBER |

---

### Task 1: Update DTOs — Replace Meta schemas with Fonnte webhook schema

**Files:**
- Modify: `src/modules/whatsapp/whatsapp.dto.ts`

- [ ] **Step 1: Remove `WebhookVerifySchema` and add `FonnteWebhookSchema`**

Replace the `WebhookVerifySchema` (lines 3-9) with a Fonnte webhook DTO. Keep all other schemas unchanged.

The full file after edit:

```ts
import { z } from 'zod';

export const FonnteWebhookSchema = z.object({
  device: z.string(),
  id: z.string(),
  status: z.string(),
});
export type FonnteWebhookDto = z.infer<typeof FonnteWebhookSchema>;

export const WhatsappMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  related_type: z.string().optional(),
});
export type WhatsappMessagesQueryDto = z.infer<
  typeof WhatsappMessagesQuerySchema
>;

export const WhatsappStatsQuerySchema = z.object({
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});
export type WhatsappStatsQueryDto = z.infer<typeof WhatsappStatsQuerySchema>;

export const UpdateWhatsappSettingsSchema = z.object({
  auto_reminders: z.boolean().optional(),
  remind_days_before: z.coerce.number().int().min(1).max(7).optional(),
});
export type UpdateWhatsappSettingsDto = z.infer<
  typeof UpdateWhatsappSettingsSchema
>;
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/whatsapp/whatsapp.dto.ts
git commit -m "refactor(whatsapp): replace Meta webhook DTOs with Fonnte schema"
```

---

### Task 2: Update WhatsappService — Replace Meta Cloud API with Fonnte

**Files:**
- Modify: `src/modules/whatsapp/whatsapp.service.ts`

- [ ] **Step 1: Replace imports, config fields, and constructor**

Remove `crypto` import. Replace Meta config fields with `fonnteToken`. Update constructor.

```ts
// BEFORE (lines 1-38):
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
import type {
  WhatsappMessagesQueryDto,
  UpdateWhatsappSettingsDto,
} from './whatsapp.dto.js';

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

// AFTER:
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type {
  WhatsappMessagesQueryDto,
  UpdateWhatsappSettingsDto,
} from './whatsapp.dto.js';

const FONNTE_API_URL = 'https://api.fonnte.com/send';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly fonnteToken: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.fonnteToken = this.config.get<string>('FONNTE_TOKEN');

    if (this.fonnteToken) {
      this.logger.log('WhatsApp (Fonnte) configured');
    } else {
      this.logger.warn('WhatsApp (Fonnte) not configured — module is no-op');
    }
  }
```

- [ ] **Step 2: Update `isConfigured()` and remove `verifyWebhookSignature()`**

```ts
// BEFORE isConfigured() (lines 40-42):
  isConfigured(): boolean {
    return !!this.accessToken && !!this.phoneNumberId;
  }

// AFTER:
  isConfigured(): boolean {
    return !!this.fonnteToken;
  }

// DELETE verifyWebhookSignature() entirely (lines 59-68)
```

- [ ] **Step 3: Replace `sendTemplate()` with `sendMessage()`**

Delete the entire `sendTemplate()` method (lines 70-177) and replace with:

```ts
  async sendMessage(params: {
    institutionId: string;
    phone: string;
    message: string;
    templateName?: string;
    templateParams?: Record<string, string>;
    relatedType?: string;
    relatedId?: string;
  }) {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('WhatsApp is not configured');
    }

    const normalizedPhone = this.normalizePhone(params.phone);
    // Fonnte requires digits only — strip the + prefix
    const target = normalizedPhone.replace(/^\+/, '');

    // Create pending record
    const record = await this.prisma.whatsappMessage.create({
      data: {
        institution_id: params.institutionId,
        phone: normalizedPhone,
        template_name: params.templateName ?? params.relatedType ?? 'general',
        template_params: params.templateParams ?? {},
        related_type: params.relatedType ?? null,
        related_id: params.relatedId ?? null,
        status: 'PENDING',
      },
    });

    try {
      const response = await fetch(FONNTE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.fonnteToken!,
        },
        body: JSON.stringify({
          target,
          message: params.message,
          countryCode: '62',
        }),
      });

      const data = await response.json();

      if (!data.status) {
        const errorMsg = data.reason || 'Unknown Fonnte error';

        await this.prisma.whatsappMessage.update({
          where: { id: record.id },
          data: {
            status: 'FAILED',
            error: errorMsg,
            retry_count: { increment: 1 },
          },
        });

        this.logger.error(`WhatsApp send failed: ${errorMsg}`, {
          messageId: record.id,
        });
        return this.prisma.whatsappMessage.findUnique({
          where: { id: record.id },
        });
      }

      const waMessageId = Array.isArray(data.id) ? data.id[0] : data.id;
      return this.prisma.whatsappMessage.update({
        where: { id: record.id },
        data: {
          status: 'SENT',
          wa_message_id: waMessageId?.toString() ?? null,
        },
      });
    } catch (error: any) {
      await this.prisma.whatsappMessage.update({
        where: { id: record.id },
        data: {
          status: 'FAILED',
          error: error.message || 'Network error',
          retry_count: { increment: 1 },
        },
      });

      this.logger.error(`WhatsApp send error: ${error.message}`, {
        messageId: record.id,
      });
      return this.prisma.whatsappMessage.findUnique({
        where: { id: record.id },
      });
    }
  }
```

- [ ] **Step 4: Update `handleStatusUpdate()` for Fonnte statuses**

```ts
// BEFORE (lines 179-196):
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

// AFTER:
  async handleStatusUpdate(waMessageId: string, status: string): Promise<void> {
    if (!waMessageId) return;

    // Fonnte statuses (case-insensitive)
    const statusMap: Record<string, string> = {
      sent: 'DELIVERED',
      read: 'READ',
      processing: 'SENT',
      pending: 'SENT',
      failed: 'FAILED',
      invalid: 'FAILED',
      expired: 'FAILED',
    };

    const mappedStatus = statusMap[status.toLowerCase()];
    if (!mappedStatus) return;

    await this.prisma.whatsappMessage.updateMany({
      where: { wa_message_id: waMessageId },
      data: { status: mappedStatus },
    });
  }
```

- [ ] **Step 5: Update `sendPaymentReminder()` to use `sendMessage()` with free text**

```ts
// BEFORE (lines 362-376 — the call to sendTemplate):
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

// AFTER:
    const message =
      `Assalamu'alaikum, Bapak/Ibu wali dari *${payment.student.name}*.\n\n` +
      `Ini adalah pengingat pembayaran dari *${payment.institution.name}*:\n` +
      `💰 Jumlah: Rp ${amount}\n` +
      `📅 Jatuh tempo: ${dueDate}\n` +
      `📋 Status: ${statusLabel}\n\n` +
      `Mohon segera melakukan pembayaran. Terima kasih.`;

    return this.sendMessage({
      institutionId,
      phone: parentPhone,
      message,
      templateName: 'payment_reminder',
      templateParams: {
        studentName: payment.student.name,
        institutionName: payment.institution.name,
        amount,
        dueDate,
        statusLabel,
      },
      relatedType: 'payment',
      relatedId: paymentId,
    });
```

- [ ] **Step 6: Verify the service compiles**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors (or only pre-existing errors unrelated to this module)

- [ ] **Step 7: Commit**

```bash
git add src/modules/whatsapp/whatsapp.service.ts
git commit -m "feat(whatsapp): replace Meta Cloud API with Fonnte in WhatsappService"
```

---

### Task 3: Update WhatsappController — Simplify webhook

**Files:**
- Modify: `src/modules/whatsapp/whatsapp.controller.ts`

- [ ] **Step 1: Rewrite the controller**

Key changes:
- Remove `GET /whatsapp/webhook` (Meta verify handshake — not needed by Fonnte)
- Simplify `POST /whatsapp/webhook` — parse Fonnte's flat body, authenticate by comparing `body.device` to `FONNTE_DEVICE_NUMBER` (the registered WhatsApp phone number of the Fonnte device, NOT the API token — Fonnte sends the device phone number in webhooks, not the token)
- Remove unused imports (`Headers`, `Req`, `Request`)
- Add `ConfigService` injection for reading `FONNTE_DEVICE_NUMBER`

**Important:** Fonnte's webhook `device` field contains the device's **phone number** (e.g. `628123456789`), not the API token. We authenticate by comparing it to `FONNTE_DEVICE_NUMBER` env var, which should be set to the WhatsApp number registered in Fonnte.

Write the full file:

```ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Query,
  Body,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { PlanFeature } from '../../common/decorators/plan.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { WhatsappService } from './whatsapp.service.js';
import {
  FonnteWebhookSchema,
  type FonnteWebhookDto,
  WhatsappMessagesQuerySchema,
  type WhatsappMessagesQueryDto,
  UpdateWhatsappSettingsSchema,
  type UpdateWhatsappSettingsDto,
} from './whatsapp.dto.js';

@Controller()
@PlanFeature('whatsappNotification')
export class WhatsappController {
  private readonly fonnteDeviceNumber: string | undefined;

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly config: ConfigService,
  ) {
    this.fonnteDeviceNumber = this.config.get<string>('FONNTE_DEVICE_NUMBER');
  }

  // --- Webhook endpoint (public, no JWT auth) ---

  @Public()
  @Post('whatsapp/webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body(new ZodValidationPipe(FonnteWebhookSchema)) body: FonnteWebhookDto,
  ) {
    // Authenticate: Fonnte sends the device phone number in body.device
    if (!this.fonnteDeviceNumber || body.device !== this.fonnteDeviceNumber) {
      throw new ForbiddenException('Invalid webhook source');
    }

    await this.whatsappService.handleStatusUpdate(body.id, body.status);
    return 'OK';
  }

  // --- Admin endpoints ---

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
    return { success: true, message_id: message?.id ?? null };
  }

  @Get('admin/whatsapp/messages')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getMessages(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(WhatsappMessagesQuerySchema))
    query: WhatsappMessagesQueryDto,
  ) {
    return this.whatsappService.getMessages(user.institutionId!, query);
  }

  @Get('admin/whatsapp/stats')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getStats(
    @CurrentUser() user: JwtPayload,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.whatsappService.getStats(user.institutionId!, dateFrom, dateTo);
  }

  @Get('admin/whatsapp/settings')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getSettings(@CurrentUser() user: JwtPayload) {
    return this.whatsappService.getSettings(user.institutionId!);
  }

  @Patch('admin/whatsapp/settings')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async updateSettings(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdateWhatsappSettingsSchema))
    dto: UpdateWhatsappSettingsDto,
  ) {
    return this.whatsappService.updateSettings(user.institutionId!, dto);
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/modules/whatsapp/whatsapp.controller.ts
git commit -m "refactor(whatsapp): simplify webhook controller for Fonnte"
```

---

### Task 4: Update unit tests

**Files:**
- Modify: `src/modules/whatsapp/whatsapp.service.spec.ts`

- [ ] **Step 1: Rewrite the test file for Fonnte**

Replace the entire file with:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

jest.mock('../../common/prisma/prisma.service', () => {
  return {
    PrismaService: jest.fn(),
  };
});

import { WhatsappService } from './whatsapp.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('WhatsappService', () => {
  let service: WhatsappService;
  let prisma: {
    whatsappMessage: {
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
    };
    payment: {
      findFirst: jest.Mock;
    };
  };

  const configValues: Record<string, string> = {
    FONNTE_TOKEN: 'test-fonnte-token',
  };

  beforeEach(async () => {
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
          useValue: { get: (key: string) => configValues[key] },
        },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
  });

  describe('isConfigured()', () => {
    it('should return true when FONNTE_TOKEN is set', () => {
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('isConfigured() — missing config', () => {
    let unconfiguredService: WhatsappService;

    beforeEach(async () => {
      const emptyConfig: Record<string, string> = {};

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WhatsappService,
          { provide: PrismaService, useValue: prisma },
          {
            provide: ConfigService,
            useValue: { get: (key: string) => emptyConfig[key] },
          },
        ],
      }).compile();

      unconfiguredService = module.get<WhatsappService>(WhatsappService);
    });

    it('should return false when FONNTE_TOKEN is missing', () => {
      expect(unconfiguredService.isConfigured()).toBe(false);
    });
  });

  describe('normalizePhone()', () => {
    it('should convert 081234567890 to +6281234567890', () => {
      expect(service.normalizePhone('081234567890')).toBe('+6281234567890');
    });

    it('should convert 6281234567890 to +6281234567890', () => {
      expect(service.normalizePhone('6281234567890')).toBe('+6281234567890');
    });

    it('should keep +6281234567890 unchanged', () => {
      expect(service.normalizePhone('+6281234567890')).toBe('+6281234567890');
    });

    it('should strip dashes from 08-123-456-7890', () => {
      expect(service.normalizePhone('08-123-456-7890')).toBe('+6281234567890');
    });

    it('should strip parens and spaces from (081) 234 567 890', () => {
      expect(service.normalizePhone('(081) 234 567 890')).toBe(
        '+6281234567890',
      );
    });

    it('should prepend +62 to bare number 81234567890', () => {
      expect(service.normalizePhone('81234567890')).toBe('+6281234567890');
    });

    it('should throw BadRequestException for too short number 123', () => {
      expect(() => service.normalizePhone('123')).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for empty string', () => {
      expect(() => service.normalizePhone('')).toThrow(BadRequestException);
    });
  });

  describe('sendMessage()', () => {
    beforeEach(() => {
      prisma.whatsappMessage.create.mockResolvedValue({
        id: 'msg-1',
        status: 'PENDING',
        retry_count: 0,
      });
    });

    it('should send message via Fonnte and update status to SENT', async () => {
      const mockResponse = {
        status: true,
        id: ['80367170'],
        process: 'pending',
      };

      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      prisma.whatsappMessage.update.mockResolvedValue({
        id: 'msg-1',
        status: 'SENT',
        wa_message_id: '80367170',
      });

      const result = await service.sendMessage({
        institutionId: 'inst-1',
        phone: '081234567890',
        message: 'Test message',
        relatedType: 'payment',
        relatedId: 'pay-1',
      });

      expect(result?.status).toBe('SENT');

      // Verify the target was sent without + prefix
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.target).toBe('6281234567890');
      expect(body.target).not.toContain('+');

      // Verify Authorization header has no Bearer prefix
      expect(fetchCall[1].headers.Authorization).toBe('test-fonnte-token');
    });

    it('should store structured templateParams in DB record', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ status: true, id: ['123'] }),
      });
      prisma.whatsappMessage.update.mockResolvedValue({ id: 'msg-1', status: 'SENT' });

      await service.sendMessage({
        institutionId: 'inst-1',
        phone: '081234567890',
        message: 'Test',
        templateName: 'payment_reminder',
        templateParams: { studentName: 'Alice', amount: '500.000' },
      });

      expect(prisma.whatsappMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            template_name: 'payment_reminder',
            template_params: { studentName: 'Alice', amount: '500.000' },
          }),
        }),
      );
    });

    it('should mark message FAILED when Fonnte returns status false', async () => {
      const mockResponse = {
        status: false,
        reason: 'token invalid',
      };

      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      prisma.whatsappMessage.update.mockResolvedValue({
        id: 'msg-1',
        status: 'FAILED',
        error: 'token invalid',
      });
      prisma.whatsappMessage.findUnique.mockResolvedValue({
        id: 'msg-1',
        status: 'FAILED',
      });

      const result = await service.sendMessage({
        institutionId: 'inst-1',
        phone: '081234567890',
        message: 'Test message',
      });

      expect(result?.status).toBe('FAILED');
    });

    it('should mark message FAILED on network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network timeout'));

      prisma.whatsappMessage.update.mockResolvedValue({
        id: 'msg-1',
        status: 'FAILED',
        error: 'Network timeout',
      });
      prisma.whatsappMessage.findUnique.mockResolvedValue({
        id: 'msg-1',
        status: 'FAILED',
      });

      const result = await service.sendMessage({
        institutionId: 'inst-1',
        phone: '081234567890',
        message: 'Test message',
      });

      expect(result?.status).toBe('FAILED');
    });
  });

  describe('handleStatusUpdate()', () => {
    it('should map Fonnte "Sent" to DELIVERED', async () => {
      await service.handleStatusUpdate('wa-123', 'Sent');
      expect(prisma.whatsappMessage.updateMany).toHaveBeenCalledWith({
        where: { wa_message_id: 'wa-123' },
        data: { status: 'DELIVERED' },
      });
    });

    it('should map Fonnte "Read" to READ', async () => {
      await service.handleStatusUpdate('wa-123', 'Read');
      expect(prisma.whatsappMessage.updateMany).toHaveBeenCalledWith({
        where: { wa_message_id: 'wa-123' },
        data: { status: 'READ' },
      });
    });

    it('should map Fonnte "Failed" to FAILED', async () => {
      await service.handleStatusUpdate('wa-123', 'Failed');
      expect(prisma.whatsappMessage.updateMany).toHaveBeenCalledWith({
        where: { wa_message_id: 'wa-123' },
        data: { status: 'FAILED' },
      });
    });

    it('should be case-insensitive', async () => {
      await service.handleStatusUpdate('wa-123', 'SENT');
      expect(prisma.whatsappMessage.updateMany).toHaveBeenCalledWith({
        where: { wa_message_id: 'wa-123' },
        data: { status: 'DELIVERED' },
      });
    });

    it('should ignore unknown status', async () => {
      await service.handleStatusUpdate('wa-123', 'unknown');
      expect(prisma.whatsappMessage.updateMany).not.toHaveBeenCalled();
    });

    it('should no-op when waMessageId is empty', async () => {
      await service.handleStatusUpdate('', 'Sent');
      expect(prisma.whatsappMessage.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('sendPaymentReminder()', () => {
    it('should throw NotFoundException when payment not found', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        service.sendPaymentReminder('inst-1', 'pay-999'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when student has no parent_phone', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        institution_id: 'inst-1',
        amount: '500000',
        due_date: new Date(),
        status: 'PENDING',
        student: { name: 'Alice', parent_phone: null },
        institution: { name: 'Test Institution', default_language: 'id' },
      });

      await expect(
        service.sendPaymentReminder('inst-1', 'pay-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing message when recent reminder exists (dedup)', async () => {
      const existingMessage = {
        id: 'msg-1',
        status: 'SENT',
        created_at: new Date(),
      };

      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        institution_id: 'inst-1',
        amount: '500000',
        due_date: new Date(),
        status: 'PENDING',
        student: { name: 'Alice', parent_phone: '081234567890' },
        institution: { name: 'Test Institution', default_language: 'id' },
      });

      prisma.whatsappMessage.findFirst.mockResolvedValue(existingMessage);

      const result = await service.sendPaymentReminder('inst-1', 'pay-1');

      expect(result).toEqual(existingMessage);
      expect(prisma.whatsappMessage.create).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd sinaloka-backend && npm run test -- --testPathPattern=whatsapp`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/modules/whatsapp/whatsapp.service.spec.ts
git commit -m "test(whatsapp): update unit tests for Fonnte integration"
```

---

### Task 5: Update `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Replace WhatsApp env vars**

```
# BEFORE (lines 14-19):
# WhatsApp Cloud API (optional — module is no-op if not configured)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_APP_SECRET=

# AFTER:
# WhatsApp via Fonnte (optional — module is no-op if not configured)
FONNTE_TOKEN=
FONNTE_DEVICE_NUMBER=
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: update .env.example for Fonnte WhatsApp migration"
```

---

### Task 6: Build & lint verification

- [ ] **Step 1: Run lint**

Run: `cd sinaloka-backend && npm run lint`
Expected: No errors

- [ ] **Step 2: Run all tests**

Run: `cd sinaloka-backend && npm run test -- --ci`
Expected: All tests pass

- [ ] **Step 3: Run build**

Run: `cd sinaloka-backend && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Final commit if any fixes were needed**

If lint/test/build revealed issues, fix and commit:
```bash
git add -u
git commit -m "fix(whatsapp): resolve lint/test issues from Fonnte migration"
```
