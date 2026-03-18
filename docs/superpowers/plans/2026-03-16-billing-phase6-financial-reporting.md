# Billing Phase 6: Financial Reporting — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add comprehensive financial reports to the Finance Overview page — summary cards, revenue/expense breakdowns, trend charts, and CSV exports for all transaction types.

**Architecture:** Add 4 new endpoints to the existing ReportController (financial-summary, revenue-breakdown, expense-breakdown, export-csv) using Prisma aggregation queries. Extend frontend reports service/hooks/types. Rewrite FinanceOverview.tsx with wired period selector, API-driven summary cards, Recharts trend charts, breakdown tables, and CSV export buttons. No schema changes.

**Tech Stack:** NestJS, Prisma (aggregate/groupBy), csv-stringify, React, TanStack Query, Recharts, date-fns

**Spec:** `docs/superpowers/specs/2026-03-16-billing-phase6-financial-reporting-design.md`

---

## Chunk 1: Backend — Report DTO, Service Methods, Controller Endpoints

### Task 1: Add Report DTOs

**Files:**
- Modify: `sinaloka-backend/src/modules/report/report.dto.ts`

- [ ] **Step 1: Add new schemas**

Append to `sinaloka-backend/src/modules/report/report.dto.ts`:

```typescript
export const ReportPeriodSchema = z.object({
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
});
export type ReportPeriodDto = z.infer<typeof ReportPeriodSchema>;

export const ExportCsvSchema = z.object({
  type: z.enum(['payments', 'payouts', 'expenses']),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
});
export type ExportCsvDto = z.infer<typeof ExportCsvSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-backend/src/modules/report/report.dto.ts
git commit -m "feat(backend): add financial report DTOs"
```

---

### Task 2: Add Financial Report Methods to ReportService

**Files:**
- Modify: `sinaloka-backend/src/modules/report/report.service.ts`

- [ ] **Step 1: Add imports**

Add at top:
```typescript
import { stringify } from 'csv-stringify/sync';
```

- [ ] **Step 2: Add helper function for grouping by month**

Add as a private method in the class:

```typescript
private groupByMonth(records: { date: Date | null; amount: any }[], dateField: 'paid_date' | 'date' = 'date'): { month: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const r of records) {
    const d = (r as any)[dateField] ?? r.date;
    if (!d) continue;
    const key = `${new Date(d).getFullYear()}-${String(new Date(d).getMonth() + 1).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + Number(r.amount ?? 0));
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }));
}
```

- [ ] **Step 3: Add getFinancialSummary method**

```typescript
async getFinancialSummary(institutionId: string, periodStart: Date, periodEnd: Date) {
  const where = { institution_id: institutionId };
  const paidDateRange = { gte: periodStart, lte: periodEnd };
  const dateRange = { gte: periodStart, lte: periodEnd };

  const [revenue, payouts, expenses] = await Promise.all([
    this.prisma.payment.aggregate({
      where: { ...where, status: 'PAID', paid_date: paidDateRange },
      _sum: { amount: true },
      _count: true,
    }),
    this.prisma.payout.aggregate({
      where: { ...where, date: dateRange },
      _sum: { amount: true },
      _count: true,
    }),
    this.prisma.expense.aggregate({
      where: { ...where, date: dateRange },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  // Revenue by month: last 6 months
  const sixMonthsAgo = new Date(periodEnd);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const monthlyPayments = await this.prisma.payment.findMany({
    where: { ...where, status: 'PAID', paid_date: { gte: sixMonthsAgo, lte: periodEnd } },
    select: { paid_date: true, amount: true },
  });

  const totalRevenue = Number(revenue._sum.amount ?? 0);
  const totalPayouts = Number(payouts._sum.amount ?? 0);
  const totalExpenses = Number(expenses._sum.amount ?? 0);

  return {
    period_start: periodStart,
    period_end: periodEnd,
    total_revenue: totalRevenue,
    total_payouts: totalPayouts,
    total_expenses: totalExpenses,
    net_profit: totalRevenue - totalPayouts - totalExpenses,
    payment_count: revenue._count,
    payout_count: payouts._count,
    expense_count: expenses._count,
    revenue_by_month: this.groupByMonth(monthlyPayments.map(p => ({ date: p.paid_date, amount: p.amount })), 'date'),
  };
}
```

- [ ] **Step 4: Add getRevenueBreakdown method**

```typescript
async getRevenueBreakdown(institutionId: string, periodStart: Date, periodEnd: Date) {
  const where = { institution_id: institutionId };
  const paidDateRange = { gte: periodStart, lte: periodEnd };

  // By status (all payments in period)
  const byStatus = await this.prisma.payment.groupBy({
    by: ['status'],
    where: { ...where, due_date: { gte: periodStart, lte: periodEnd } },
    _sum: { amount: true },
    _count: { id: true },
  });

  // By payment method (PAID only)
  const byMethod = await this.prisma.payment.groupBy({
    by: ['method'],
    where: { ...where, status: 'PAID', paid_date: paidDateRange, method: { not: null } },
    _sum: { amount: true },
    _count: { id: true },
  });

  // By class (PAID, join via enrollment)
  const paidPayments = await this.prisma.payment.findMany({
    where: { ...where, status: 'PAID', paid_date: paidDateRange },
    select: { amount: true, enrollment: { select: { class: { select: { id: true, name: true } } } } },
  });

  const classMap = new Map<string, { class_id: string; class_name: string; amount: number; payment_count: number }>();
  for (const p of paidPayments) {
    const cls = p.enrollment?.class;
    if (!cls) continue;
    const existing = classMap.get(cls.id) ?? { class_id: cls.id, class_name: cls.name, amount: 0, payment_count: 0 };
    existing.amount += Number(p.amount);
    existing.payment_count += 1;
    classMap.set(cls.id, existing);
  }

  return {
    by_class: Array.from(classMap.values()).sort((a, b) => b.amount - a.amount),
    by_payment_method: byMethod.map(m => ({
      method: m.method ?? 'OTHER',
      amount: Number(m._sum.amount ?? 0),
      count: m._count.id,
    })),
    by_status: byStatus.map(s => ({
      status: s.status,
      amount: Number(s._sum.amount ?? 0),
      count: s._count.id,
    })),
  };
}
```

- [ ] **Step 5: Add getExpenseBreakdown method**

```typescript
async getExpenseBreakdown(institutionId: string, periodStart: Date, periodEnd: Date) {
  const where = { institution_id: institutionId };

  const byCategory = await this.prisma.expense.groupBy({
    by: ['category'],
    where: { ...where, date: { gte: periodStart, lte: periodEnd } },
    _sum: { amount: true },
    _count: { id: true },
  });

  // Monthly trend: last 6 months
  const sixMonthsAgo = new Date(periodEnd);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const monthlyExpenses = await this.prisma.expense.findMany({
    where: { ...where, date: { gte: sixMonthsAgo, lte: periodEnd } },
    select: { date: true, amount: true },
  });

  return {
    by_category: byCategory
      .map(c => ({ category: c.category, amount: Number(c._sum.amount ?? 0), count: c._count.id }))
      .sort((a, b) => b.amount - a.amount),
    monthly_trend: this.groupByMonth(monthlyExpenses.map(e => ({ date: e.date, amount: e.amount })), 'date'),
  };
}
```

- [ ] **Step 6: Add exportCsv method**

```typescript
async exportCsv(institutionId: string, type: string, periodStart: Date, periodEnd: Date): Promise<string> {
  const where = { institution_id: institutionId };
  const dateRange = { gte: periodStart, lte: periodEnd };

  if (type === 'payments') {
    const data = await this.prisma.payment.findMany({
      where: { ...where, due_date: dateRange },
      include: { student: { select: { name: true } }, enrollment: { include: { class: { select: { name: true } } } } },
      orderBy: { due_date: 'desc' },
    });
    return stringify(data.map(p => ({
      date: p.due_date?.toISOString().split('T')[0] ?? '',
      student: p.student?.name ?? '',
      class: p.enrollment?.class?.name ?? '',
      amount: Number(p.amount),
      status: p.status,
      method: p.method ?? '',
      invoice_number: p.invoice_number ?? '',
      notes: p.notes ?? '',
    })), { header: true });
  }

  if (type === 'payouts') {
    const data = await this.prisma.payout.findMany({
      where: { ...where, date: dateRange },
      include: { tutor: { include: { user: { select: { name: true } } } } },
      orderBy: { date: 'desc' },
    });
    return stringify(data.map(p => ({
      date: p.date?.toISOString().split('T')[0] ?? '',
      tutor: p.tutor?.user?.name ?? '',
      amount: Number(p.amount),
      status: p.status,
      period_start: p.period_start?.toISOString().split('T')[0] ?? '',
      period_end: p.period_end?.toISOString().split('T')[0] ?? '',
      description: p.description ?? '',
    })), { header: true });
  }

  // expenses
  const data = await this.prisma.expense.findMany({
    where: { ...where, date: dateRange },
    orderBy: { date: 'desc' },
  });
  return stringify(data.map(e => ({
    date: e.date?.toISOString().split('T')[0] ?? '',
    category: e.category,
    amount: Number(e.amount),
    description: e.description ?? '',
  })), { header: true });
}
```

- [ ] **Step 7: Verify**

```bash
cd sinaloka-backend && npx tsc --noEmit 2>&1 | grep -v "\.spec\." | grep report || echo "No errors"
```

- [ ] **Step 8: Commit**

```bash
git add sinaloka-backend/src/modules/report/report.service.ts
git commit -m "feat(backend): add financial summary, revenue/expense breakdown, and CSV export methods"
```

---

### Task 3: Add Report Endpoints to Controller

**Files:**
- Modify: `sinaloka-backend/src/modules/report/report.controller.ts`

- [ ] **Step 1: Add imports and new endpoints**

Add imports for new DTOs:
```typescript
import {
  AttendanceReportQuerySchema, FinanceReportQuerySchema, StudentProgressQuerySchema,
  ReportPeriodSchema, ExportCsvSchema,
} from './report.dto.js';
import type {
  AttendanceReportQueryDto, FinanceReportQueryDto, StudentProgressQueryDto,
  ReportPeriodDto, ExportCsvDto,
} from './report.dto.js';
```

Add 4 new endpoints after the existing ones:

```typescript
@Get('financial-summary')
async financialSummary(
  @CurrentUser() user: JwtPayload,
  @Query(new ZodValidationPipe(ReportPeriodSchema)) q: ReportPeriodDto,
) {
  return this.reportService.getFinancialSummary(user.institutionId!, q.period_start, q.period_end);
}

@Get('revenue-breakdown')
async revenueBreakdown(
  @CurrentUser() user: JwtPayload,
  @Query(new ZodValidationPipe(ReportPeriodSchema)) q: ReportPeriodDto,
) {
  return this.reportService.getRevenueBreakdown(user.institutionId!, q.period_start, q.period_end);
}

@Get('expense-breakdown')
async expenseBreakdown(
  @CurrentUser() user: JwtPayload,
  @Query(new ZodValidationPipe(ReportPeriodSchema)) q: ReportPeriodDto,
) {
  return this.reportService.getExpenseBreakdown(user.institutionId!, q.period_start, q.period_end);
}

@Get('export-csv')
async exportCsv(
  @CurrentUser() user: JwtPayload,
  @Query(new ZodValidationPipe(ExportCsvSchema)) q: ExportCsvDto,
  @Res() res: Response,
) {
  const csv = await this.reportService.exportCsv(user.institutionId!, q.type, q.period_start, q.period_end);
  res.set({
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="${q.type}_export_${new Date().toISOString().split('T')[0]}.csv"`,
  });
  res.send(csv);
}
```

- [ ] **Step 2: Verify and test**

```bash
cd sinaloka-backend && npx tsc --noEmit 2>&1 | grep -v "\.spec\." | grep report || echo "No errors"
```

Test:
```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@cerdas.id","password":"password"}' | jq -r '.access_token')
curl -s "http://localhost:5000/api/admin/reports/financial-summary?period_start=2026-01-01&period_end=2026-03-31" -H "Authorization: Bearer $TOKEN" | jq .
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/report/report.controller.ts
git commit -m "feat(backend): add financial-summary, revenue/expense-breakdown, export-csv endpoints"
```

---

## Chunk 2: Frontend — Types, Service, Hooks, Translation Keys

### Task 4: Add Frontend Types

**Files:**
- Modify: `sinaloka-platform/src/types/report.ts`

- [ ] **Step 1: Add financial report types**

Append to `sinaloka-platform/src/types/report.ts`:

```typescript
export interface ReportPeriodParams {
  period_start: string;
  period_end: string;
}

export interface FinancialSummary {
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_payouts: number;
  total_expenses: number;
  net_profit: number;
  payment_count: number;
  payout_count: number;
  expense_count: number;
  revenue_by_month: { month: string; amount: number }[];
}

export interface RevenueBreakdown {
  by_class: { class_id: string; class_name: string; amount: number; payment_count: number }[];
  by_payment_method: { method: string; amount: number; count: number }[];
  by_status: { status: string; amount: number; count: number }[];
}

export interface ExpenseBreakdown {
  by_category: { category: string; amount: number; count: number }[];
  monthly_trend: { month: string; amount: number }[];
}

export interface ExportCsvParams {
  type: 'payments' | 'payouts' | 'expenses';
  period_start: string;
  period_end: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-platform/src/types/report.ts
git commit -m "feat(platform): add financial report types"
```

---

### Task 5: Extend Reports Service and Hooks

**Files:**
- Modify: `sinaloka-platform/src/services/reports.service.ts`
- Modify: `sinaloka-platform/src/hooks/useReports.ts`

- [ ] **Step 1: Add service methods**

Append to imports in `reports.service.ts`:
```typescript
import type { AttendanceReportParams, FinanceReportParams, StudentProgressReportParams, ReportPeriodParams, FinancialSummary, RevenueBreakdown, ExpenseBreakdown, ExportCsvParams } from '@/src/types/report';
```

Append to `reportsService`:
```typescript
  getFinancialSummary: (params: ReportPeriodParams) =>
    api.get<FinancialSummary>('/api/admin/reports/financial-summary', { params }).then((r) => r.data),
  getRevenueBreakdown: (params: ReportPeriodParams) =>
    api.get<RevenueBreakdown>('/api/admin/reports/revenue-breakdown', { params }).then((r) => r.data),
  getExpenseBreakdown: (params: ReportPeriodParams) =>
    api.get<ExpenseBreakdown>('/api/admin/reports/expense-breakdown', { params }).then((r) => r.data),
  exportCsv: (params: ExportCsvParams) =>
    api.get('/api/admin/reports/export-csv', { params, responseType: 'blob' }).then((r) => r.data as Blob),
```

- [ ] **Step 2: Add hooks**

Append to imports in `useReports.ts`:
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
```

Append hooks:
```typescript
export function useFinancialSummary(params: { period_start: string; period_end: string }) {
  return useQuery({
    queryKey: ['reports', 'financial-summary', params],
    queryFn: () => reportsService.getFinancialSummary(params),
  });
}

export function useRevenueBreakdown(params: { period_start: string; period_end: string }) {
  return useQuery({
    queryKey: ['reports', 'revenue-breakdown', params],
    queryFn: () => reportsService.getRevenueBreakdown(params),
  });
}

export function useExpenseBreakdown(params: { period_start: string; period_end: string }) {
  return useQuery({
    queryKey: ['reports', 'expense-breakdown', params],
    queryFn: () => reportsService.getExpenseBreakdown(params),
  });
}

export function useExportCsv() {
  return useMutation({
    mutationFn: reportsService.exportCsv,
  });
}
```

- [ ] **Step 3: Verify**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/services/reports.service.ts sinaloka-platform/src/hooks/useReports.ts sinaloka-platform/src/types/report.ts
git commit -m "feat(platform): add financial report service methods, hooks, and types"
```

---

### Task 6: Add Translation Keys

**Files:**
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add to finance namespace in id.json**

Find the end of the `finance` object and add:

```json
"revenueBreakdown": "Rincian Pendapatan",
"byClass": "Per Kelas",
"byPaymentMethod": "Per Metode Pembayaran",
"byStatus": "Per Status",
"expenseBreakdown": "Rincian Pengeluaran",
"byCategory": "Per Kategori",
"monthlyTrend": "Tren Bulanan",
"exportPayments": "Ekspor Pembayaran",
"exportPayouts": "Ekspor Pembayaran Tutor",
"exportExpenses": "Ekspor Pengeluaran",
"exportSuccess": "Ekspor berhasil diunduh",
"noDataForPeriod": "Tidak ada data untuk periode ini",
"paymentCountLabel": "{{count}} pembayaran",
"payoutCountLabel": "{{count}} pembayaran tutor",
"expenseCountLabel": "{{count}} catatan",
"class": "Kelas",
"revenue": "Pendapatan",
"payments": "Pembayaran",
"method": "Metode",
"count": "Jumlah",
"category": "Kategori",
"records": "Catatan",
"exportCsv": "Ekspor CSV"
```

- [ ] **Step 2: Add equivalent to en.json**

```json
"revenueBreakdown": "Revenue Breakdown",
"byClass": "By Class",
"byPaymentMethod": "By Payment Method",
"byStatus": "By Status",
"expenseBreakdown": "Expense Breakdown",
"byCategory": "By Category",
"monthlyTrend": "Monthly Trend",
"exportPayments": "Export Payments",
"exportPayouts": "Export Payouts",
"exportExpenses": "Export Expenses",
"exportSuccess": "Export downloaded",
"noDataForPeriod": "No data for this period",
"paymentCountLabel": "{{count}} payments",
"payoutCountLabel": "{{count}} payouts",
"expenseCountLabel": "{{count}} records",
"class": "Class",
"revenue": "Revenue",
"payments": "Payments",
"method": "Method",
"count": "Count",
"category": "Category",
"records": "Records",
"exportCsv": "Export CSV"
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/locales/
git commit -m "feat(platform): add financial reporting translation keys"
```

---

## Chunk 3: Frontend — Rewrite FinanceOverview.tsx

### Task 7: Enhance FinanceOverview.tsx

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/FinanceOverview.tsx`

- [ ] **Step 1: Read the current file**

Read to understand the existing layout, period buttons, and stats cards.

- [ ] **Step 2: Add imports**

Add:
```typescript
import { useFinancialSummary, useRevenueBreakdown, useExpenseBreakdown, useExportCsv } from '@/src/hooks/useReports';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, format } from 'date-fns';
import { formatCurrency } from '../../lib/utils';
import { Download, ChevronDown } from 'lucide-react';
```

- [ ] **Step 3: Add period state and hooks**

Inside the component:
```typescript
const [periodStart, setPeriodStart] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
const [periodEnd, setPeriodEnd] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
const [activePeriod, setActivePeriod] = useState('month');
const [showExportMenu, setShowExportMenu] = useState(false);

const periodParams = { period_start: periodStart, period_end: periodEnd };
const { data: summary, isLoading: isLoadingSummary } = useFinancialSummary(periodParams);
const { data: revenueBreakdown } = useRevenueBreakdown(periodParams);
const { data: expenseBreakdown } = useExpenseBreakdown(periodParams);
const exportCsv = useExportCsv();

const handlePeriodChange = (period: string) => {
  setActivePeriod(period);
  const now = new Date();
  if (period === 'month') {
    setPeriodStart(format(startOfMonth(now), 'yyyy-MM-dd'));
    setPeriodEnd(format(endOfMonth(now), 'yyyy-MM-dd'));
  } else if (period === 'quarter') {
    setPeriodStart(format(startOfQuarter(now), 'yyyy-MM-dd'));
    setPeriodEnd(format(endOfQuarter(now), 'yyyy-MM-dd'));
  } else if (period === 'year') {
    setPeriodStart(format(startOfYear(now), 'yyyy-MM-dd'));
    setPeriodEnd(format(now, 'yyyy-MM-dd'));
  }
};

const handleExport = (type: 'payments' | 'payouts' | 'expenses') => {
  exportCsv.mutate({ type, period_start: periodStart, period_end: periodEnd }, {
    onSuccess: (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(t('finance.exportSuccess'));
    },
  });
  setShowExportMenu(false);
};
```

- [ ] **Step 4: Wire period buttons**

Replace existing period buttons (This Month, This Quarter, Year to Date, Custom) with:
```tsx
<div className="flex items-center gap-2">
  {[
    { id: 'month', label: t('finance.thisMonth') },
    { id: 'quarter', label: t('finance.thisQuarter') },
    { id: 'year', label: t('finance.yearToDate') },
  ].map(p => (
    <button
      key={p.id}
      onClick={() => handlePeriodChange(p.id)}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
        activePeriod === p.id ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
      )}
    >
      {p.label}
    </button>
  ))}
</div>
```

- [ ] **Step 5: Replace summary cards with API data**

Replace existing stats cards with 4 cards from `summary`:
- Total Revenue (with payment_count subtext)
- Total Payouts (with payout_count)
- Total Expenses (with expense_count)
- Net Profit (with formula label)

Show `<Skeleton>` when `isLoadingSummary`.

- [ ] **Step 6: Add revenue trend chart**

After summary cards:
```tsx
{summary?.revenue_by_month && summary.revenue_by_month.length > 0 && (
  <Card className="p-6">
    <h3 className="text-sm font-bold mb-4">{t('finance.revenueSummary')}</h3>
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={summary.revenue_by_month}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrencyShort(v, i18n.language)} />
        <Tooltip formatter={(v: number) => formatCurrency(v, i18n.language)} />
        <Bar dataKey="amount" fill="#18181b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </Card>
)}
```

- [ ] **Step 7: Add revenue breakdown section**

New Card with 3 tables from `revenueBreakdown`:

**By Class:**
```tsx
{revenueBreakdown?.by_class && (
  <Card className="p-6">
    <h3 className="text-sm font-bold mb-4">{t('finance.revenueBreakdown')} — {t('finance.byClass')}</h3>
    <table>...</table>  {/* class_name, amount, payment_count */}
  </Card>
)}
```

**By Payment Method + By Status** in a 2-column grid.

- [ ] **Step 8: Add expense breakdown section**

New Card with category table + monthly trend chart from `expenseBreakdown`.

- [ ] **Step 9: Add export CSV dropdown**

In the header area, add an Export dropdown button:
```tsx
<div className="relative">
  <Button variant="outline" onClick={() => setShowExportMenu(!showExportMenu)}>
    <Download size={16} />
    {t('finance.exportCsv')}
    <ChevronDown size={14} />
  </Button>
  {showExportMenu && (
    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border rounded-xl shadow-xl z-20 p-1">
      <button onClick={() => handleExport('payments')} className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg">
        {t('finance.exportPayments')}
      </button>
      <button onClick={() => handleExport('payouts')} className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg">
        {t('finance.exportPayouts')}
      </button>
      <button onClick={() => handleExport('expenses')} className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg">
        {t('finance.exportExpenses')}
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 10: Verify build**

```bash
cd sinaloka-platform && npx tsc --noEmit && npm run build
```

- [ ] **Step 11: Commit**

```bash
git add sinaloka-platform/src/pages/Finance/FinanceOverview.tsx
git commit -m "feat(platform): enhance Finance Overview with reports, charts, breakdowns, and CSV export"
```

---

## Chunk 4: Final Verification

### Task 8: Full Build + Smoke Test

- [ ] **Step 1: Backend type check**

```bash
cd sinaloka-backend && npx tsc --noEmit 2>&1 | grep -v "\.spec\." | grep report || echo "No errors"
```

- [ ] **Step 2: Frontend build**

```bash
cd sinaloka-platform && npx tsc --noEmit && npm run build
```

- [ ] **Step 3: Smoke test — Financial Summary**

1. Login, go to Finance Overview
2. Click "This Month" → summary cards show revenue/payouts/expenses/net profit
3. Click "This Quarter" → numbers update for the quarter
4. Revenue trend chart shows bars for last 6 months

- [ ] **Step 4: Smoke test — Breakdowns**

1. Revenue Breakdown by Class table shows class names with amounts
2. Revenue by Payment Method shows Transfer/Cash breakdown
3. Revenue by Status shows PAID/PENDING/OVERDUE counts
4. Expense Breakdown by Category shows category amounts
5. Expense Monthly Trend chart shows bars

- [ ] **Step 5: Smoke test — CSV Export**

1. Click "Export CSV" dropdown
2. Click "Export Payments" → CSV downloads with correct columns and data
3. Click "Export Payouts" → CSV downloads
4. Click "Export Expenses" → CSV downloads
5. Open each CSV in a spreadsheet — data matches the UI

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete Billing Phase 6 — financial reporting with breakdowns, charts, and CSV exports"
```
