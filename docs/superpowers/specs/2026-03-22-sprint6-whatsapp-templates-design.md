# Sprint 6: Custom WhatsApp Templates — Design Spec

> **Date:** 2026-03-22
> **Scope:** Template editor for `payment_reminder` only. Single language per template. Split view editor + live preview.

---

## Overview

Saat ini hanya ada 1 template WhatsApp yang hardcoded di `whatsapp.service.ts` (`payment_reminder`, bahasa Indonesia). Admin tidak bisa customize teks pesan. Sprint ini menambahkan:

1. Tabel `whatsapp_templates` untuk menyimpan custom template per institution
2. Backend CRUD + preview + variable validation
3. Tab "Templates" di halaman `/whatsapp` dengan split view editor + live WhatsApp-style preview
4. Fallback ke hardcoded default kalau institution belum customize
5. Reset to default (delete custom → fallback ke hardcoded)

---

## Data Model

### Tabel baru: `whatsapp_templates`

```prisma
model WhatsappTemplate {
  id              String   @id @default(uuid())
  institution_id  String
  name            String
  body            String
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  institution Institution @relation(fields: [institution_id], references: [id])

  @@unique([institution_id, name])
  @@map("whatsapp_templates")
}
```

**Constraints:**
- `@@unique([institution_id, name])` — satu template per name per institution
- `name` untuk sekarang hanya `payment_reminder`, tapi schema mendukung penambahan tipe lain di masa depan

**Migration:** `npx prisma migrate dev --name add_whatsapp_templates`

---

## Backend

### Constants

```typescript
// whatsapp.constants.ts
export const TEMPLATE_VARIABLES: Record<string, string[]> = {
  payment_reminder: [
    'student_name',
    'institution_name',
    'amount',
    'due_date',
    'status',
    'checkout_url',
  ],
};

export const DEFAULT_TEMPLATES: Record<string, string> = {
  payment_reminder: `Assalamu'alaikum, Bapak/Ibu wali dari *{{student_name}}*.

Ini adalah pengingat pembayaran dari *{{institution_name}}*:
💰 Jumlah: Rp {{amount}}
📅 Jatuh tempo: {{due_date}}
📋 Status: {{status}}

Mohon segera melakukan pembayaran. Terima kasih.`,
};

export const SAMPLE_DATA: Record<string, Record<string, string>> = {
  payment_reminder: {
    student_name: 'Ahmad Rizki',
    institution_name: 'Bimbel Cerdas',
    amount: '500.000',
    due_date: '25 Mar 2026',
    status: 'Menunggu',
    checkout_url: 'https://pay.sinaloka.com/abc123',
  },
};
```

### API Endpoints

All under `/api/admin/whatsapp/templates`, guarded by `@Roles(SUPER_ADMIN, ADMIN)` + `@PlanFeature('whatsappNotification')`.

| Method | Path | Body | Response | Description |
|--------|------|------|----------|-------------|
| GET | `/` | — | `{ templates: [{ name, body, is_default, variables }] }` | List all templates. Merge custom from DB with defaults. |
| GET | `/:name` | — | `{ name, body, is_default, variables }` | Get single template. Custom from DB or fallback to default. |
| PUT | `/:name` | `{ body: string }` | `{ name, body, is_default: false }` | Upsert custom template. Validates variables in body. |
| DELETE | `/:name` | — | `{ message: 'Reset to default' }` | Delete custom template → reset to default. |
| GET | `/:name/preview` | — | `{ preview: string }` | Return template body with sample data interpolated. Uses custom if exists, else default. |

### Variable Validation (PUT)

1. Extract all `{{...}}` from body
2. Check each against `TEMPLATE_VARIABLES[name]`
3. Unknown variables → `400 Bad Request` with list of allowed variables
4. Empty body → `400 Bad Request`

### `sendPaymentReminder()` Update

Current flow (hardcoded):
```
Build message string inline → sendMessage()
```

New flow:
```
1. Query whatsapp_templates WHERE institution_id + name = 'payment_reminder'
2. If found → use custom body
3. If not found → use DEFAULT_TEMPLATES['payment_reminder']
4. Interpolate variables: replace {{var}} with actual values
5. If Midtrans configured → append checkout_url line (only if {{checkout_url}} is in template)
6. sendMessage() with interpolated text
```

**Interpolation function:**
```typescript
function interpolateTemplate(body: string, variables: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] ?? match);
}
```

**Checkout URL handling:** If Midtrans is configured and `{{checkout_url}}` appears in the template body, the checkout URL is included via normal variable interpolation. If `{{checkout_url}}` is NOT in the template, no checkout link is appended. This replaces the current hardcoded "append checkout URL" behavior — admin controls whether checkout URL appears by including/excluding the variable.

---

## Frontend

### Tab "Templates" di halaman /whatsapp

**Lokasi:** New tab alongside existing tabs in the WhatsApp page (`sinaloka-platform/src/pages/WhatsApp/`).

### Layout: Split View

```
┌─────────────────────────────────┬──────────────────────────────┐
│ EDITOR                          │ PREVIEW                      │
│                                 │                              │
│ [Variable chips]                │ ┌──────────────────────────┐ │
│ {{student_name}} {{amount}} ... │ │  WhatsApp chat bubble    │ │
│                                 │ │  with sample data        │ │
│ ┌─────────────────────────────┐ │ │  live-updating           │ │
│ │ Textarea                    │ │ └──────────────────────────┘ │
│ │ Template body with          │ │                              │
│ │ {{variable}} placeholders   │ │                              │
│ │                             │ │                              │
│ └─────────────────────────────┘ │                              │
│                                 │                              │
│ [Badge: Default/Customized]     │                              │
│ [Reset to Default] [Simpan]     │                              │
└─────────────────────────────────┴──────────────────────────────┘
```

**Responsive:** Pada mobile, preview di bawah editor (stacked).

### Komponen

**Variable Chips:**
- Row of clickable chips above textarea
- Click chip → insert `{{variable_name}}` at cursor position in textarea
- Chips: `student_name`, `institution_name`, `amount`, `due_date`, `status`, `checkout_url`

**Textarea:**
- Full template body
- Monospace or default font
- Character count di bawah (info, bukan hard limit)

**Preview Panel:**
- WhatsApp-style: dark green background (#075E54), light green bubble (#DCF8C6)
- Live update on every keystroke (debounce 300ms)
- Variables replaced with sample data (hardcoded di frontend dari backend constant)
- Unknown `{{variables}}` ditampilkan as-is (red highlight)

**Badge:**
- "Default" (muted) — kalau `is_default: true`
- "Customized" (primary color) — kalau `is_default: false`

**Buttons:**
- "Simpan" — `PUT /api/admin/whatsapp/templates/payment_reminder` with body
- "Reset to Default" — confirmation dialog → `DELETE /api/admin/whatsapp/templates/payment_reminder` → reload template → toast success

**Loading state:** Skeleton saat fetch template.
**Error state:** Toast on save/delete failure.

### Service & Hooks

```typescript
// whatsapp.service.ts (frontend)
getTemplates: () => api.get('/api/admin/whatsapp/templates'),
getTemplate: (name: string) => api.get(`/api/admin/whatsapp/templates/${name}`),
updateTemplate: (name: string, body: string) => api.put(`/api/admin/whatsapp/templates/${name}`, { body }),
deleteTemplate: (name: string) => api.delete(`/api/admin/whatsapp/templates/${name}`),
getTemplatePreview: (name: string) => api.get(`/api/admin/whatsapp/templates/${name}/preview`),
```

```typescript
// useWhatsapp.ts (new hooks)
useWhatsappTemplate(name: string)     // GET single template
useUpdateWhatsappTemplate()            // PUT mutation
useDeleteWhatsappTemplate()            // DELETE mutation
```

### i18n Keys

```json
// en.json - whatsapp namespace
"templates": {
  "title": "Templates",
  "editor": "Editor",
  "preview": "Preview",
  "save": "Save Template",
  "resetToDefault": "Reset to Default",
  "resetConfirm": "Reset this template to the default version? Your customizations will be lost.",
  "resetSuccess": "Template reset to default",
  "saveSuccess": "Template saved",
  "badge": {
    "default": "Default",
    "customized": "Customized"
  },
  "variables": "Available Variables",
  "charCount": "{{count}} characters",
  "invalidVariable": "Unknown variable: {{name}}. Allowed: {{allowed}}"
}
```

---

## Summary

| Layer | Changes |
|-------|---------|
| **Database** | New `whatsapp_templates` table (1 migration) |
| **Backend** | New constants file, 5 new endpoints, update `sendPaymentReminder()` to use custom templates with fallback, `interpolateTemplate()` utility |
| **Frontend** | New "Templates" tab in WhatsApp page, split view editor + preview, variable chips, service methods + hooks, i18n keys |
| **No changes to** | Fonnte API integration, webhook handling, cron job logic (cron still calls `sendPaymentReminder()` which now checks for custom template) |
