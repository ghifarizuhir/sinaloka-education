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
- `@@unique([institution_id, name])` — satu template per name per institution. Constraint ini juga berfungsi sebagai index untuk access pattern utama (`WHERE institution_id = ? AND name = ?`).
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

### Controller Placement

Template endpoints ditambahkan ke **existing `WhatsappController`** — bukan controller baru. Ini memastikan class-level `@PlanFeature('whatsappNotification')` dan `@Roles(SUPER_ADMIN, ADMIN)` otomatis berlaku untuk semua template endpoints tanpa duplikasi.

### API Endpoints

All under `/api/admin/whatsapp/templates` (prefix dari `WhatsappController` + route path).

| Method | Path | Body | Response | Description |
|--------|------|------|----------|-------------|
| GET | `/` | — | `{ templates: [{ name, body, is_default, variables }] }` | List all templates. Iterasi semua keys di `DEFAULT_TEMPLATES`, merge dengan custom dari DB. Jadi kalau nanti `DEFAULT_TEMPLATES` ditambah entry baru, endpoint ini otomatis return template baru juga. |
| GET | `/:name` | — | `{ name, body, is_default, variables, sample_data }` | Get single template + sample data. Custom dari DB atau fallback ke default. `sample_data` dari `SAMPLE_DATA` constant — frontend pakai ini untuk live preview. |
| PUT | `/:name` | `{ body: string }` | `{ name, body, is_default: false }` | Upsert custom template. Validates variables in body. |
| DELETE | `/:name` | — | `{ message: 'Reset to default' }` | Delete custom template → reset ke default. **Idempotent**: kalau sudah default (no custom exists), tetap return 200 — bukan 404. |

**Removed: `GET /:name/preview`** — preview dilakukan di frontend dengan local interpolation menggunakan `sample_data` dari `GET /:name` response. Menghilangkan dual source of truth.

### DTO Validation (PUT)

```typescript
export const UpdateTemplateSchema = z.object({
  body: z.string().min(1, 'Template body is required').max(4000, 'Template body too long'),
});
```

### Variable Validation (PUT)

1. Validate `name` exists in `TEMPLATE_VARIABLES` keys → 404 if unknown template name
2. Extract all `{{...}}` from body
3. Check each against `TEMPLATE_VARIABLES[name]`
4. Unknown variables → `400 Bad Request` with list of allowed variables
5. Empty body → `400 Bad Request` (caught by Zod `.min(1)`)

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
4. Build variables map with pre-formatted values:
   - student_name: payment.student.name
   - institution_name: institution.name
   - amount: Intl.NumberFormat('id-ID').format(payment.amount)
   - due_date: payment.due_date.toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID')
   - status: lang-aware label (OVERDUE → "Terlambat"/"Overdue", PENDING → "Menunggu"/"Pending")
   - checkout_url: Midtrans checkout URL if configured, otherwise empty string
5. Interpolate: replace {{var}} with actual values
6. Post-process: remove lines containing only empty variables (e.g., if checkout_url is empty, remove the entire line that only contained {{checkout_url}})
7. sendMessage() with interpolated text
```

**Interpolation function:**
```typescript
function interpolateTemplate(body: string, variables: Record<string, string>): string {
  let result = body.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] ?? '');
  // Remove lines that are now empty after interpolation (contained only a variable that resolved to '')
  result = result.replace(/^\s*\n/gm, '');
  return result.trim();
}
```

**Key behaviors:**
- `status` variable uses the **existing lang-aware label** (`statusLabel`) from the current implementation — preserves the ID/EN language detection based on `institution.default_language`
- `checkout_url` resolves to empty string when Midtrans is not configured → the line containing it is automatically removed by post-processing
- Unknown variables resolve to empty string (not left as `{{var}}`) — prevents raw placeholders appearing in sent WhatsApp messages

---

## Frontend

### Tab "Templates" di halaman /whatsapp

**Lokasi:** New tab alongside existing tabs in the WhatsApp page (`sinaloka-platform/src/pages/WhatsApp/`). Update tab state type union to include `'templates'`. Tab is enabled regardless of WhatsApp configuration status (admin can prepare templates before connecting Fonnte).

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
- Chips populated from `variables` field in `GET /:name` response

**Textarea:**
- Full template body
- Monospace or default font
- Character count di bawah (info, bukan hard limit)

**Preview Panel:**
- WhatsApp-style: dark green background (#075E54), light green bubble (#DCF8C6)
- Live update on every keystroke (debounce 300ms)
- **Local interpolation** using `sample_data` from `GET /:name` response — single source of truth from backend
- Unknown `{{variables}}` displayed as-is in red text (regex scan on interpolated output, wrap unresolved `{{...}}` in `<span className="text-red-500">`)

**Badge:**
- "Default" (muted) — kalau `is_default: true`
- "Customized" (primary color) — kalau `is_default: false`

**Buttons:**
- "Simpan" — `PUT /api/admin/whatsapp/templates/payment_reminder` with body → toast success
- "Reset to Default" — confirmation dialog → `DELETE /api/admin/whatsapp/templates/payment_reminder` → refetch template → toast success

**Loading state:** Skeleton saat fetch template.
**Error state:** Toast on save/delete failure.

### Service & Hooks

```typescript
// whatsapp.service.ts (frontend) — add to existing service object
getTemplate: (name: string) => api.get(`/api/admin/whatsapp/templates/${name}`).then(r => r.data),
updateTemplate: (name: string, body: string) => api.put(`/api/admin/whatsapp/templates/${name}`, { body }).then(r => r.data),
deleteTemplate: (name: string) => api.delete(`/api/admin/whatsapp/templates/${name}`).then(r => r.data),
```

```typescript
// useWhatsapp.ts — add new hooks
useWhatsappTemplate(name: string)     // GET single template, queryKey: ['whatsapp-template', name]
useUpdateWhatsappTemplate()           // PUT mutation, onSuccess: invalidate ['whatsapp-template']
useDeleteWhatsappTemplate()           // DELETE mutation, onSuccess: invalidate ['whatsapp-template']
```

**Query invalidation:** Both mutations invalidate `['whatsapp-template']` queryKey on success to refresh badge state and editor content.

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

```json
// id.json - whatsapp namespace
"templates": {
  "title": "Template",
  "editor": "Editor",
  "preview": "Pratinjau",
  "save": "Simpan Template",
  "resetToDefault": "Kembalikan ke Default",
  "resetConfirm": "Kembalikan template ke versi default? Perubahan Anda akan hilang.",
  "resetSuccess": "Template dikembalikan ke default",
  "saveSuccess": "Template disimpan",
  "badge": {
    "default": "Default",
    "customized": "Disesuaikan"
  },
  "variables": "Variabel Tersedia",
  "charCount": "{{count}} karakter",
  "invalidVariable": "Variabel tidak dikenal: {{name}}. Tersedia: {{allowed}}"
}
```

---

## Summary

| Layer | Changes |
|-------|---------|
| **Database** | New `whatsapp_templates` table (1 migration). `@@unique` on `(institution_id, name)` serves as both constraint and index. |
| **Backend** | New constants file (`whatsapp.constants.ts`), 4 endpoints added to existing `WhatsappController` (inherits `@PlanFeature`), update `sendPaymentReminder()` with template resolution + `interpolateTemplate()` utility. Lang-aware `statusLabel` preserved. Empty `checkout_url` lines auto-removed. |
| **Frontend** | New "Templates" tab in WhatsApp page, split view editor + live preview (local interpolation with `sample_data` from backend — single source of truth), variable chips, 3 service methods + 3 hooks with proper query invalidation, i18n keys EN + ID. |
| **No changes to** | Fonnte API integration, webhook handling, cron job logic (cron still calls `sendPaymentReminder()` which now transparently picks up custom templates). |
