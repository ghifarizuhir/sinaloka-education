# WhatsApp Admin Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a WhatsApp admin page to sinaloka-platform with message log, quick-send payment reminders, and auto-reminder settings — backed by new backend endpoints.

**Architecture:** Backend first (new service methods + controller endpoints + cron update + DTOs), then frontend (types → service → hooks → translations → nav/routing → page component).

**Tech Stack:** NestJS, Prisma, React, TanStack Query, TailwindCSS v4, react-i18next, Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-16-whatsapp-platform-page-design.md`

---

## Chunk 1: Backend — New endpoints + cron update

### Task 1: Add DTOs, service methods, controller endpoints, and cron update

**Files:**
- Modify: `sinaloka-backend/src/modules/whatsapp/whatsapp.dto.ts`
- Modify: `sinaloka-backend/src/modules/whatsapp/whatsapp.service.ts`
- Modify: `sinaloka-backend/src/modules/whatsapp/whatsapp.controller.ts`
- Modify: `sinaloka-backend/src/modules/whatsapp/whatsapp.cron.ts`

- [ ] **Step 1: Add new Zod schemas to `whatsapp.dto.ts`**

```typescript
export const WhatsappMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  related_type: z.string().optional(),
});
export type WhatsappMessagesQueryDto = z.infer<typeof WhatsappMessagesQuerySchema>;

export const WhatsappStatsQuerySchema = z.object({
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});
export type WhatsappStatsQueryDto = z.infer<typeof WhatsappStatsQuerySchema>;

export const UpdateWhatsappSettingsSchema = z.object({
  auto_reminders: z.boolean().optional(),
  remind_days_before: z.coerce.number().int().min(1).max(7).optional(),
});
export type UpdateWhatsappSettingsDto = z.infer<typeof UpdateWhatsappSettingsSchema>;
```

- [ ] **Step 2: Add service methods to `whatsapp.service.ts`**

Add these methods to the `WhatsappService` class:

```typescript
async getMessages(institutionId: string, query: WhatsappMessagesQueryDto) {
  const { page, limit, status, date_from, date_to, related_type } = query;
  const where: any = { institution_id: institutionId };
  if (status) where.status = status;
  if (related_type) where.related_type = related_type;
  if (date_from || date_to) {
    where.created_at = {};
    if (date_from) where.created_at.gte = new Date(date_from);
    if (date_to) where.created_at.lte = new Date(date_to + 'T23:59:59.999Z');
  }

  const [data, total] = await Promise.all([
    this.prisma.whatsappMessage.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
    }),
    this.prisma.whatsappMessage.count({ where }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
}

async getStats(institutionId: string, dateFrom?: string, dateTo?: string) {
  const now = new Date();
  const startOfMonth = dateFrom
    ? new Date(dateFrom)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = dateTo
    ? new Date(dateTo + 'T23:59:59.999Z')
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const messages = await this.prisma.whatsappMessage.groupBy({
    by: ['status'],
    where: {
      institution_id: institutionId,
      created_at: { gte: startOfMonth, lte: endOfMonth },
    },
    _count: true,
  });

  const counts: Record<string, number> = {};
  let total = 0;
  for (const m of messages) {
    counts[m.status] = m._count;
    total += m._count;
  }

  return {
    configured: this.isConfigured(),
    total,
    sent: counts['SENT'] ?? 0,
    delivered: counts['DELIVERED'] ?? 0,
    read: counts['READ'] ?? 0,
    failed: counts['FAILED'] ?? 0,
    pending: counts['PENDING'] ?? 0,
  };
}

async getSettings(institutionId: string) {
  const institution = await this.prisma.institution.findUnique({
    where: { id: institutionId },
    select: { settings: true },
  });
  const settings = institution?.settings as Record<string, any> | null;
  return {
    auto_reminders: settings?.whatsapp_auto_reminders ?? true,
    remind_days_before: settings?.whatsapp_remind_days_before ?? 1,
  };
}

async updateSettings(institutionId: string, dto: UpdateWhatsappSettingsDto) {
  const institution = await this.prisma.institution.findUnique({
    where: { id: institutionId },
    select: { settings: true },
  });
  const existing = (institution?.settings as Record<string, any>) ?? {};

  const updated = { ...existing };
  if (dto.auto_reminders !== undefined) {
    updated.whatsapp_auto_reminders = dto.auto_reminders;
  }
  if (dto.remind_days_before !== undefined) {
    updated.whatsapp_remind_days_before = dto.remind_days_before;
  }

  await this.prisma.institution.update({
    where: { id: institutionId },
    data: { settings: updated },
  });

  return {
    auto_reminders: updated.whatsapp_auto_reminders ?? true,
    remind_days_before: updated.whatsapp_remind_days_before ?? 1,
  };
}
```

Import the DTO types at the top of the service file.

- [ ] **Step 3: Add controller endpoints to `whatsapp.controller.ts`**

Add these endpoints to the controller (add `Patch` to NestJS imports):

```typescript
@Get('admin/whatsapp/messages')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
async getMessages(
  @CurrentUser() user: JwtPayload,
  @Query(new ZodValidationPipe(WhatsappMessagesQuerySchema)) query: WhatsappMessagesQueryDto,
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
  @Body(new ZodValidationPipe(UpdateWhatsappSettingsSchema)) dto: UpdateWhatsappSettingsDto,
) {
  return this.whatsappService.updateSettings(user.institutionId!, dto);
}
```

Import `Patch` from `@nestjs/common`, `ZodValidationPipe` from `../../common/pipes/zod-validation.pipe.js`, and the DTOs/schemas from `./whatsapp.dto.js`.

Also fix the null-assertion on the existing `sendPaymentReminder` endpoint (line 83):
```typescript
return { success: true, message_id: message?.id ?? null };
```

- [ ] **Step 4: Update cron to read `whatsapp_remind_days_before`**

In `whatsapp.cron.ts`, change the `tomorrow` calculation (lines 24-26) to use per-institution settings:

Replace the filter/map block to also extract `remindDays`:

```typescript
const activeInstitutions = institutions
  .filter((inst) => {
    const settings = inst.settings as Record<string, any> | null;
    return settings?.whatsapp_auto_reminders !== false;
  })
  .map((inst) => {
    const settings = inst.settings as Record<string, any> | null;
    return {
      id: inst.id,
      remindDays: (settings?.whatsapp_remind_days_before as number) ?? 1,
    };
  });
```

Then in the payment query, use the max `remindDays` across all institutions for the date filter (simpler than per-institution queries), and let the dedup check in `sendPaymentReminder` handle the rest:

```typescript
const maxRemindDays = Math.max(...activeInstitutions.map(i => i.remindDays));
const remindDate = new Date();
remindDate.setDate(remindDate.getDate() + maxRemindDays);
remindDate.setHours(23, 59, 59, 999);
```

Replace `tomorrow` with `remindDate` and `activeInstitutionIds` with `activeInstitutions.map(i => i.id)`.

- [ ] **Step 5: Build and verify**

Run: `cd sinaloka-backend && npm run build`

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/src/modules/whatsapp/
git commit -m "feat(backend): add WhatsApp messages, stats, settings endpoints and cron update

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 2: Frontend — Types, service, hooks, translations

### Task 2: Create frontend types, service, hooks

**Files:**
- Create: `sinaloka-platform/src/types/whatsapp.ts`
- Create: `sinaloka-platform/src/services/whatsapp.service.ts`
- Create: `sinaloka-platform/src/hooks/useWhatsapp.ts`

- [ ] **Step 1: Create types file**

```typescript
import type { PaginationParams } from './common';

export interface WhatsappMessage {
  id: string;
  institution_id: string;
  phone: string;
  template_name: string;
  template_params: (string | number)[];
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
  configured: boolean;
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

- [ ] **Step 2: Create service file**

```typescript
import api from '@/src/lib/api';
import type { PaginatedResponse } from '@/src/types/common';
import type { WhatsappMessage, WhatsappStats, WhatsappSettings, WhatsappMessageQueryParams } from '@/src/types/whatsapp';

export const whatsappService = {
  getMessages: (params?: WhatsappMessageQueryParams) =>
    api.get<PaginatedResponse<WhatsappMessage>>('/api/admin/whatsapp/messages', { params }).then((r) => r.data),
  getStats: () =>
    api.get<WhatsappStats>('/api/admin/whatsapp/stats').then((r) => r.data),
  getSettings: () =>
    api.get<WhatsappSettings>('/api/admin/whatsapp/settings').then((r) => r.data),
  updateSettings: (data: Partial<WhatsappSettings>) =>
    api.patch<WhatsappSettings>('/api/admin/whatsapp/settings', data).then((r) => r.data),
  sendPaymentReminder: (paymentId: string) =>
    api.post<{ success: boolean; message_id: string | null }>(`/api/admin/whatsapp/payment-reminder/${paymentId}`).then((r) => r.data),
};
```

- [ ] **Step 3: Create hooks file**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { whatsappService } from '@/src/services/whatsapp.service';
import type { WhatsappMessageQueryParams, WhatsappSettings } from '@/src/types/whatsapp';

export function useWhatsappMessages(params?: WhatsappMessageQueryParams) {
  return useQuery({ queryKey: ['whatsapp-messages', params], queryFn: () => whatsappService.getMessages(params) });
}
export function useWhatsappStats() {
  return useQuery({ queryKey: ['whatsapp-stats'], queryFn: () => whatsappService.getStats() });
}
export function useWhatsappSettings() {
  return useQuery({ queryKey: ['whatsapp-settings'], queryFn: () => whatsappService.getSettings() });
}
export function useUpdateWhatsappSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<WhatsappSettings>) => whatsappService.updateSettings(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp-settings'] }),
  });
}
export function useSendPaymentReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => whatsappService.sendPaymentReminder(paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-stats'] });
    },
  });
}
```

- [ ] **Step 4: Verify TypeScript**

Run: `cd sinaloka-platform && npm run lint`

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/types/whatsapp.ts sinaloka-platform/src/services/whatsapp.service.ts sinaloka-platform/src/hooks/useWhatsapp.ts
git commit -m "feat(platform): add WhatsApp types, service, and hooks

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

### Task 3: Add translations and navigation

**Files:**
- Modify: `sinaloka-platform/src/locales/en.json`
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/components/Layout.tsx`
- Modify: `sinaloka-platform/src/App.tsx`

- [ ] **Step 1: Add translation keys to en.json**

Add to `nav`: `"messaging": "Messaging"`, `"whatsapp": "WhatsApp"`
Add to `layout.pageTitle`: `"whatsapp": "WhatsApp"`
Add full `"whatsapp": { ... }` block as specified in the spec Section 8.

- [ ] **Step 2: Add translation keys to id.json**

Add to `nav`: `"messaging": "Perpesanan"`, `"whatsapp": "WhatsApp"`
Add to `layout.pageTitle`: `"whatsapp": "WhatsApp"`
Add full `"whatsapp": { ... }` block (Indonesian) as specified in the spec Section 8.

- [ ] **Step 3: Add Messaging section to Layout.tsx sidebar**

Between Finance and System sections, add a new Messaging group with a WhatsApp nav item using `MessageSquare` icon.

- [ ] **Step 4: Add page title mapping in Layout.tsx**

Add `'/whatsapp': t('layout.pageTitle.whatsapp')` to the title mapping object.

- [ ] **Step 5: Add route in App.tsx**

Import WhatsApp page and add: `<Route path="/whatsapp" element={<WhatsApp />} />`

- [ ] **Step 6: Verify and commit**

Run: `cd sinaloka-platform && npm run lint`

```bash
git add sinaloka-platform/src/locales/ sinaloka-platform/src/components/Layout.tsx sinaloka-platform/src/App.tsx
git commit -m "feat(platform): add WhatsApp nav, routing, and translation keys

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 3: Frontend — WhatsApp page component

### Task 4: Create WhatsApp page with 3 tabs

**Files:**
- Create: `sinaloka-platform/src/pages/WhatsApp.tsx`

This is the main page component. It follows the same patterns as Finance pages (stats cards, table, filters, drawers, forms).

- [ ] **Step 1: Create the page file**

The page has:
- Tab state: `const [activeTab, setActiveTab] = useState<'messages' | 'paymentReminders' | 'settings'>('messages');`
- Hooks: `useWhatsappMessages`, `useWhatsappStats`, `useWhatsappSettings`, `useUpdateWhatsappSettings`, `useSendPaymentReminder`, `usePayments` (for Send tab)
- **Not-configured banner** when `stats.configured === false`

**Messages Tab:**
- Stats row (4 cards: Total Sent, Delivered, Read, Failed)
- Filters (status dropdown, date range, related type)
- Table with columns: Recipient, Template, Status badge, Related To, Date, Error
- Pagination
- Row click → Drawer with message detail
- Empty state when no messages

**Payment Reminders Tab:**
- Search input for student name
- Uses `usePayments({ search, status: 'PENDING' })` + `usePayments({ status: 'OVERDUE' })`
- Payment list with Send Reminder button per row
- Button disabled if no parent_phone, shows "No parent phone" tooltip

**Settings Tab:**
- Auto-reminders toggle
- Days before number input (1-7, disabled when auto off)
- Save button

Use existing UI components: `Card`, `Button`, `Badge`, `Drawer`, `Input`, `Label`, `SearchInput`, `Switch`, `Skeleton`.
Use `motion/react` for tab transitions.
Use `formatCurrency`, `formatDate` from `../lib/utils`.
Use `toast` from `sonner`.

- [ ] **Step 2: Verify TypeScript**

Run: `cd sinaloka-platform && npm run lint`

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/WhatsApp.tsx
git commit -m "feat(platform): add WhatsApp admin page with messages, send, and settings tabs

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```
