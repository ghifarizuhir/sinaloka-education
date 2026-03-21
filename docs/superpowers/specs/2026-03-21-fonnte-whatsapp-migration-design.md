# Design: Migrate WhatsApp from Meta Cloud API to Fonnte

**Date:** 2026-03-21
**Status:** Draft
**Scope:** sinaloka-backend WhatsApp module

## Context

The current WhatsApp integration uses Meta Cloud API (`graph.facebook.com/v21.0`) for sending payment reminder notifications to parents. The Meta Business platform setup is overly complex (business verification, template approval process, webhook HMAC, etc.). Fonnte is a local Indonesian WhatsApp BSP with a simple REST API that eliminates this complexity.

## Decision

Replace Meta Cloud API with Fonnte (`api.fonnte.com`) for all outbound WhatsApp notifications. The change is isolated to the WhatsApp module — no other modules are affected.

## What Changes

### Environment Variables

| Remove | Add | Description |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` | `FONNTE_TOKEN` | Device token from Fonnte dashboard |
| `WHATSAPP_PHONE_NUMBER_ID` | — | Not needed |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | — | Fonnte has no verify handshake |
| `WHATSAPP_APP_SECRET` | — | No HMAC signature |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | — | Not needed |

The no-op behavior is preserved: if `FONNTE_TOKEN` is not set, the module does nothing.

### `whatsapp.service.ts`

**Remove Meta-specific code:**
- Delete `verifyWebhookSignature()` method and its `crypto` import
- Delete `sendTemplate()` method and all Meta Graph API HTTP logic
- Remove `accessToken`, `phoneNumberId`, `appSecret` private fields
- Add `fonnteToken` private field from `FONNTE_TOKEN` env var

**Update `isConfigured()`:**
Change from `!!this.accessToken && !!this.phoneNumberId` to `!!this.fonnteToken`. Without this change, the service will silently no-op even when Fonnte is properly configured.

**New `sendMessage()` method:**

Signature: `sendMessage(params: { institutionId: string; phone: string; message: string; relatedType?: string; relatedId?: string })`

Fonnte API call:
```
POST https://api.fonnte.com/send
Header: Authorization: <FONNTE_TOKEN>
Body (JSON): {
  target: "6281234567890",
  message: "...",
  countryCode: "62"
}
```

**Important: Phone number format.** Fonnte's `target` field does NOT accept the `+` prefix. The current `normalizePhone()` outputs `+62xxx`. Before passing to Fonnte, strip the `+` prefix: `phone.replace(/^\+/, '')`. This is done inside `sendMessage()`, not by changing `normalizePhone()` (which may be used elsewhere).

Response handling:
- Success: `{ status: true, id: ["80367170"], process: "pending" }` → save `id[0]` as `wa_message_id`, set status SENT
- Failure: `{ status: false, reason: "..." }` → set status FAILED, save reason as error

**`sendPaymentReminder()`**

Change from building Meta template parameters to composing a free-text message:

```
Assalamu'alaikum, Bapak/Ibu wali dari *{studentName}*.

Ini adalah pengingat pembayaran dari *{institutionName}*:
💰 Jumlah: Rp {amount}
📅 Jatuh tempo: {dueDate}
📋 Status: {statusLabel}

Mohon segera melakukan pembayaran. Terima kasih.
```

The deduplication logic (24-hour window) and parent phone lookup remain unchanged. `template_params` in the DB stores the parameter object `{ studentName, institutionName, amount, dueDate, statusLabel }` (not the rendered message text).

**`handleStatusUpdate()`**

Update to handle Fonnte's status format. Mapping:

| Fonnte Status | DB Status |
|---|---|
| `Sent` | DELIVERED |
| `Read` | READ |
| `Processing`, `Pending` | SENT |
| `Failed`, `Invalid`, `Expired` | FAILED |

Note: Fonnte may or may not send `Read` status — if it does, map to READ. If not, the READ status simply won't appear for Fonnte messages, and the `getStats()` read counter will be 0 for new messages.

### `whatsapp.controller.ts`

**`GET /api/whatsapp/webhook`** — Remove entirely. Fonnte does not use a verification handshake.

**`POST /api/whatsapp/webhook`** — Simplify:
- Remove HMAC signature verification (delete the `verifyWebhookSignature()` call)
- Parse Fonnte's flat JSON body: `{ device, id, status }`
- **Authenticate the webhook:** Validate `body.device === FONNTE_TOKEN` (or the device phone number — whichever Fonnte sends). This replaces HMAC as a basic authenticity check. Reject with 401 if mismatch.
- Call `handleStatusUpdate()` with the message ID and new status
- Keep `@Public()` decorator

Example Fonnte webhook payload:
```json
{
  "device": "628123456789",
  "id": "80367170",
  "status": "Sent"
}
```

Admin endpoints (`payment-reminder`, `messages`, `stats`, `settings`) remain unchanged.

### `whatsapp.cron.ts`

No logic changes. It calls `sendPaymentReminder()` which internally now uses Fonnte instead of Meta. The cron schedule, institution filtering, and retry logic stay the same.

### `whatsapp.dto.ts`

Remove all Meta webhook DTOs (nested entry/changes/value structure). Add a simple Fonnte webhook DTO:

```ts
const FonnteWebhookSchema = z.object({
  device: z.string(),
  id: z.string(),
  status: z.string(),
});
```

### Prisma Schema

No changes to the `WhatsappMessage` model. The `template_name` field will store `"payment_reminder"` as a message type identifier (not a Meta template name). `template_params` stores the parameter object (studentName, institutionName, amount, dueDate, statusLabel) — not the rendered message text.

### `.env.example`

Remove the old five `WHATSAPP_*` variables and their comment block. Replace with:

```env
# WhatsApp (Fonnte) - optional, no-op if not set
FONNTE_TOKEN=your_fonnte_device_token
```

### Unit Tests (`whatsapp.service.spec.ts`)

Specific changes needed:
- Delete the `verifyWebhookSignature()` describe block entirely
- Update `isConfigured()` tests: change config key checks from `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` to `FONNTE_TOKEN`
- Update send message tests: mock `api.fonnte.com/send` instead of `graph.facebook.com`
- Update response handling tests for Fonnte's `{ status, id, reason }` format
- Add test: verify `+` is stripped from phone number before sending to Fonnte

## What Does NOT Change

- `WhatsappMessage` Prisma model and all its indexes
- Admin endpoints (messages list, stats, settings)
- Plan feature gate (`whatsappNotification` — GROWTH/BUSINESS only)
- Cron job schedule and retry logic
- `WhatsappModule` exports (still exports `WhatsappService`)

## Risks

- **Fonnte downtime:** Same risk as any third-party API. The existing retry logic (3 retries within 24 hours) mitigates this.
- **Fonnte free tier limit:** 1,000 messages/month. Sufficient for small institutions. Paid plans start at Rp 25,000/month for the same quota without watermark.
- **Free tier watermark:** Fonnte adds a small watermark on free tier messages. This is a visible change from Meta's template messages. Upgrade to Lite (Rp 25,000/month) to remove it.
- **Phone number format regression:** If `+` is not stripped from the target, all messages will silently fail. The `sendMessage()` method must strip it before calling Fonnte.

## Post-Deployment Steps

1. **Register Fonnte account** at https://md.fonnte.com/new/register.php
2. **Add device** and get device token from dashboard
3. **Set `FONNTE_TOKEN`** environment variable in Railway
4. **Configure webhook URL** in Fonnte device dashboard → set to `https://api.sinaloka.com/api/whatsapp/webhook` so delivery status updates are received
5. **Remove old `WHATSAPP_*` env vars** from Railway

## Testing

- Update existing unit tests to mock `api.fonnte.com/send` instead of `graph.facebook.com`
- Test no-op behavior when `FONNTE_TOKEN` is not set
- Test success and failure response handling
- Test webhook status update parsing with Fonnte's format
- Test webhook authentication (reject if `device` doesn't match)
- Test phone number `+` stripping before sending
