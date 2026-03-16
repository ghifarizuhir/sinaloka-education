# WhatsApp Admin Page — Design Spec

## Overview

A new "WhatsApp" page under a "Messaging" sidebar section in sinaloka-platform. Three tabs: message log with stats, quick-send payment reminders, and auto-reminder settings per institution. Requires new backend endpoints for listing messages, stats, and settings CRUD.

## 1. New Backend Endpoints

Add to `whatsapp.controller.ts` (all under `admin/whatsapp`, role ADMIN/SUPER_ADMIN, tenant-scoped):

### `GET /api/admin/whatsapp/messages`

List WhatsApp messages for the institution, paginated.

**Query params:** `page` (default 1), `limit` (default 20), `status` (optional: PENDING/SENT/DELIVERED/READ/FAILED), `date_from` (optional), `date_to` (optional), `related_type` (optional: payment/session/attendance).

**Response:** `PaginatedResponse<WhatsappMessage>` — same pagination pattern as other modules.

### `GET /api/admin/whatsapp/stats`

Monthly summary stats for the institution.

**Response:**
```json
{
  "total": 142,
  "sent": 130,
  "delivered": 120,
  "read": 85,
  "failed": 12,
  "pending": 0
}
```

Counts `WhatsappMessage` records for the institution in the current month, grouped by status.

### `GET /api/admin/whatsapp/settings`

Returns the institution's WhatsApp-related settings extracted from `Institution.settings` JSON.

**Response:**
```json
{
  "auto_reminders": true,
  "remind_days_before": 1
}
```

Defaults: `auto_reminders: true`, `remind_days_before: 1`.

### `PATCH /api/admin/whatsapp/settings`

Updates WhatsApp settings in the institution's `settings` JSON field.

**Body (Zod validated):**
```typescript
{
  auto_reminders?: boolean;
  remind_days_before?: number; // 1-7
}
```

Merges into existing `Institution.settings` JSON (doesn't overwrite other settings).

### `POST /api/admin/whatsapp/payment-reminder/:paymentId`

Already exists. No changes needed.

## 2. Backend Cron Update

Update `whatsapp.cron.ts` to read `whatsapp_remind_days_before` from institution settings:

```typescript
const remindDays = (settings?.whatsapp_remind_days_before as number) ?? 1;
const remindDate = new Date();
remindDate.setDate(remindDate.getDate() + remindDays);
```

Replace the hardcoded `tomorrow` with `remindDate` in the payment query filter.

## 3. Navigation & Routing

### Sidebar (`Layout.tsx`)

Add a new "Messaging" section between Finance and System:

```tsx
{/* Messaging */}
{!isSidebarMinimized && <p className="...">{t('nav.messaging')}</p>}
<div className="space-y-1">
  <SidebarItem icon={MessageSquare} label={t('nav.whatsapp')} href="/whatsapp" active={location.pathname === '/whatsapp'} minimized={isSidebarMinimized} />
</div>
```

Import `MessageSquare` from lucide-react.

### Route (`App.tsx`)

Add route:
```tsx
<Route path="/whatsapp" element={<WhatsApp />} />
```

### Page Title (`Layout.tsx`)

Add to the title mapping:
```typescript
'/whatsapp': t('layout.pageTitle.whatsapp'),
```

## 4. Frontend Types (`types/whatsapp.ts`)

```typescript
import type { PaginationParams } from './common';

export interface WhatsappMessage {
  id: string;
  institution_id: string;
  phone: string;
  template_name: string;
  template_params: string[];
  wa_message_id: string | null;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  error: string | null;
  retry_count: number;
  related_type: string | null;
  related_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsappStats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  pending: number;
}

export interface WhatsappSettings {
  auto_reminders: boolean;
  remind_days_before: number;
}

export interface WhatsappMessageQueryParams extends PaginationParams {
  status?: string;
  date_from?: string;
  date_to?: string;
  related_type?: string;
}
```

## 5. Frontend Service (`services/whatsapp.service.ts`)

```typescript
export const whatsappService = {
  getMessages: (params?: WhatsappMessageQueryParams) =>
    api.get<PaginatedResponse<WhatsappMessage>>('/api/admin/whatsapp/messages', { params }).then(r => r.data),
  getStats: () =>
    api.get<WhatsappStats>('/api/admin/whatsapp/stats').then(r => r.data),
  getSettings: () =>
    api.get<WhatsappSettings>('/api/admin/whatsapp/settings').then(r => r.data),
  updateSettings: (data: Partial<WhatsappSettings>) =>
    api.patch<WhatsappSettings>('/api/admin/whatsapp/settings', data).then(r => r.data),
  sendPaymentReminder: (paymentId: string) =>
    api.post<{ success: boolean; message_id: string }>(`/api/admin/whatsapp/payment-reminder/${paymentId}`).then(r => r.data),
};
```

## 6. Frontend Hooks (`hooks/useWhatsapp.ts`)

```typescript
export function useWhatsappMessages(params?: WhatsappMessageQueryParams) { ... }
export function useWhatsappStats() { ... }
export function useWhatsappSettings() { ... }
export function useUpdateWhatsappSettings() { ... }  // mutation, invalidates ['whatsapp-settings']
export function useSendPaymentReminder() { ... }  // mutation, invalidates ['whatsapp-messages', 'whatsapp-stats']
```

## 7. Page Component (`pages/WhatsApp.tsx`)

Single page with 3 tabs managed by local state.

### 7.1 Messages Tab (default)

**Stats row** — 4 cards using `useWhatsappStats()`:
| Card | Icon | Color |
|------|------|-------|
| Total Sent | Send | zinc |
| Delivered | CheckCircle2 | emerald |
| Read | Eye | indigo |
| Failed | AlertCircle | rose |

**Filters row** — Status dropdown, date range inputs (from/to), related type dropdown.

**Table** — Columns:

| Column | Content |
|--------|---------|
| Recipient | Phone number |
| Template | Template name badge |
| Status | Color-coded badge (SENT=blue, DELIVERED=emerald, READ=indigo, FAILED=rose, PENDING=zinc) |
| Related | Type + truncated ID (e.g., "Payment #abc1...") |
| Date | Formatted date + relative time |
| Error | Error text if FAILED, otherwise "—" |

Pagination at bottom (same pattern as other pages).

**Row click** → Drawer with full message detail:
- Phone, template name, template params
- Status with delivery timeline (created → sent → delivered → read)
- Error details if failed
- Related entity link
- Retry count

### 7.2 Send Tab

**Search input** — Search payments by student name. Uses existing `usePayments` hook with search param.

**Payment list** — Shows matching payments:
| Column | Content |
|--------|---------|
| Student | Name + parent phone |
| Amount | Formatted currency |
| Due Date | Formatted |
| Status | PENDING/OVERDUE badge |
| Action | "Send Reminder" button |

Button calls `useSendPaymentReminder()`. Shows toast on success/failure. Button disabled if no `parent_phone` on the student.

### 7.3 Settings Tab

Simple form card:

- **Auto-reminders** — Toggle switch (on/off)
- **Remind days before due date** — Number input (1-7), only enabled when auto-reminders is on
- **Save** button

Uses `useWhatsappSettings()` to load, `useUpdateWhatsappSettings()` to save. Toast on success.

## 8. Translation Keys

**en.json:**
```json
"nav": {
  "messaging": "Messaging",
  "whatsapp": "WhatsApp"
},
"layout": {
  "pageTitle": {
    "whatsapp": "WhatsApp"
  }
},
"whatsapp": {
  "tabs": {
    "messages": "Messages",
    "send": "Send",
    "settings": "Settings"
  },
  "stats": {
    "totalSent": "Total Sent",
    "delivered": "Delivered",
    "read": "Read",
    "failed": "Failed"
  },
  "filter": {
    "allStatuses": "All Statuses",
    "allTypes": "All Types",
    "dateFrom": "Date From",
    "dateTo": "Date To"
  },
  "table": {
    "recipient": "Recipient",
    "template": "Template",
    "status": "Status",
    "relatedTo": "Related To",
    "date": "Date",
    "error": "Error"
  },
  "drawer": {
    "title": "Message Details",
    "phone": "Phone",
    "templateName": "Template",
    "templateParams": "Parameters",
    "deliveryTimeline": "Delivery Timeline",
    "errorDetails": "Error Details",
    "retryCount": "Retry Count",
    "relatedEntity": "Related Entity"
  },
  "send": {
    "title": "Send Payment Reminder",
    "searchPlaceholder": "Search student name...",
    "sendReminder": "Send Reminder",
    "noPhone": "No parent phone",
    "noPayments": "No matching payments found"
  },
  "settings": {
    "title": "WhatsApp Settings",
    "autoReminders": "Auto-Reminders",
    "autoRemindersDesc": "Automatically send payment reminders before due date",
    "remindDaysBefore": "Remind Days Before Due Date",
    "remindDaysBeforeDesc": "Number of days before the due date to send the reminder",
    "save": "Save Settings"
  },
  "toast": {
    "reminderSent": "Payment reminder sent",
    "reminderError": "Failed to send reminder",
    "settingsSaved": "WhatsApp settings saved",
    "settingsError": "Failed to save settings"
  }
}
```

**id.json:** Matching Indonesian translations:
```json
"whatsapp": {
  "tabs": {
    "messages": "Pesan",
    "send": "Kirim",
    "settings": "Pengaturan"
  },
  "stats": {
    "totalSent": "Total Terkirim",
    "delivered": "Terkirim",
    "read": "Dibaca",
    "failed": "Gagal"
  },
  "filter": {
    "allStatuses": "Semua Status",
    "allTypes": "Semua Tipe",
    "dateFrom": "Dari Tanggal",
    "dateTo": "Sampai Tanggal"
  },
  "table": {
    "recipient": "Penerima",
    "template": "Template",
    "status": "Status",
    "relatedTo": "Terkait",
    "date": "Tanggal",
    "error": "Error"
  },
  "drawer": {
    "title": "Detail Pesan",
    "phone": "Telepon",
    "templateName": "Template",
    "templateParams": "Parameter",
    "deliveryTimeline": "Timeline Pengiriman",
    "errorDetails": "Detail Error",
    "retryCount": "Jumlah Percobaan",
    "relatedEntity": "Entitas Terkait"
  },
  "send": {
    "title": "Kirim Pengingat Pembayaran",
    "searchPlaceholder": "Cari nama siswa...",
    "sendReminder": "Kirim Pengingat",
    "noPhone": "Tidak ada nomor orang tua",
    "noPayments": "Tidak ada pembayaran yang cocok"
  },
  "settings": {
    "title": "Pengaturan WhatsApp",
    "autoReminders": "Pengingat Otomatis",
    "autoRemindersDesc": "Kirim pengingat pembayaran otomatis sebelum jatuh tempo",
    "remindDaysBefore": "Hari Sebelum Jatuh Tempo",
    "remindDaysBeforeDesc": "Jumlah hari sebelum jatuh tempo untuk mengirim pengingat",
    "save": "Simpan Pengaturan"
  },
  "toast": {
    "reminderSent": "Pengingat pembayaran terkirim",
    "reminderError": "Gagal mengirim pengingat",
    "settingsSaved": "Pengaturan WhatsApp tersimpan",
    "settingsError": "Gagal menyimpan pengaturan"
  }
}
```

## 9. Files Changed

### New Backend Files
| File | Purpose |
|------|---------|
| (none — all additions go into existing `whatsapp.controller.ts` and `whatsapp.service.ts`) | |

### Modified Backend Files
| File | Change |
|------|--------|
| `sinaloka-backend/src/modules/whatsapp/whatsapp.controller.ts` | Add GET messages, GET stats, GET/PATCH settings endpoints |
| `sinaloka-backend/src/modules/whatsapp/whatsapp.service.ts` | Add `getMessages()`, `getStats()`, `getSettings()`, `updateSettings()` methods |
| `sinaloka-backend/src/modules/whatsapp/whatsapp.dto.ts` | Add Zod schemas for messages query, settings update |
| `sinaloka-backend/src/modules/whatsapp/whatsapp.cron.ts` | Read `whatsapp_remind_days_before` from settings |

### New Frontend Files
| File | Purpose |
|------|---------|
| `sinaloka-platform/src/pages/WhatsApp.tsx` | Main page with 3 tabs |
| `sinaloka-platform/src/services/whatsapp.service.ts` | API service |
| `sinaloka-platform/src/hooks/useWhatsapp.ts` | React Query hooks |
| `sinaloka-platform/src/types/whatsapp.ts` | TypeScript types |

### Modified Frontend Files
| File | Change |
|------|--------|
| `sinaloka-platform/src/components/Layout.tsx` | Add Messaging section + WhatsApp nav item |
| `sinaloka-platform/src/App.tsx` | Add `/whatsapp` route |
| `sinaloka-platform/src/locales/en.json` | Add `whatsapp.*` and `nav.messaging/whatsapp` keys |
| `sinaloka-platform/src/locales/id.json` | Same keys, Indonesian translations |
