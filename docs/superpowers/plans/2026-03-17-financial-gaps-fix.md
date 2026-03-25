# Financial Gaps Fix — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all incomplete/stub features in the financial management system identified by the audit.

**Architecture:** Layered approach — Layer 1 (upload infra + schema migration) must complete first, then 3 parallel streams (expense/payout/payment fixes) can run concurrently with zero file overlap, followed by Layer 3 standalone enhancements.

**Tech Stack:** NestJS, Prisma, Zod, PDFKit, Multer, React, TanStack Query, TailwindCSS v4, Axios

**Spec:** `docs/superpowers/specs/2026-03-17-financial-gaps-fix-design.md`

---

## Chunk 1: Layer 1 — Foundation

### Task 1: Add file upload POST endpoint

**Files:**
- Modify: `sinaloka-backend/src/modules/upload/upload.controller.ts`

- [ ] **Step 1: Add POST upload endpoint to controller**

```typescript
// Add to imports at top of file
import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  ForbiddenException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { UploadService } from './upload.service.js';

const ALLOWED_UPLOAD_TYPES = ['receipts', 'proofs', 'logos'];

// Add this method to UploadController class, before the existing serveFile method:
@Post(':type')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@UseInterceptors(FileInterceptor('file'))
async uploadFile(
  @Param('type') type: string,
  @CurrentUser() user: JwtPayload,
  @UploadedFile() file: Express.Multer.File,
) {
  if (!ALLOWED_UPLOAD_TYPES.includes(type)) {
    throw new BadRequestException(
      `Upload type '${type}' not allowed. Use: ${ALLOWED_UPLOAD_TYPES.join(', ')}`,
    );
  }
  if (!file) {
    throw new BadRequestException('No file provided');
  }
  const url = await this.uploadService.saveFile(
    file,
    user.institutionId!,
    type,
  );
  return { url };
}
```

- [ ] **Step 2: Verify backend compiles**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/upload/upload.controller.ts
git commit -m "feat(upload): add POST /api/uploads/:type endpoint for file uploads"
```

---

### Task 2: Schema migration — recurring expenses + payout slip

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`

- [ ] **Step 1: Add fields to Expense model**

In `prisma/schema.prisma`, add these fields to the `Expense` model (after `receipt_url` field, before `created_at`):

```prisma
  is_recurring          Boolean   @default(false)
  recurrence_frequency  String?
  recurrence_end_date   DateTime? @db.Date
```

- [ ] **Step 2: Add slip_url to Payout model**

In `prisma/schema.prisma`, add this field to the `Payout` model (after `proof_url`, before `description`):

```prisma
  slip_url        String?
```

- [ ] **Step 3: Run migration**

Run: `cd sinaloka-backend && npx prisma migrate dev --name add_recurring_expenses_and_payout_slip`
Expected: Migration created and applied successfully

- [ ] **Step 4: Regenerate Prisma client**

Run: `cd sinaloka-backend && npm run prisma:generate`
Expected: Prisma client generated to `generated/prisma/`

- [ ] **Step 5: Verify backend compiles**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/prisma/schema.prisma sinaloka-backend/prisma/migrations/
git commit -m "feat(schema): add recurring expense fields and payout slip_url"
```

---

## Chunk 2: Stream A — Expense Fixes

### Task 3: Backend — expense search filter

**Files:**
- Modify: `sinaloka-backend/src/modules/expense/expense.dto.ts:23-32`
- Modify: `sinaloka-backend/src/modules/expense/expense.service.ts:20-28`

- [ ] **Step 1: Add search to ExpenseQuerySchema**

In `expense.dto.ts`, add `search` field to `ExpenseQuerySchema`:

```typescript
export const ExpenseQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().min(1).max(50).optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  search: z.string().max(100).optional(),
  sort_by: z.enum(['date', 'amount', 'created_at']).default('date'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
```

- [ ] **Step 2: Add search filter to service**

In `expense.service.ts`, in `findAll()`, after the date_to filter block (line 28), add:

```typescript
    if (query.search) {
      where.description = { contains: query.search, mode: 'insensitive' };
    }
```

- [ ] **Step 3: Verify backend compiles**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/expense/expense.dto.ts sinaloka-backend/src/modules/expense/expense.service.ts
git commit -m "feat(expense): add search filter to expense listing"
```

---

### Task 4: Backend — recurring expense fields in DTOs

**Files:**
- Modify: `sinaloka-backend/src/modules/expense/expense.dto.ts:1-21`

- [ ] **Step 1: Add recurring fields to Create/Update schemas**

In `expense.dto.ts`, update `CreateExpenseSchema`:

```typescript
export const CreateExpenseSchema = z.object({
  category: z.string().min(1).max(50),
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
  description: z.string().max(500).optional().nullable(),
  receipt_url: z.string().max(500).optional().nullable(),
  is_recurring: z.boolean().default(false),
  recurrence_frequency: z.enum(['weekly', 'monthly']).optional().nullable(),
  recurrence_end_date: z.coerce.date().optional().nullable(),
});
```

Update `UpdateExpenseSchema`:

```typescript
export const UpdateExpenseSchema = z.object({
  category: z.string().min(1).max(50).optional(),
  amount: z.coerce.number().positive().optional(),
  date: z.coerce.date().optional(),
  description: z.string().max(500).optional().nullable(),
  receipt_url: z.string().max(500).optional().nullable(),
  is_recurring: z.boolean().optional(),
  recurrence_frequency: z.enum(['weekly', 'monthly']).optional().nullable(),
  recurrence_end_date: z.coerce.date().optional().nullable(),
});
```

- [ ] **Step 2: Verify backend compiles**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/expense/expense.dto.ts
git commit -m "feat(expense): add recurring expense fields to DTOs"
```

---

### Task 5: Backend — recurring expense processing

**Files:**
- Modify: `sinaloka-backend/src/modules/expense/expense.service.ts`
- Modify: `sinaloka-backend/src/modules/expense/expense.controller.ts`

- [ ] **Step 1: Add processRecurringExpenses to service**

In `expense.service.ts`, add this method to `ExpenseService` class:

```typescript
  async processRecurringExpenses(institutionId: string) {
    const recurring = await this.prisma.expense.findMany({
      where: {
        institution_id: institutionId,
        is_recurring: true,
      },
    });

    let created = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const expense of recurring) {
      // Skip if end date has passed
      if (expense.recurrence_end_date && expense.recurrence_end_date < today) {
        continue;
      }

      const freq = expense.recurrence_frequency;
      if (!freq) continue;

      // Generate all missed occurrences (catch-up loop)
      const baseDate = new Date(expense.date);
      let nextDate = new Date(baseDate);

      // Advance to first occurrence after the base date
      if (freq === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else {
        nextDate.setDate(nextDate.getDate() + 7);
      }

      while (nextDate <= today) {
        // Skip if past end date
        if (expense.recurrence_end_date && nextDate > expense.recurrence_end_date) {
          break;
        }

        const existing = await this.prisma.expense.findFirst({
          where: {
            institution_id: institutionId,
            category: expense.category,
            amount: expense.amount,
            date: nextDate,
            is_recurring: false,
          },
        });

        if (!existing) {
          await this.prisma.expense.create({
            data: {
              institution_id: institutionId,
              category: expense.category,
              amount: expense.amount,
              date: new Date(nextDate),
              description: `Recurring: ${expense.description ?? expense.category}`,
              is_recurring: false,
            },
          });
          created++;
        }

        // Advance to next occurrence
        if (freq === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else {
          nextDate.setDate(nextDate.getDate() + 7);
        }
      }
    }

    return { processed: recurring.length, created };
  }
```

- [ ] **Step 2: Add process-recurring endpoint to controller**

In `expense.controller.ts`, add import for `Post` (already imported) and add this method to `ExpenseController`:

```typescript
  @Post('process-recurring')
  processRecurring(@CurrentUser() user: JwtPayload) {
    return this.expenseService.processRecurringExpenses(user.institutionId!);
  }
```

**Important:** Place this method BEFORE the `@Get(':id')` route to avoid route conflict.

- [ ] **Step 3: Verify backend compiles**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/expense/expense.service.ts sinaloka-backend/src/modules/expense/expense.controller.ts
git commit -m "feat(expense): add recurring expense processing endpoint"
```

---

### Task 6: Frontend — expense type updates + service upload function

**Files:**
- Modify: `sinaloka-platform/src/types/expense.ts`
- Modify: `sinaloka-platform/src/services/expenses.service.ts`

- [ ] **Step 1: Update expense types**

Replace `sinaloka-platform/src/types/expense.ts` content:

```typescript
import type { PaginationParams } from './common';

export type ExpenseCategory = string;

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string | null;
  receipt_url: string | null;
  is_recurring: boolean;
  recurrence_frequency: 'weekly' | 'monthly' | null;
  recurrence_end_date: string | null;
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseDto {
  category: string;
  amount: number;
  date: string;
  description?: string;
  receipt_url?: string;
  is_recurring?: boolean;
  recurrence_frequency?: 'weekly' | 'monthly';
  recurrence_end_date?: string;
}

export interface UpdateExpenseDto {
  category?: string;
  amount?: number;
  date?: string;
  description?: string;
  receipt_url?: string;
  is_recurring?: boolean;
  recurrence_frequency?: 'weekly' | 'monthly';
  recurrence_end_date?: string;
}

export interface ExpenseQueryParams extends PaginationParams {
  category?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}
```

- [ ] **Step 2: Add upload function to expenses service**

In `sinaloka-platform/src/services/expenses.service.ts`, add the upload function:

```typescript
import api from '@/src/lib/api';
import type { PaginatedResponse } from '@/src/types/common';
import type { Expense, CreateExpenseDto, UpdateExpenseDto, ExpenseQueryParams } from '@/src/types/expense';

export const expensesService = {
  getAll: (params?: ExpenseQueryParams) =>
    api.get<PaginatedResponse<Expense>>('/api/admin/expenses', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<Expense>(`/api/admin/expenses/${id}`).then((r) => r.data),
  create: (data: CreateExpenseDto) =>
    api.post<Expense>('/api/admin/expenses', data).then((r) => r.data),
  update: ({ id, data }: { id: string; data: UpdateExpenseDto }) =>
    api.patch<Expense>(`/api/admin/expenses/${id}`, data).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/api/admin/expenses/${id}`),
  uploadReceipt: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string }>('/api/uploads/receipts', formData).then((r) => r.data);
  },
};
```

- [ ] **Step 3: Verify frontend compiles**

Run: `cd sinaloka-platform && npx tsc --noEmit`
Expected: No errors (or only pre-existing errors)

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/types/expense.ts sinaloka-platform/src/services/expenses.service.ts
git commit -m "feat(expense): update types for recurring expenses and add upload service"
```

---

### Task 7: Frontend — wire OperatingExpenses search, dynamic categories, receipt upload, recurring

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/OperatingExpenses.tsx`

This is the largest frontend task in Stream A. The implementer must read the current `OperatingExpenses.tsx` file in full before making changes. Key changes:

- [ ] **Step 1: Read the current OperatingExpenses.tsx in full**

Read `sinaloka-platform/src/pages/Finance/OperatingExpenses.tsx` to understand the current component structure, state variables, and UI layout.

- [ ] **Step 2: Replace hardcoded categories with dynamic ones**

Find the hardcoded `EXPENSE_CATEGORIES` constant (line ~15) and replace:

```typescript
// REMOVE this line:
// const EXPENSE_CATEGORIES: ExpenseCategory[] = ['RENT', 'UTILITIES', 'SUPPLIES', 'MARKETING', 'OTHER'];

// In the component, add:
const { data: billingSettings } = useBillingSettings();
const expenseCategories = billingSettings?.expense_categories ?? ['RENT', 'UTILITIES', 'SUPPLIES', 'MARKETING', 'OTHER'];
```

Add import: `import { useBillingSettings } from '@/src/hooks/useSettings';`

Replace all references to `EXPENSE_CATEGORIES` with `expenseCategories`.

- [ ] **Step 3: Wire search input to query params**

Find the search input (line ~204) and the `useExpenses` hook call. Add debounced search state:

```typescript
const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearch, setDebouncedSearch] = useState('');

useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
  return () => clearTimeout(timer);
}, [searchTerm]);
```

Pass `search: debouncedSearch || undefined` to the `useExpenses()` query params.

Wire the search input's `onChange` to `setSearchTerm`.

- [ ] **Step 4: Wire receipt upload in the expense drawer**

Find the receipt upload zone in the drawer (line ~393-398). Replace the non-functional drag-drop with:

```typescript
const [uploading, setUploading] = useState(false);

const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setUploading(true);
  try {
    const { url } = await expensesService.uploadReceipt(file);
    setReceiptUrl(url);
    toast.success(t('expenses.receiptUploaded'));
  } catch {
    toast.error(t('expenses.receiptUploadFailed'));
  } finally {
    setUploading(false);
  }
};
```

Add a `receiptUrl` state and include it in the create/update form submission.

- [ ] **Step 5: Wire recurring toggle and frequency to form submission**

Find the `isRecurring` toggle state (line ~22) and the frequency selector. Include these in the create/update mutation payload:

```typescript
// In form submission handler, add to the payload:
is_recurring: isRecurring,
recurrence_frequency: isRecurring ? frequency : null,
recurrence_end_date: isRecurring ? recurrenceEndDate : null,
```

Show a recurring badge on expense rows where `e.is_recurring === true`.

- [ ] **Step 6: Verify frontend compiles**

Run: `cd sinaloka-platform && npx tsc --noEmit`
Expected: No errors (or only pre-existing errors)

- [ ] **Step 7: Commit**

```bash
git add sinaloka-platform/src/pages/Finance/OperatingExpenses.tsx
git commit -m "feat(expense): wire search, dynamic categories, receipt upload, recurring expenses"
```

---

## Chunk 3: Stream B — Payout Fixes

### Task 8: Backend — add proof_url and slip_url to payout DTO

**Files:**
- Modify: `sinaloka-backend/src/modules/payout/payout.dto.ts:16-24`

- [ ] **Step 1: Update UpdatePayoutSchema**

In `payout.dto.ts`, add `proof_url` and `slip_url` to `UpdatePayoutSchema`:

```typescript
export const UpdatePayoutSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  date: z.coerce.date().optional(),
  status: PayoutStatus.optional(),
  description: z.string().max(500).optional().nullable(),
  period_start: z.coerce.date().optional().nullable(),
  period_end: z.coerce.date().optional().nullable(),
  proof_url: z.string().max(500).optional().nullable(),
  slip_url: z.string().max(500).optional().nullable(),
});
```

- [ ] **Step 2: Verify backend compiles**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/payout/payout.dto.ts
git commit -m "feat(payout): add proof_url and slip_url to UpdatePayoutSchema"
```

---

### Task 9: Backend — payout slip PDF service

**Files:**
- Create: `sinaloka-backend/src/modules/payout/payout-slip.service.ts`
- Modify: `sinaloka-backend/src/modules/payout/payout.module.ts`
- Modify: `sinaloka-backend/src/modules/payout/payout.controller.ts`

- [ ] **Step 1: Create PayoutSlipService**

Create `sinaloka-backend/src/modules/payout/payout-slip.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

const LABELS = {
  id: {
    title: 'SLIP PEMBAYARAN',
    slipNumber: 'No. Slip',
    date: 'Tanggal',
    tutor: 'Tutor',
    bankName: 'Bank',
    accountNumber: 'No. Rekening',
    accountHolder: 'Atas Nama',
    period: 'Periode',
    sessionBreakdown: 'Rincian Sesi',
    className: 'Kelas',
    sessionDate: 'Tanggal',
    fee: 'Honorarium',
    baseAmount: 'Jumlah Dasar',
    bonus: 'Bonus',
    deduction: 'Potongan',
    netPayout: 'Total Pembayaran',
    status: 'Status',
    statusPending: 'Menunggu',
    statusProcessing: 'Diproses',
    statusPaid: 'Dibayar',
    footer: 'Dibuat oleh Sinaloka Platform',
  },
  en: {
    title: 'PAYOUT SLIP',
    slipNumber: 'Slip No.',
    date: 'Date',
    tutor: 'Tutor',
    bankName: 'Bank',
    accountNumber: 'Account No.',
    accountHolder: 'Account Holder',
    period: 'Period',
    sessionBreakdown: 'Session Breakdown',
    className: 'Class',
    sessionDate: 'Date',
    fee: 'Fee',
    baseAmount: 'Base Amount',
    bonus: 'Bonus',
    deduction: 'Deduction',
    netPayout: 'Net Payout',
    status: 'Status',
    statusPending: 'Pending',
    statusProcessing: 'Processing',
    statusPaid: 'Paid',
    footer: 'Generated by Sinaloka Platform',
  },
};

@Injectable()
export class PayoutSlipService {
  private readonly logger = new Logger(PayoutSlipService.name);
  private readonly uploadDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.uploadDir = this.configService.get('UPLOAD_DIR', './uploads')!;
  }

  async generateSlip(institutionId: string, payoutId: string) {
    const payout = await this.prisma.payout.findFirst({
      where: { id: payoutId, institution_id: institutionId },
      include: { tutor: { include: { user: { select: { name: true } } } } },
    });

    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.slip_url) throw new ConflictException('Slip already generated');

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });
    if (!institution) throw new NotFoundException('Institution not found');

    const lang = (institution.default_language === 'en' ? 'en' : 'id') as keyof typeof LABELS;
    const l = LABELS[lang];

    // Fetch sessions for the period
    const sessions = payout.period_start && payout.period_end
      ? await this.prisma.session.findMany({
          where: {
            institution_id: institutionId,
            class: { tutor_id: payout.tutor_id },
            status: 'COMPLETED',
            tutor_fee_amount: { not: null },
            date: { gte: payout.period_start, lte: payout.period_end },
          },
          include: { class: { select: { name: true } } },
          orderBy: { date: 'asc' },
        })
      : [];

    const slipNumber = await this.generateSlipNumber(institutionId);

    const pdfBuffer = await this.generatePdf({
      institution,
      payout,
      sessions,
      slipNumber,
      labels: l,
      lang,
    });

    const slipDir = path.join(this.uploadDir, institutionId, 'slips');
    fs.mkdirSync(slipDir, { recursive: true });

    const filename = `${slipNumber.replace(/\//g, '-')}.pdf`;
    const filepath = path.join(slipDir, filename);
    fs.writeFileSync(filepath, pdfBuffer);

    const slipUrl = `${institutionId}/slips/${filename}`;

    const updated = await this.prisma.payout.update({
      where: { id: payoutId },
      data: { slip_url: slipUrl },
      include: { tutor: { include: { user: { select: { name: true } } } } },
    });

    this.logger.log(`Payout slip ${slipNumber} generated for payout ${payoutId}`);
    return updated;
  }

  private async generateSlipNumber(institutionId: string): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const institution = await tx.institution.findUnique({
        where: { id: institutionId },
        select: { settings: true },
      });

      const settings = (institution?.settings as any) ?? {};
      const billing = settings.billing ?? {};
      const counter = billing.payout_slip_counter ?? {};

      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const yyyymm = monthKey.replace('-', '');

      const currentCount = (counter[monthKey] ?? 0) + 1;
      counter[monthKey] = currentCount;

      await tx.institution.update({
        where: { id: institutionId },
        data: {
          settings: {
            ...settings,
            billing: { ...billing, payout_slip_counter: counter },
          },
        },
      });

      return `PAY-${yyyymm}-${String(currentCount).padStart(3, '0')}`;
    }, { isolationLevel: 'Serializable' });
  }

  private async generatePdf(params: {
    institution: any;
    payout: any;
    sessions: any[];
    slipNumber: string;
    labels: (typeof LABELS)['id'];
    lang: string;
  }): Promise<Buffer> {
    const { institution, payout, sessions, slipNumber, labels } = params;
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    const locale = params.lang === 'id' ? 'id-ID' : 'en-US';
    const formatAmount = (amount: number) =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(amount);

    const formatDate = (date: Date | string) =>
      new Date(date).toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

    // --- Header ---
    let headerY = 50;
    if (institution.logo_url) {
      try {
        const logoPath = path.resolve(this.uploadDir, institution.logo_url);
        const resolvedUploadDir = path.resolve(this.uploadDir);
        if (
          logoPath.startsWith(resolvedUploadDir + path.sep) &&
          fs.existsSync(logoPath)
        ) {
          doc.image(logoPath, 50, headerY, { width: 50 });
        }
      } catch { /* skip logo */ }
    }

    const textX = institution.logo_url ? 110 : 50;
    doc.fontSize(16).font('Helvetica-Bold').text(institution.name, textX, headerY);
    doc.fontSize(9).font('Helvetica');
    if (institution.address) doc.text(institution.address, textX);
    const contactParts = [institution.phone, institution.email].filter(Boolean);
    if (contactParts.length) doc.text(contactParts.join(' | '), textX);

    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e4e4e7');
    doc.moveDown();

    // --- Title ---
    doc.fontSize(20).font('Helvetica-Bold').text(labels.title, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`${labels.slipNumber}: ${slipNumber}`, { align: 'center' });
    doc.text(`${labels.date}: ${formatDate(new Date())}`, { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e4e4e7');
    doc.moveDown();

    // --- Tutor Info ---
    doc.fontSize(11).font('Helvetica-Bold').text(labels.tutor);
    doc.fontSize(10).font('Helvetica');
    doc.text(`${payout.tutor?.user?.name ?? '-'}`);
    if (payout.tutor?.bank_name) {
      doc.text(`${labels.bankName}: ${payout.tutor.bank_name}`);
      doc.text(`${labels.accountNumber}: ${payout.tutor.bank_account_number ?? '-'}`);
      doc.text(`${labels.accountHolder}: ${payout.tutor.bank_account_holder ?? '-'}`);
    }
    if (payout.period_start && payout.period_end) {
      doc.text(`${labels.period}: ${formatDate(payout.period_start)} - ${formatDate(payout.period_end)}`);
    }
    doc.moveDown();

    // --- Session Breakdown ---
    if (sessions.length > 0) {
      doc.fontSize(11).font('Helvetica-Bold').text(labels.sessionBreakdown);
      doc.moveDown(0.5);

      const tableY = doc.y;
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text(labels.sessionDate, 50, tableY);
      doc.text(labels.className, 180, tableY);
      doc.text(labels.fee, 400, tableY, { align: 'right', width: 145 });
      doc.moveTo(50, tableY + 15).lineTo(545, tableY + 15).stroke('#e4e4e7');

      doc.font('Helvetica').fontSize(9);
      let y = tableY + 22;
      for (const s of sessions) {
        if (y > 720) { doc.addPage(); y = 50; }
        doc.text(formatDate(s.date), 50, y);
        doc.text(s.class.name, 180, y);
        doc.text(formatAmount(Number(s.tutor_fee_amount)), 400, y, { align: 'right', width: 145 });
        y += 16;
      }
      doc.y = y;
      doc.moveDown();
    }

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e4e4e7');
    doc.moveDown();

    // --- Summary ---
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text(`${labels.netPayout}: ${formatAmount(Number(payout.amount))}`);
    doc.moveDown(0.5);

    const statusMap: Record<string, string> = {
      PENDING: labels.statusPending,
      PROCESSING: labels.statusProcessing,
      PAID: labels.statusPaid,
    };
    doc.fontSize(10).font('Helvetica');
    doc.text(`${labels.status}: ${statusMap[payout.status] ?? payout.status}`);
    doc.moveDown(2);

    // --- Footer ---
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e4e4e7');
    doc.moveDown(1);
    doc.fontSize(8).fillColor('#a1a1aa').text(labels.footer, { align: 'center' });

    doc.end();
    return new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  }
}
```

- [ ] **Step 2: Update PayoutModule to register PayoutSlipService**

Replace `sinaloka-backend/src/modules/payout/payout.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PayoutController } from './payout.controller.js';
import { TutorPayoutController } from './tutor-payout.controller.js';
import { PayoutService } from './payout.service.js';
import { PayoutSlipService } from './payout-slip.service.js';

@Module({
  controllers: [PayoutController, TutorPayoutController],
  providers: [PayoutService, PayoutSlipService],
  exports: [PayoutService],
})
export class PayoutModule {}
```

- [ ] **Step 3: Add generate-slip endpoint to controller**

In `sinaloka-backend/src/modules/payout/payout.controller.ts`, add import for `PayoutSlipService` and `Post`, then add this method BEFORE the `@Get(':id')` route:

```typescript
// Add to constructor:
constructor(
  private readonly payoutService: PayoutService,
  private readonly payoutSlipService: PayoutSlipService,
) {}

// Add this endpoint BEFORE @Get(':id'):
@Post(':id/generate-slip')
generateSlip(
  @CurrentUser() user: JwtPayload,
  @Param('id', ParseUUIDPipe) id: string,
) {
  return this.payoutSlipService.generateSlip(user.institutionId!, id);
}
```

- [ ] **Step 4: Verify backend compiles**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/payout/payout-slip.service.ts sinaloka-backend/src/modules/payout/payout.module.ts sinaloka-backend/src/modules/payout/payout.controller.ts
git commit -m "feat(payout): add payout slip PDF generation service and endpoint"
```

---

### Task 10: Backend — payout export audit endpoint

**Files:**
- Modify: `sinaloka-backend/src/modules/payout/payout.service.ts`
- Modify: `sinaloka-backend/src/modules/payout/payout.controller.ts`

- [ ] **Step 1: Add exportAudit method to service**

In `payout.service.ts`, add import for `stringify` from `csv-stringify/sync` at top:

```typescript
import { stringify } from 'csv-stringify/sync';
```

Then add this method to `PayoutService`:

```typescript
  async exportAudit(institutionId: string, payoutId: string): Promise<string> {
    const payout = await this.findOne(institutionId, payoutId);

    const sessions = payout.period_start && payout.period_end
      ? await this.prisma.session.findMany({
          where: {
            institution_id: institutionId,
            class: { tutor_id: payout.tutor_id },
            status: 'COMPLETED',
            tutor_fee_amount: { not: null },
            date: { gte: new Date(payout.period_start), lte: new Date(payout.period_end) },
          },
          include: { class: { select: { name: true } } },
          orderBy: { date: 'asc' },
        })
      : [];

    const summaryRows = [
      { field: 'Payout ID', value: payout.id },
      { field: 'Tutor', value: (payout as any).tutor?.name ?? '' },
      { field: 'Amount', value: String(Number(payout.amount)) },
      { field: 'Status', value: payout.status },
      { field: 'Date', value: payout.date?.toISOString().split('T')[0] ?? '' },
      { field: 'Period Start', value: payout.period_start?.toISOString().split('T')[0] ?? '' },
      { field: 'Period End', value: payout.period_end?.toISOString().split('T')[0] ?? '' },
      { field: 'Proof URL', value: payout.proof_url ?? '' },
      { field: 'Created', value: payout.created_at.toISOString() },
      { field: 'Updated', value: payout.updated_at.toISOString() },
    ];

    const summaryCsv = stringify(summaryRows, { header: true, columns: ['field', 'value'] });

    if (sessions.length === 0) return summaryCsv;

    const sessionRows = sessions.map((s) => ({
      date: s.date.toISOString().split('T')[0],
      class: s.class.name,
      fee: String(Number(s.tutor_fee_amount)),
    }));

    const sessionCsv = stringify(sessionRows, { header: true, columns: ['date', 'class', 'fee'] });

    return `${summaryCsv}\nSession Breakdown\n${sessionCsv}`;
  }
```

- [ ] **Step 2: Add export-audit endpoint to controller**

In `payout.controller.ts`, add import for `Res` from `@nestjs/common` and `Response` type:

```typescript
import type { Response } from 'express';
```

Add this endpoint (BEFORE `@Get(':id')`):

```typescript
  @Get(':id/export-audit')
  async exportAudit(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const csv = await this.payoutService.exportAudit(user.institutionId!, id);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="payout_audit_${id}.csv"`,
    });
    res.send(csv);
  }
```

**Important route ordering:** Place `calculate`, `:id/generate-slip`, and `:id/export-audit` endpoints BEFORE the generic `@Get(':id')` route.

- [ ] **Step 3: Verify backend compiles**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/payout/payout.service.ts sinaloka-backend/src/modules/payout/payout.controller.ts
git commit -m "feat(payout): add export audit CSV endpoint"
```

---

### Task 11: Frontend — payout types, service, and TutorPayouts wiring

**Files:**
- Modify: `sinaloka-platform/src/types/payout.ts`
- Modify: `sinaloka-platform/src/services/payouts.service.ts`
- Modify: `sinaloka-platform/src/pages/Finance/TutorPayouts.tsx`

- [ ] **Step 1: Update payout types**

In `sinaloka-platform/src/types/payout.ts`, add `proof_url` and `slip_url` to `Payout` interface:

```typescript
export interface Payout {
  id: string;
  tutor_id: string;
  amount: number;
  date: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID';
  description: string | null;
  proof_url: string | null;
  slip_url: string | null;
  tutor?: {
    id: string;
    name?: string;
    bank_name?: string | null;
    bank_account_number?: string | null;
    user?: { name: string };
  };
  period_start: string | null;
  period_end: string | null;
  institution_id: string;
  created_at: string;
  updated_at: string;
}
```

Add `proof_url` and `slip_url` to `UpdatePayoutDto`:

```typescript
export interface UpdatePayoutDto {
  amount?: number;
  date?: string;
  status?: 'PENDING' | 'PROCESSING' | 'PAID';
  description?: string;
  period_start?: string;
  period_end?: string;
  proof_url?: string;
  slip_url?: string;
}
```

- [ ] **Step 2: Add service functions for upload, slip, and audit**

In `sinaloka-platform/src/services/payouts.service.ts`, add:

```typescript
  uploadProof: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string }>('/api/uploads/proofs', formData).then((r) => r.data);
  },
  generateSlip: (id: string) =>
    api.post<Payout>(`/api/admin/payouts/${id}/generate-slip`).then((r) => r.data),
  exportAudit: (id: string) =>
    api.get(`/api/admin/payouts/${id}/export-audit`, { responseType: 'blob' }).then((r) => r.data),
```

- [ ] **Step 3: Read and modify TutorPayouts.tsx**

Read the full `TutorPayouts.tsx` file first. Then make these changes:

1. **Proof upload** — Find the file input in reconciliation view (line ~250-270). Wire `onChange` to:
   ```typescript
   const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     try {
       const { url } = await payoutsService.uploadProof(file);
       await payoutsService.update({ id: selectedPayout.id, data: { proof_url: url } });
       queryClient.invalidateQueries({ queryKey: ['payouts'] });
       toast.success(t('payouts.proofUploaded'));
     } catch {
       toast.error(t('payouts.proofUploadFailed'));
     }
   };
   ```

2. **Payout slip download** — Find the slip download button (line ~181-193). Wire to:
   ```typescript
   const handleGenerateSlip = async (payoutId: string) => {
     try {
       const updated = await payoutsService.generateSlip(payoutId);
       queryClient.invalidateQueries({ queryKey: ['payouts'] });
       // Download the slip using the response (not stale cache)
       if (updated.slip_url) {
         window.open(`${import.meta.env.VITE_API_URL}/api/uploads/${updated.slip_url}`, '_blank');
       }
       toast.success(t('payouts.slipGenerated'));
     } catch {
       toast.error(t('payouts.slipGenerationFailed'));
     }
   };
   ```

3. **Export audit** — Find the export audit button (line ~176-178). Wire to:
   ```typescript
   const handleExportAudit = async (payoutId: string) => {
     try {
       const blob = await payoutsService.exportAudit(payoutId);
       const url = URL.createObjectURL(new Blob([blob]));
       const a = document.createElement('a');
       a.href = url;
       a.download = `payout_audit_${payoutId}.csv`;
       a.click();
       URL.revokeObjectURL(url);
     } catch {
       toast.error(t('payouts.exportFailed'));
     }
   };
   ```

- [ ] **Step 4: Verify frontend compiles**

Run: `cd sinaloka-platform && npx tsc --noEmit`
Expected: No errors (or only pre-existing errors)

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/types/payout.ts sinaloka-platform/src/services/payouts.service.ts sinaloka-platform/src/pages/Finance/TutorPayouts.tsx
git commit -m "feat(payout): wire proof upload, slip generation, and export audit in frontend"
```

---

## Chunk 4: Stream C — Payment Fixes

### Task 12: Backend — batch payment recording

**Files:**
- Modify: `sinaloka-backend/src/modules/payment/payment.dto.ts`
- Modify: `sinaloka-backend/src/modules/payment/payment.service.ts`
- Modify: `sinaloka-backend/src/modules/payment/payment.controller.ts`

- [ ] **Step 1: Add BatchRecordPaymentSchema to DTO**

In `payment.dto.ts`, add after the existing schemas:

```typescript
export const BatchRecordPaymentSchema = z.object({
  payment_ids: z.array(z.string().uuid()).min(1).max(50),
  paid_date: z.coerce.date(),
  method: PaymentMethod,
});
export type BatchRecordPaymentDto = z.infer<typeof BatchRecordPaymentSchema>;
```

- [ ] **Step 2: Add batchRecord method to service**

In `payment.service.ts`, add this method to `PaymentService`:

```typescript
  async batchRecord(institutionId: string, dto: BatchRecordPaymentDto) {
    // Verify all payments belong to this institution
    const count = await this.prisma.payment.count({
      where: {
        id: { in: dto.payment_ids },
        institution_id: institutionId,
        status: { in: ['PENDING', 'OVERDUE'] },
      },
    });

    if (count !== dto.payment_ids.length) {
      throw new NotFoundException(
        `Some payment IDs are invalid or already paid. Found ${count} of ${dto.payment_ids.length}`,
      );
    }

    const result = await this.prisma.payment.updateMany({
      where: {
        id: { in: dto.payment_ids },
        institution_id: institutionId,
      },
      data: {
        status: 'PAID',
        paid_date: dto.paid_date,
        method: dto.method,
      },
    });

    return { updated: result.count };
  }
```

Add import for `BatchRecordPaymentDto`:

```typescript
import type {
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentQueryDto,
  BatchRecordPaymentDto,
} from './payment.dto.js';
```

- [ ] **Step 3: Add batch-record endpoint to controller**

In `payment.controller.ts`, add import for `BatchRecordPaymentSchema` and `BatchRecordPaymentDto`, then add this endpoint BEFORE `@Get('overdue-summary')`:

```typescript
  @Post('batch-record')
  batchRecord(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(BatchRecordPaymentSchema)) dto: BatchRecordPaymentDto,
  ) {
    return this.paymentService.batchRecord(user.institutionId!, dto);
  }
```

- [ ] **Step 4: Verify backend compiles**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/payment/payment.dto.ts sinaloka-backend/src/modules/payment/payment.service.ts sinaloka-backend/src/modules/payment/payment.controller.ts
git commit -m "feat(payment): add batch payment recording endpoint"
```

---

### Task 13: Backend — subscription billing mode

**Files:**
- Modify: `sinaloka-backend/src/modules/payment/invoice-generator.service.ts`
- Modify: `sinaloka-backend/src/modules/payment/payment.controller.ts`

- [ ] **Step 1: Add subscription generation method**

In `invoice-generator.service.ts`, add this interface and method:

```typescript
interface SubscriptionPaymentParams {
  institutionId: string;
}
```

Add to `InvoiceGeneratorService` class:

```typescript
  async generateSubscriptionPayments(
    params: SubscriptionPaymentParams,
  ): Promise<{ created: number }> {
    const billing = await this.settingsService.getBilling(params.institutionId);
    if (billing.billing_mode !== 'subscription') return { created: 0 };

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 1);

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        institution_id: params.institutionId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      include: { class: { select: { fee: true } } },
    });

    let created = 0;
    for (const enrollment of enrollments) {
      const notesPrefix = `Auto: Subscription ${monthKey}`;

      const existing = await this.prisma.payment.findFirst({
        where: {
          enrollment_id: enrollment.id,
          notes: { startsWith: notesPrefix },
        },
      });
      if (existing) continue;

      await this.prisma.payment.create({
        data: {
          institution_id: params.institutionId,
          student_id: enrollment.student_id,
          enrollment_id: enrollment.id,
          amount: enrollment.class.fee,
          due_date: dueDate,
          status: 'PENDING',
          notes: notesPrefix,
        },
      });
      created++;
    }

    this.logger.log(
      `Subscription payments: ${created} created for ${params.institutionId} (${monthKey})`,
    );
    return { created };
  }
```

- [ ] **Step 2: Add manual trigger endpoint**

In `payment.controller.ts`:

1. Add import: `import { InvoiceGeneratorService } from './invoice-generator.service.js';`
2. Add `private readonly invoiceGeneratorService: InvoiceGeneratorService` as a **third parameter** to the existing constructor (which already has `paymentService` and `invoiceService`)
3. Add this endpoint BEFORE `@Get('overdue-summary')`:

```typescript
@Post('generate-subscriptions')
generateSubscriptions(@CurrentUser() user: JwtPayload) {
  return this.invoiceGeneratorService.generateSubscriptionPayments({
    institutionId: user.institutionId!,
  });
}
```

- [ ] **Step 3: Verify backend compiles**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/payment/invoice-generator.service.ts sinaloka-backend/src/modules/payment/payment.controller.ts
git commit -m "feat(payment): add subscription billing mode with manual trigger"
```

---

### Task 14: Backend — payment reminder endpoint

**Files:**
- Modify: `sinaloka-backend/src/modules/payment/payment.service.ts`
- Modify: `sinaloka-backend/src/modules/payment/payment.controller.ts`

- [ ] **Step 1: Add remind method to service**

In `payment.service.ts`, add:

```typescript
  async remind(institutionId: string, paymentId: string) {
    const payment = await this.findOne(institutionId, paymentId);

    // Log the reminder intent — future integration point for WhatsApp/email
    return {
      reminded: true,
      method: 'logged',
      payment_id: payment.id,
      student_id: payment.student_id,
    };
  }
```

- [ ] **Step 2: Add remind endpoint to controller**

In `payment.controller.ts`, add this endpoint (after `generate-invoice`):

```typescript
  @Post(':id/remind')
  remind(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentService.remind(user.institutionId!, id);
  }
```

- [ ] **Step 3: Verify backend compiles**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/payment/payment.service.ts sinaloka-backend/src/modules/payment/payment.controller.ts
git commit -m "feat(payment): add payment reminder endpoint (logging only)"
```

---

### Task 15: Frontend — payment service updates and StudentPayments wiring

**Files:**
- Modify: `sinaloka-platform/src/services/payments.service.ts`
- Modify: `sinaloka-platform/src/pages/Finance/StudentPayments.tsx`

- [ ] **Step 1: Add service functions**

In `sinaloka-platform/src/services/payments.service.ts`, add:

```typescript
  batchRecord: (data: { payment_ids: string[]; paid_date: string; method: 'CASH' | 'TRANSFER' | 'OTHER' }) =>
    api.post<{ updated: number }>('/api/admin/payments/batch-record', data).then((r) => r.data),
  remind: (id: string) =>
    api.post<{ reminded: boolean }>(`/api/admin/payments/${id}/remind`).then((r) => r.data),
```

- [ ] **Step 2: Read and modify StudentPayments.tsx**

Read the full `StudentPayments.tsx` file first. Then make these changes:

1. **Batch payment** — Find the batch button (line ~138-141). Replace the "Coming Soon" toast with a modal that:
   - Shows count of selected payments
   - Has payment method selector (CASH/TRANSFER/OTHER)
   - Has paid date picker
   - On confirm calls `paymentsService.batchRecord()`
   - On success: invalidate queries, clear selection, show success toast

2. **Reminders** — Find reminder buttons (line ~265-270 and ~507-514). Replace the toast stubs with:
   ```typescript
   const handleRemind = async (paymentId: string) => {
     try {
       await paymentsService.remind(paymentId);
       toast.success(t('payments.reminderSent'));
     } catch {
       toast.error(t('payments.reminderFailed'));
     }
   };
   ```

- [ ] **Step 3: Verify frontend compiles**

Run: `cd sinaloka-platform && npx tsc --noEmit`
Expected: No errors (or only pre-existing errors)

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/services/payments.service.ts sinaloka-platform/src/pages/Finance/StudentPayments.tsx
git commit -m "feat(payment): wire batch recording and reminders in frontend"
```

---

## Chunk 5: Layer 3 — Standalone Enhancements

### Task 16: Frontend — custom date range picker in FinanceOverview

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/FinanceOverview.tsx`

- [ ] **Step 1: Read FinanceOverview.tsx**

Read the full file to understand the period selector and state management.

- [ ] **Step 2: Add "Custom" option to period selector**

Find the period selector buttons (Month/Quarter/YTD). Add a fourth button "Custom". When selected, show two date inputs:

```typescript
const [period, setPeriod] = useState<'month' | 'quarter' | 'year' | 'custom'>('month');
const [customStart, setCustomStart] = useState('');
const [customEnd, setCustomEnd] = useState('');
```

In the period change handler, add:
```typescript
case 'custom':
  if (customStart && customEnd) {
    setPeriodStart(new Date(customStart));
    setPeriodEnd(new Date(customEnd));
  }
  break;
```

Add conditional date inputs:
```tsx
{period === 'custom' && (
  <div className="flex gap-2">
    <input type="date" value={customStart} onChange={(e) => {
      setCustomStart(e.target.value);
      if (e.target.value && customEnd) {
        setPeriodStart(new Date(e.target.value));
      }
    }} className="..." />
    <input type="date" value={customEnd} onChange={(e) => {
      setCustomEnd(e.target.value);
      if (customStart && e.target.value) {
        setPeriodEnd(new Date(e.target.value));
      }
    }} className="..." />
  </div>
)}
```

- [ ] **Step 3: Verify frontend compiles**

Run: `cd sinaloka-platform && npx tsc --noEmit`
Expected: No errors (or only pre-existing errors)

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/Finance/FinanceOverview.tsx
git commit -m "feat(finance): add custom date range picker to finance overview"
```

---

### Task 17: Backend — PDF report localization

**Files:**
- Modify: `sinaloka-backend/src/modules/report/report.service.ts`

- [ ] **Step 1: Add bilingual LABELS to report service**

At the top of `report.service.ts` (after imports), add:

```typescript
const REPORT_LABELS = {
  id: {
    attendanceReport: 'Laporan Kehadiran',
    financeReport: 'Laporan Keuangan',
    studentProgressReport: 'Laporan Perkembangan Siswa',
    period: 'Periode',
    date: 'Tanggal',
    student: 'Siswa',
    class: 'Kelas',
    status: 'Status',
    totalIncome: 'Total Pendapatan (Lunas)',
    totalPayouts: 'Total Pembayaran Tutor',
    totalExpenses: 'Total Pengeluaran',
    netProfit: 'Laba Bersih',
    transactions: 'transaksi',
    attendanceRate: 'Tingkat Kehadiran',
    homeworkRate: 'Tingkat Penyelesaian PR',
    totalSessions: 'Total Sesi',
    sessionNotes: 'Catatan Sesi',
    homework: 'PR',
    done: 'Selesai',
    notDone: 'Belum',
    topic: 'Topik',
    notes: 'Catatan',
  },
  en: {
    attendanceReport: 'Attendance Report',
    financeReport: 'Finance Report',
    studentProgressReport: 'Student Progress Report',
    period: 'Period',
    date: 'Date',
    student: 'Student',
    class: 'Class',
    status: 'Status',
    totalIncome: 'Total Income (Paid Payments)',
    totalPayouts: 'Total Payouts',
    totalExpenses: 'Total Expenses',
    netProfit: 'Net Profit',
    transactions: 'transactions',
    attendanceRate: 'Attendance Rate',
    homeworkRate: 'Homework Completion Rate',
    totalSessions: 'Total Sessions',
    sessionNotes: 'Session Notes',
    homework: 'Homework',
    done: 'Done',
    notDone: 'Not done',
    topic: 'Topic',
    notes: 'Notes',
  },
};
```

- [ ] **Step 2: Add helper to fetch institution language**

Add a private method to `ReportService`:

```typescript
  private async getLabels(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { default_language: true },
    });
    const lang = (institution?.default_language === 'en' ? 'en' : 'id') as keyof typeof REPORT_LABELS;
    return REPORT_LABELS[lang];
  }
```

- [ ] **Step 3: Update generateAttendanceReport to use labels**

In `generateAttendanceReport()`, fetch labels and replace hardcoded strings:

```typescript
  async generateAttendanceReport(...) {
    const l = await this.getLabels(institutionId);
    // ... existing query code ...

    doc.fontSize(18).text(l.attendanceReport, { align: 'center' });
    // ... replace 'Period:' with l.period
    doc.fontSize(10).text(
      `${l.period}: ${filters.date_from.toISOString().slice(0, 10)} to ${filters.date_to.toISOString().slice(0, 10)}`,
    );
    // ... replace table headers
    doc.text(l.date, cols[0], y);
    doc.text(l.student, cols[1], y);
    doc.text(l.class, cols[2], y);
    doc.text(l.status, cols[3], y);
    // ... rest unchanged
  }
```

- [ ] **Step 4: Update generateFinanceReport to use labels**

Similarly replace hardcoded strings with `l.financeReport`, `l.totalIncome`, `l.totalPayouts`, `l.totalExpenses`, `l.netProfit`, `l.transactions`.

- [ ] **Step 5: Update generateStudentProgressReport to use labels**

Replace hardcoded strings with `l.studentProgressReport`, `l.student`, `l.attendanceRate`, `l.homeworkRate`, `l.totalSessions`, `l.sessionNotes`, `l.homework`, `l.done`, `l.notDone`, `l.topic`, `l.notes`.

- [ ] **Step 6: Verify backend compiles**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add sinaloka-backend/src/modules/report/report.service.ts
git commit -m "feat(report): add bilingual labels to PDF report generation"
```

---

## Execution Notes

### Parallelization

Tasks 1-2 (Layer 1) must complete first. Then:
- **Stream A** (Tasks 3-7): Expense module — can run in parallel
- **Stream B** (Tasks 8-11): Payout module — can run in parallel
- **Stream C** (Tasks 12-15): Payment module — can run in parallel

Tasks 16-17 (Layer 3) can run after all streams complete, or in parallel with Layer 2 since they touch different files (FinanceOverview.tsx, report.service.ts).

### Testing

After each stream completes:
1. Run `cd sinaloka-backend && npx tsc --noEmit` to verify no type errors
2. Run `cd sinaloka-platform && npx tsc --noEmit` to verify frontend compiles
3. Manually test endpoints with the dev server if available

### Key Dependencies

- Layer 1 upload endpoint is required by Stream A (receipt upload) and Stream B (proof upload)
- Layer 1 schema migration is required by Stream A (recurring fields) and Stream B (slip_url)
- `csv-stringify/sync` is already installed in the backend (used by `report.service.ts`)
- `pdfkit` is already installed (used by `invoice.service.ts`)
- `@nestjs/schedule` and `ScheduleModule.forRoot()` are already configured in `app.module.ts`
