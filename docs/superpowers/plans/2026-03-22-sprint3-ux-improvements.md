# Sprint 3: UX Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add registration reject email, session edit UI, remove dead enrollment button, wire expense export, and add payment link to WhatsApp reminders.

**Architecture:** Mix of backend-only (email, export endpoint, WhatsApp link) and frontend-only (session edit modal, button removal) changes. One new service file (`PaymentGatewayService`) extracted for checkout URL reuse.

**Tech Stack:** NestJS + Prisma + Resend (email) + Midtrans + Fonnte (backend), React + TanStack Query + TailwindCSS (frontend)

**Spec:** `docs/superpowers/specs/2026-03-22-sprint3-ux-improvements-design.md`

---

## Task 1: Remove Dead "Send Reminder" Button in Enrollments

**Files:**
- Modify: `sinaloka-platform/src/pages/Enrollments/EnrollmentTable.tsx`

- [ ] **Step 1: Remove the CreditCard button stub**

In `EnrollmentTable.tsx`, find and DELETE the button block (lines ~212-216):

```tsx
{enroll.payment_status === 'OVERDUE' && (
  <button className="p-1 text-zinc-400 hover:text-indigo-600 transition-colors" title={t('enrollments.menu.sendReminder')}>
    <CreditCard size={14} />
  </button>
)}
```

- [ ] **Step 2: Remove CreditCard import if unused**

Check if `CreditCard` is used anywhere else in the file. If not, remove it from the lucide-react import line.

- [ ] **Step 3: Build and verify**

Run: `cd sinaloka-platform && npm run build`

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/Enrollments/EnrollmentTable.tsx
git commit -m "fix(platform): remove dead send reminder button stub from enrollments"
```

---

## Task 2: Backend — Email Notification on Registration Reject

**Files:**
- Modify: `sinaloka-backend/src/modules/registration/registration.dto.ts`
- Modify: `sinaloka-backend/src/modules/email/email.service.ts`
- Modify: `sinaloka-backend/src/modules/registration/registration.service.ts`
- Modify: `sinaloka-backend/src/modules/registration/registration.module.ts`

- [ ] **Step 1: Make email required in StudentRegistrationSchema**

In `registration.dto.ts`, find the `StudentRegistrationSchema`. Change the `email` field from optional to required:

FROM:
```typescript
email: z.string().email().optional(),
```

TO:
```typescript
email: z.string().email('Email is required'),
```

Leave `TutorRegistrationSchema` unchanged (email is already required there).

- [ ] **Step 2: Add `sendRegistrationRejected` method to EmailService**

In `email.service.ts`, add a new method after the existing email methods. Follow the same pattern as `sendTutorInvitation`:

```typescript
async sendRegistrationRejected(
  to: string,
  params: { name: string; institutionName: string; reason?: string },
) {
  try {
    await this.resend.emails.send({
      from: this.from,
      to,
      subject: `Registrasi Anda di ${params.institutionName}`,
      html: this.buildRegistrationRejectedHtml(params),
    });
    return { success: true };
  } catch (error) {
    this.logger.error(`Failed to send rejection email to ${to}`, error);
    return { success: false };
  }
}

private buildRegistrationRejectedHtml(params: {
  name: string;
  institutionName: string;
  reason?: string;
}): string {
  const reasonSection = params.reason
    ? `<div style="background: #fef3c7; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>Alasan:</strong> ${params.reason}</p>
      </div>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #18181b; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 20px;">Sinaloka</h1>
  </div>
  <div style="border: 1px solid #e4e4e7; border-top: none; border-radius: 0 0 12px 12px; padding: 32px 24px;">
    <h2 style="margin: 0 0 16px; font-size: 18px; color: #18181b;">Pemberitahuan Registrasi</h2>
    <p style="color: #52525b; line-height: 1.6;">Halo <strong>${params.name}</strong>,</p>
    <p style="color: #52525b; line-height: 1.6;">Mohon maaf, registrasi Anda di <strong>${params.institutionName}</strong> tidak dapat kami terima saat ini.</p>
    ${reasonSection}
    <p style="color: #52525b; line-height: 1.6;">Jika Anda memiliki pertanyaan, silakan hubungi institusi terkait.</p>
    <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
    <p style="color: #a1a1aa; font-size: 12px; text-align: center;">Email ini dikirim otomatis oleh Sinaloka.</p>
  </div>
</body>
</html>`;
}
```

- [ ] **Step 3: Import EmailService in RegistrationModule**

In `registration.module.ts`, check if `EmailModule` is already imported. If not, add:

```typescript
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [EmailModule, /* ...existing imports */],
  // ...
})
```

- [ ] **Step 4: Inject EmailService and call it in reject method**

In `registration.service.ts`, inject `EmailService` in the constructor:

```typescript
import { EmailService } from '../email/email.service.js';

constructor(
  private prisma: PrismaService,
  private emailService: EmailService,
  // ...existing injections
) {}
```

Then at the end of the `reject` method, after the Prisma update (before the `return`), add:

```typescript
// Send rejection email if registrant has email
if (registration.email) {
  const institution = await this.prisma.institution.findUnique({
    where: { id: institutionId },
    select: { name: true },
  });
  await this.emailService.sendRegistrationRejected(registration.email, {
    name: registration.name,
    institutionName: institution?.name ?? 'Institusi',
    reason: dto.reason ?? undefined,
  }).catch((err) => {
    this.logger.error('Failed to send rejection email', err);
  });
}
```

Note: Use `.catch()` so email failure doesn't break the reject flow.

- [ ] **Step 5: Build and verify**

Run: `cd sinaloka-backend && npm run build`

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/src/modules/registration/registration.dto.ts sinaloka-backend/src/modules/email/email.service.ts sinaloka-backend/src/modules/registration/registration.service.ts sinaloka-backend/src/modules/registration/registration.module.ts
git commit -m "feat(backend): send rejection email on registration reject, make student email required"
```

---

## Task 3: Backend — Expense Export Endpoint

**Files:**
- Modify: `sinaloka-backend/src/modules/expense/expense.service.ts`
- Modify: `sinaloka-backend/src/modules/expense/expense.controller.ts`

- [ ] **Step 1: Add export method to ExpenseService**

In `expense.service.ts`, add a new method after `findAll`:

```typescript
async exportCsv(institutionId: string, query: ExpenseQueryDto) {
  const { category, date_from, date_to, search, sort_by, sort_order } = query;
  const where: any = { institution_id: institutionId };
  if (category) where.category = category;
  if (date_from || date_to) {
    where.date = {};
    if (date_from) where.date.gte = date_from;
    if (date_to) where.date.lte = date_to;
  }
  if (search) {
    where.description = { contains: search, mode: 'insensitive' };
  }

  const expenses = await this.prisma.expense.findMany({
    where,
    orderBy: { [sort_by]: sort_order },
  });

  const header = 'Date,Category,Description,Amount,Recurring,Receipt URL';
  const rows = expenses.map((e) => {
    const date = new Date(e.date).toISOString().split('T')[0];
    const desc = (e.description ?? '').replace(/,/g, ';').replace(/\n/g, ' ');
    return `${date},${e.category},${desc},${e.amount},${e.is_recurring ?? false},${e.receipt_url ?? ''}`;
  });

  return [header, ...rows].join('\n');
}
```

- [ ] **Step 2: Add export endpoint to ExpenseController**

In `expense.controller.ts`, add before the `@Get(':id')` route (order matters — `:id` would catch `export`):

```typescript
@Get('export')
async exportCsv(
  @InstitutionId() institutionId: string,
  @Query(new ZodValidationPipe(ExpenseQuerySchema)) query: ExpenseQueryDto,
) {
  const csv = await this.expenseService.exportCsv(institutionId, query);
  const date = new Date().toISOString().split('T')[0];
  return new StreamableFile(Buffer.from(csv, 'utf-8'), {
    type: 'text/csv',
    disposition: `attachment; filename="expenses_export_${date}.csv"`,
  });
}
```

Add `StreamableFile` import from `@nestjs/common` if not already imported. Also ensure `Query` and `ZodValidationPipe` are imported.

- [ ] **Step 3: Build and verify**

Run: `cd sinaloka-backend && npm run build`

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/expense/expense.service.ts sinaloka-backend/src/modules/expense/expense.controller.ts
git commit -m "feat(backend): add expense CSV export endpoint"
```

---

## Task 4: Frontend — Wire Expense Export Button

**Files:**
- Modify: `sinaloka-platform/src/services/expenses.service.ts`
- Modify: `sinaloka-platform/src/hooks/useExpenses.ts`
- Modify: `sinaloka-platform/src/pages/Finance/OperatingExpenses.tsx`

- [ ] **Step 1: Add export method to expense service**

In `expenses.service.ts`, add:

```typescript
exportCsv: async (params?: { category?: string; search?: string; date_from?: string; date_to?: string }) => {
  const response = await api.get('/api/admin/expenses/export', {
    params,
    responseType: 'blob',
  });
  return response.data as Blob;
},
```

- [ ] **Step 2: Add useExportExpenses hook**

In `useExpenses.ts`, add:

```typescript
export function useExportExpenses() {
  return useMutation({ mutationFn: expensesService.exportCsv });
}
```

Make sure `useMutation` is imported from `@tanstack/react-query`.

- [ ] **Step 3: Wire Export button in OperatingExpenses.tsx**

Import the new hook:
```typescript
import { useExportExpenses } from '@/src/hooks/useExpenses';
```

Inside the component, initialize:
```typescript
const exportExpenses = useExportExpenses();
```

Find the Export button (~lines 219-222) and add onClick:

```tsx
<Button
  variant="outline"
  className="gap-2"
  onClick={() => {
    exportExpenses.mutate(
      {
        ...(filterCategory !== 'all' ? { category: filterCategory } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
      },
      {
        onSuccess: (blob: Blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `expenses_export_${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success(t('common.exportSuccess', { defaultValue: 'Export successful' }));
        },
        onError: () => toast.error(t('common.exportError', { defaultValue: 'Export failed' })),
      }
    );
  }}
  disabled={exportExpenses.isPending}
>
  <Download size={16} />
  {exportExpenses.isPending ? t('common.exporting', { defaultValue: 'Exporting...' }) : t('common.export')}
</Button>
```

- [ ] **Step 4: Build and verify**

Run: `cd sinaloka-platform && npm run build`

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/services/expenses.service.ts sinaloka-platform/src/hooks/useExpenses.ts sinaloka-platform/src/pages/Finance/OperatingExpenses.tsx
git commit -m "feat(platform): wire expense export button to backend CSV endpoint"
```

---

## Task 5: Backend — Extract PaymentGatewayService + WhatsApp Payment Link

**Files:**
- Create: `sinaloka-backend/src/modules/payment/payment-gateway.service.ts`
- Modify: `sinaloka-backend/src/modules/payment/payment.module.ts`
- Modify: `sinaloka-backend/src/modules/whatsapp/whatsapp.service.ts`
- Modify: `sinaloka-backend/src/modules/whatsapp/whatsapp.module.ts`

- [ ] **Step 1: Create PaymentGatewayService**

Create new file `sinaloka-backend/src/modules/payment/payment-gateway.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { MidtransService } from './midtrans.service.js';
import { SettingsService } from '../settings/settings.service.js';

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  constructor(
    private prisma: PrismaService,
    private midtransService: MidtransService,
    private settingsService: SettingsService,
  ) {}

  /**
   * Get or create a Midtrans checkout URL for a payment.
   * Reuses existing snap_redirect_url if already set on the payment.
   * Returns null if Midtrans is not configured for the institution.
   */
  async getOrCreateCheckoutUrl(
    paymentId: string,
    institutionId: string,
  ): Promise<string | null> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, institution_id: institutionId },
      include: {
        student: { select: { name: true, email: true, parent_phone: true } },
        institution: { select: { name: true } },
      },
    });

    if (!payment) return null;

    // Reuse existing URL if already generated
    if (payment.snap_redirect_url) {
      return payment.snap_redirect_url;
    }

    // Generate new checkout URL (includes Midtrans config check)
    try {
      const config = await this.settingsService.getPaymentGatewayConfig(institutionId);
      if (!config?.midtrans_server_key || !config?.midtrans_client_key) {
        return null;
      }

      const orderId = `${payment.id}-${Date.now()}`;
      const result = await this.midtransService.createSnapTransaction(
        {
          midtrans_server_key: config.midtrans_server_key,
          midtrans_client_key: config.midtrans_client_key,
          is_sandbox: config.is_sandbox ?? true,
        },
        {
          orderId,
          grossAmount: Number(payment.amount),
          customerName: payment.student.name,
          itemName: 'Tuition Fee',
        },
      );

      // Persist on payment record
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          snap_token: result.token,
          snap_redirect_url: result.redirect_url,
          midtrans_transaction_id: orderId,
        },
      });

      return result.redirect_url;
    } catch (error) {
      this.logger.error(`Failed to create checkout URL for payment ${paymentId}`, error);
      return null;
    }
  }
}
```

Note: This method returns `null` on any failure — caller decides whether to include link or skip. Read `midtrans.service.ts` to verify the `createSnapTransaction` parameter shape matches.

- [ ] **Step 2: Export PaymentGatewayService from PaymentModule**

In `payment.module.ts`, add `PaymentGatewayService` to providers and exports:

```typescript
import { PaymentGatewayService } from './payment-gateway.service.js';

@Module({
  providers: [MidtransService, PaymentGatewayService, /* ...existing */],
  exports: [MidtransService, PaymentGatewayService],
})
```

Also ensure `SettingsModule` is imported in `PaymentModule` (needed by `PaymentGatewayService`). Check current imports.

- [ ] **Step 3: Import PaymentModule in WhatsAppModule**

In `whatsapp.module.ts`, add:

```typescript
import { PaymentModule } from '../payment/payment.module.js';

@Module({
  imports: [PaymentModule],
  // ...existing
})
```

- [ ] **Step 4: Inject and use PaymentGatewayService in WhatsAppService**

In `whatsapp.service.ts`, inject in constructor:

```typescript
import { PaymentGatewayService } from '../payment/payment-gateway.service.js';

constructor(
  private prisma: PrismaService,
  private paymentGatewayService: PaymentGatewayService,
  // ...existing
) {}
```

Then in `sendPaymentReminder`, after composing the message (line ~344) and before `return this.sendMessage(...)`, add checkout URL:

```typescript
// Generate payment link if Midtrans is configured
let paymentLink = '';
try {
  const checkoutUrl = await this.paymentGatewayService.getOrCreateCheckoutUrl(
    paymentId,
    institutionId,
  );
  if (checkoutUrl) {
    paymentLink = `\n\n📱 Bayar langsung: ${checkoutUrl}`;
  }
} catch (error) {
  this.logger.warn(`Failed to generate checkout URL for payment ${paymentId}`, error);
}

const fullMessage = message + paymentLink;
```

Then change `this.sendMessage({ ... message, ... })` to use `fullMessage` instead of `message`.

- [ ] **Step 5: Build and verify**

Run: `cd sinaloka-backend && npm run build`

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/src/modules/payment/payment-gateway.service.ts sinaloka-backend/src/modules/payment/payment.module.ts sinaloka-backend/src/modules/whatsapp/whatsapp.service.ts sinaloka-backend/src/modules/whatsapp/whatsapp.module.ts
git commit -m "feat(backend): add payment link to WhatsApp reminder via PaymentGatewayService"
```

---

## Task 6: Frontend — Session Edit Modal

**Files:**
- Create: `sinaloka-platform/src/pages/Schedules/EditSessionModal.tsx`
- Modify: `sinaloka-platform/src/pages/Schedules/SessionDetailDrawer.tsx`

- [ ] **Step 1: Create EditSessionModal component**

Create new file `sinaloka-platform/src/pages/Schedules/EditSessionModal.tsx`:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal, Button, Input, Select, Label } from '../../components/UI';
import { useUpdateSession } from '@/src/hooks/useSessions';

interface EditSessionModalProps {
  session: {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

export function EditSessionModal({ session, isOpen, onClose }: EditSessionModalProps) {
  const { t } = useTranslation();
  const updateSession = useUpdateSession();

  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState('');

  // Sync state when session changes
  const resetForm = () => {
    if (session) {
      setDate(new Date(session.date).toISOString().split('T')[0]);
      setStartTime(session.start_time);
      setEndTime(session.end_time);
      setStatus(session.status);
    }
  };

  // Reset form when modal opens with new session
  if (isOpen && session && date === '') {
    resetForm();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    try {
      await updateSession.mutateAsync({
        id: session.id,
        data: {
          date: new Date(date),
          start_time: startTime,
          end_time: endTime,
          status,
        },
      });
      toast.success(t('schedules.toast.sessionUpdated', { defaultValue: 'Session updated' }));
      handleClose();
    } catch {
      toast.error(t('schedules.toast.sessionUpdateError', { defaultValue: 'Failed to update session' }));
    }
  };

  const handleClose = () => {
    setDate('');
    setStartTime('');
    setEndTime('');
    setStatus('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('schedules.editSession', { defaultValue: 'Edit Session' })}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t('schedules.form.date', { defaultValue: 'Date' })}</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t('schedules.form.startTime', { defaultValue: 'Start Time' })}</Label>
            <Select
              value={startTime}
              onChange={setStartTime}
              options={TIME_SLOTS.map((slot) => ({ value: slot, label: slot }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('schedules.form.endTime', { defaultValue: 'End Time' })}</Label>
            <Select
              value={endTime}
              onChange={setEndTime}
              options={TIME_SLOTS.map((slot) => ({ value: slot, label: slot }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t('schedules.form.status', { defaultValue: 'Status' })}</Label>
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { value: 'SCHEDULED', label: t('schedules.status.scheduled', { defaultValue: 'Scheduled' }) },
              { value: 'CANCELLED', label: t('schedules.status.cancelled', { defaultValue: 'Cancelled' }) },
            ]}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={updateSession.isPending}>
            {updateSession.isPending
              ? t('common.saving', { defaultValue: 'Saving...' })
              : t('common.saveChanges', { defaultValue: 'Save Changes' })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

Note: Verify the exact import paths for `Modal`, `Button`, `Input`, `Select`, `Label` from the UI components. Check existing Schedule modal files for the pattern used.

- [ ] **Step 2: Add Edit button and modal to SessionDetailDrawer**

In `SessionDetailDrawer.tsx`, import the new modal:

```typescript
import { EditSessionModal } from './EditSessionModal';
```

Add `useState` to the React import at the top of the file if not already present:

```typescript
import { useState } from 'react';
```

Then add state for the edit modal (near existing state):

```typescript
const [showEditModal, setShowEditModal] = useState(false);
```

In the action buttons section (lines ~227-256), inside the non-locked branch, add an "Edit" button before the existing "Mark Attendance" button:

```tsx
<Button
  variant="outline"
  onClick={() => setShowEditModal(true)}
>
  {t('schedules.drawer.editSession', { defaultValue: 'Edit Session' })}
</Button>
```

At the bottom of the component JSX (before the closing fragment/div), add the modal:

```tsx
<EditSessionModal
  session={selectedSession ? {
    id: selectedSession.id,
    date: selectedSession.date,
    start_time: selectedSession.start_time,
    end_time: selectedSession.end_time,
    status: selectedSession.status,
  } : null}
  isOpen={showEditModal}
  onClose={() => setShowEditModal(false)}
/>
```

- [ ] **Step 3: Verify useUpdateSession hook exists**

Check `sinaloka-platform/src/hooks/useSessions.ts` for `useUpdateSession`. It should already exist. If the mutation function signature differs from `{ id, data }`, adjust `EditSessionModal` accordingly.

- [ ] **Step 4: Build and verify**

Run: `cd sinaloka-platform && npm run build`

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/pages/Schedules/EditSessionModal.tsx sinaloka-platform/src/pages/Schedules/SessionDetailDrawer.tsx
git commit -m "feat(platform): add session edit modal for date, time, and status"
```

---

## Task 7: Final Verification & PR

- [ ] **Step 1: Full build check**

```bash
cd sinaloka-backend && npm run build
cd ../sinaloka-platform && npm run build && npm run lint
```

- [ ] **Step 2: Create PR**

```bash
gh pr create --title "feat: sprint 3 UX improvements — reject email, session edit, expense export, WhatsApp payment link" --body "$(cat <<'EOF'
## Summary
- **Registration Reject Email**: send email notification to registrant when rejected, with optional reason. Student email now required in registration form.
- **Session Edit Modal**: admin can edit session date, time, and status via new Edit button in session drawer. Scoped to existing fields (tutor/room override deferred to future sprint).
- **Remove Enrollment Stub**: removed dead "Send Reminder" CreditCard button from enrollment table.
- **Expense Export**: new backend CSV export endpoint + wired frontend Export button with active filter support.
- **WhatsApp Payment Link**: payment reminder now includes Midtrans checkout URL. Extracted PaymentGatewayService for checkout URL reuse across modules.

## Test plan
- [ ] Reject student registration → email sent to registrant with reason
- [ ] Submit student registration without email → backend validation error
- [ ] Edit session date/time → session moves in calendar view
- [ ] Edit session status to CANCELLED → session cancelled
- [ ] Cannot edit locked sessions (completed/past)
- [ ] OVERDUE enrollment row no longer shows CreditCard button
- [ ] Click Export on expenses → CSV downloaded with all expenses (not just current page)
- [ ] Export respects active category/search filters
- [ ] WhatsApp payment reminder includes checkout link
- [ ] WhatsApp reminder without Midtrans config → sent without link (no error)

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
