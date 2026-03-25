# WhatsApp Cloud API Integration — Design Spec (Phase 1)

## Overview

Phase 1 of WhatsApp integration for Sinaloka: a backend WhatsApp module using the official Meta Cloud API with a shared Business Account. Implements payment reminders (manual + auto) as the first notification type, with a message log for audit and delivery tracking.

Future phases will add more notification triggers (sessions, attendance) and platform UI for configuration/logs.

## Decisions

- **Shared account**: Sinaloka owns one WhatsApp Business Account. All institutions send from the same number. Institution name is embedded in message templates.
- **First notification**: Payment reminders (PENDING near due date + OVERDUE).
- **Trigger modes**: Both automatic (daily cron) and manual (admin clicks "Send Reminder").
- **SDK**: Thin `fetch` wrapper over the Cloud API (no external dependency — the API is simple REST to `graph.facebook.com`). Avoids community package maintenance risk.

## 1. Environment Configuration

Global credentials in `.env` (not per-institution since shared account):

```
WHATSAPP_PHONE_NUMBER_ID=           # From Meta Business Suite
WHATSAPP_ACCESS_TOKEN=              # Permanent system user token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=      # Random string for webhook verification
WHATSAPP_BUSINESS_ACCOUNT_ID=       # WABA ID
WHATSAPP_APP_SECRET=                # For webhook signature verification (HMAC)
PARENT_PORTAL_URL=http://localhost:5174  # For links in messages
```

Loaded via NestJS `ConfigService`. The WhatsApp module is a no-op if `WHATSAPP_ACCESS_TOKEN` is not set (graceful degradation — no crashes if credentials aren't configured).

## 2. Data Model

New Prisma model for message audit log:

```prisma
model WhatsappMessage {
  id              String   @id @default(uuid())
  institution_id  String
  phone           String            // Recipient phone in E.164 format
  template_name   String            // Meta-approved template name
  template_params Json              // Parameters passed to template
  wa_message_id   String?           // WhatsApp message ID (returned on send)
  status          String   @default("PENDING") // PENDING, SENT, DELIVERED, READ, FAILED
  error           String?           // Error message if FAILED
  retry_count     Int      @default(0)  // Number of retry attempts
  related_type    String?           // "payment", "session", "attendance"
  related_id      String?           // ID of the related entity
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  institution     Institution @relation(fields: [institution_id], references: [id])

  @@index([related_type, related_id, created_at])
  @@index([wa_message_id])
  @@index([institution_id, created_at])
  @@map("whatsapp_messages")
}
```

Add `whatsapp_messages WhatsappMessage[]` to the Institution model's relations.

Migration: `npx prisma migrate dev --name add_whatsapp_messages`

## 3. Module Structure

```
src/modules/whatsapp/
├── whatsapp.module.ts          — NestJS module (global)
├── whatsapp.service.ts         — Core send/log/webhook logic
├── whatsapp.controller.ts      — Webhook endpoints (public)
├── whatsapp.cron.ts            — Scheduled payment reminder job
├── whatsapp.dto.ts             — Zod schemas
```

### 3.1 WhatsApp Service (`whatsapp.service.ts`)

Core responsibilities:

```typescript
@Injectable()
export class WhatsappService {
  private client: WhatsAppAPI | null = null; // null if not configured

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const token = this.config.get<string>('WHATSAPP_ACCESS_TOKEN');
    if (token) {
      this.phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');
      // Uses native fetch to graph.facebook.com — no SDK dependency
    }
  }

  // Check if WhatsApp is configured
  isConfigured(): boolean { return this.client !== null; }

  // Send a template message and log it
  async sendTemplate(params: {
    institutionId: string;
    phone: string;            // raw phone, will be normalized
    templateName: string;
    templateLanguage: string; // 'id' or 'en'
    templateParams: string[]; // ordered parameter values
    relatedType?: string;
    relatedId?: string;
  }): Promise<WhatsappMessage>

  // Normalize phone to E.164
  normalizePhone(phone: string): string

  // Handle webhook delivery status updates
  async handleStatusUpdate(waMessageId: string, status: string, timestamp: string): Promise<void>

  // Send payment reminder for a specific payment
  async sendPaymentReminder(institutionId: string, paymentId: string): Promise<WhatsappMessage>
}
```

**`sendTemplate` flow:**
1. Normalize phone to E.164 via `normalizePhone()`
2. Create `WhatsappMessage` record with status `PENDING`
3. Call WhatsApp Cloud API: `POST /{phoneNumberId}/messages` with template payload
4. On success: update record with `wa_message_id`, set status to `SENT`
5. On failure: set status to `FAILED`, store error message
6. Return the message record

**`normalizePhone` rules:**
- Strip all non-digit characters except leading `+`
- If starts with `0` → replace with `+62` (Indonesian default)
- If starts with `62` → prepend `+`
- If already starts with `+` → keep as-is
- Validate: must be 10-15 digits after country code

**`sendPaymentReminder` flow:**
1. Fetch payment with student, enrollment, class, and institution
2. Check `student.parent_phone` exists — throw if not
3. Check no reminder sent for this payment in last 24h (query `WhatsappMessage` by `related_type='payment'` and `related_id`)
4. Determine template language from `institution.default_language`
5. Call `sendTemplate()` with params: `[student_name, institution_name, formatted_amount, due_date, status_label]`

### 3.2 WhatsApp Controller (`whatsapp.controller.ts`)

Two public endpoints for Meta webhook:

```typescript
@Controller('whatsapp')
export class WhatsappController {
  // GET /api/whatsapp/webhook — Meta verification challenge
  @Public()
  @Get('webhook')
  verify(@Query() query: { 'hub.mode': string; 'hub.verify_token': string; 'hub.challenge': string })

  // POST /api/whatsapp/webhook — Delivery status updates
  @Public()
  @Post('webhook')
  webhook(@Body() body: any, @Headers('x-hub-signature-256') signature: string)
}
```

**Verification (GET):** Returns `hub.challenge` if `hub.verify_token` matches `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. Returns 403 otherwise.

**Webhook (POST):** Validates `X-Hub-Signature-256` HMAC signature against the app secret. Processes `statuses` entries (sent → delivered → read → failed). Updates `WhatsappMessage.status` and `updated_at`.

### 3.3 Cron Job (`whatsapp.cron.ts`)

```typescript
@Injectable()
export class WhatsappCron {
  // Runs daily at 09:00 WIB (UTC+7 = 02:00 UTC)
  @Cron('0 2 * * *')
  async sendPaymentReminders()
}
```

**Logic:**
1. Skip if WhatsApp not configured (`!whatsappService.isConfigured()`)
2. Load institutions that have NOT opted out (`settings.whatsapp_auto_reminders !== false`)
3. Query payments for those institutions where:
   - `status` is `PENDING` AND `due_date <= today + 1 day` (due tomorrow or already past)
   - OR `status` is `OVERDUE`
4. Also retry: query `WhatsappMessage` records with `status = 'FAILED'` and `retry_count < 3` and `created_at > 24h ago` (retryable failures only)
5. For each payment:
   - Check `student.parent_phone` exists
   - Check no successful message sent for this payment in last 24h
   - Call `whatsappService.sendPaymentReminder()`
   - Catch and log errors per-payment (don't let one failure stop others)
6. Log summary: `"Payment reminders: X sent, Y skipped (no phone), Z failed, R retried"`

**Institution opt-out:** Institutions can disable auto-reminders by setting `settings.whatsapp_auto_reminders: false` in their institution settings. The cron job checks this before sending. Manual reminders via the admin endpoint are always allowed regardless of this setting.

### 3.4 DTOs (`whatsapp.dto.ts`)

```typescript
// For manual send endpoint
export const SendPaymentReminderSchema = z.object({
  payment_id: z.string().uuid(),
});

// Webhook payload types (for validation)
export const WebhookVerifySchema = z.object({
  'hub.mode': z.literal('subscribe'),
  'hub.verify_token': z.string(),
  'hub.challenge': z.string(),
});
```

## 4. Admin Payment Reminder Endpoint

New endpoint in the WhatsApp module (keeps WhatsApp logic self-contained):

```
POST /api/admin/whatsapp/payment-reminder/:paymentId
```

- **Roles:** ADMIN, SUPER_ADMIN
- **Scoped by:** `tenantId` (institution isolation)
- **Validation:**
  - Payment exists and belongs to institution
  - `student.parent_phone` is set
  - WhatsApp is configured
- **Response:** `{ success: true, message_id: string }` or appropriate error
- **Errors:**
  - 404: Payment not found
  - 400: No parent phone number
  - 503: WhatsApp not configured

## 5. Meta Template

Pre-registered in Meta Business Manager. Two language variants:

**Indonesian (`id`):**
```
Template name: payment_reminder
Category: UTILITY

Body:
Yth. Orang Tua/Wali dari {{1}},

Ini adalah pengingat pembayaran dari {{2}}:
💰 Jumlah: Rp {{3}}
📅 Jatuh tempo: {{4}}
📋 Status: {{5}}

Silakan lakukan pembayaran sebelum tanggal jatuh tempo. Terima kasih.
```

**English (`en`):**
```
Template name: payment_reminder
Category: UTILITY

Body:
Dear Parent/Guardian of {{1}},

This is a payment reminder from {{2}}:
💰 Amount: Rp {{3}}
📅 Due date: {{4}}
📋 Status: {{5}}

Please complete the payment before the due date. Thank you.
```

**Parameters:** `[student_name, institution_name, formatted_amount, due_date, status_label]`

Note: Templates must be submitted and approved by Meta before they can be used. This is a manual step done in Meta Business Manager, not automated by the backend.

## 6. Phone Number Normalization

Utility function for Indonesian phone numbers:

```typescript
normalizePhone(raw: string): string {
  let phone = raw.replace(/[\s\-\(\)]/g, ''); // strip formatting
  if (phone.startsWith('0')) {
    phone = '+62' + phone.slice(1);
  } else if (phone.startsWith('62')) {
    phone = '+' + phone;
  } else if (!phone.startsWith('+')) {
    phone = '+62' + phone;
  }
  // Validate: + followed by 10-15 digits
  if (!/^\+\d{10,15}$/.test(phone)) {
    throw new BadRequestException(`Invalid phone number: ${raw}`);
  }
  return phone;
}
```

## 7. Error Handling

- **WhatsApp not configured:** Service methods return early or throw 503. Cron job skips silently.
- **Invalid phone:** `normalizePhone` throws `BadRequestException`. Cron job logs and skips.
- **API failure (transient — 5xx, 429, network timeout):** Set status to `FAILED`, increment `retry_count`. Next cron run retries if `retry_count < 3`.
- **API failure (permanent — 400, template not found):** Set status to `FAILED` with error. No retry.
- **Duplicate prevention:** Query `WhatsappMessage` for same `related_type + related_id` with `status != 'FAILED'` in last 24h before sending.
- **Webhook signature invalid:** Return 403, don't process.

## 8. Files Changed

### New Files
| File | Purpose |
|------|---------|
| `sinaloka-backend/src/modules/whatsapp/whatsapp.module.ts` | NestJS module |
| `sinaloka-backend/src/modules/whatsapp/whatsapp.service.ts` | Core send/log/webhook |
| `sinaloka-backend/src/modules/whatsapp/whatsapp.controller.ts` | Webhook endpoints |
| `sinaloka-backend/src/modules/whatsapp/whatsapp.cron.ts` | Daily reminder cron |
| `sinaloka-backend/src/modules/whatsapp/whatsapp.dto.ts` | Zod validation schemas |

### Modified Files
| File | Change |
|------|--------|
| `sinaloka-backend/prisma/schema.prisma` | Add `WhatsappMessage` model, add relation to Institution |
| `sinaloka-backend/src/app.module.ts` | Import `WhatsappModule` and `ScheduleModule.forRoot()` |
| `sinaloka-backend/.env.example` | Add WhatsApp env vars |

### Dependencies

No new npm dependencies. Uses native `fetch` for the Cloud API (`graph.facebook.com`) and built-in `crypto` for HMAC webhook verification.

## 9. Testing Strategy

- **`normalizePhone` unit tests:** Pure function — test Indonesian formats: `081234567890`, `6281234567890`, `+6281234567890`, `08-123-456-7890`, invalid inputs
- **`WhatsappService` unit tests:** Mock `fetch` and `PrismaService`. Test `sendTemplate` success/failure flows, dedup logic, retry count increment
- **`WhatsappCron` unit tests:** Mock `WhatsappService`. Test payment selection logic, institution opt-out filtering, error isolation (one failure doesn't stop others)
- **`WhatsappController` unit tests:** Test webhook verification (correct/wrong token), signature validation (valid/invalid HMAC), status update processing
- **Integration:** Manual test with Meta's test phone number (available in Meta Business Suite sandbox)

## 10. Future Phases (Out of Scope)

- **Phase 2:** Session notifications, attendance alerts, parent invite via WhatsApp
- **Phase 3:** Platform UI — WhatsApp settings page, message log viewer, send status dashboard
- **Phase 4:** Per-institution WhatsApp accounts, incoming message handling (chatbot)
