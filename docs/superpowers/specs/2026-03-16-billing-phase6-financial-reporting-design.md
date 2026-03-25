# Billing Phase 6: Financial Reporting — sinaloka

**Date:** 2026-03-16
**Status:** Draft
**Scope:** Comprehensive financial reports with revenue/expense breakdowns, trend charts, and CSV exports. Enhanced Finance Overview page.
**Roadmap:** See `docs/superpowers/specs/2026-03-16-billing-roadmap.md`
**Depends on:** Phase 1-5 (complete payment, payout, expense data in DB)

## Overview

Enhance the Finance Overview page with detailed financial reports. Admin selects a date range and sees: total revenue/payouts/expenses/net profit, revenue trend chart, revenue breakdown by class/method/status, expense breakdown by category with monthly trend. CSV export for all transaction types. All data from existing tables via Prisma aggregation queries — no schema changes.

## Backend — Report Endpoints

### New Endpoints

Added to the existing `ReportController`:

```
GET /api/reports/financial-summary?period_start=YYYY-MM-DD&period_end=YYYY-MM-DD
GET /api/reports/revenue-breakdown?period_start=YYYY-MM-DD&period_end=YYYY-MM-DD
GET /api/reports/expense-breakdown?period_start=YYYY-MM-DD&period_end=YYYY-MM-DD
GET /api/reports/export-csv?type=payments|payouts|expenses&period_start=YYYY-MM-DD&period_end=YYYY-MM-DD
```

**Access:** ADMIN + SUPER_ADMIN. Institution scoped via JWT.

### Query Validation (Zod)

```typescript
const ReportPeriodSchema = z.object({
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
});

const ExportCsvSchema = z.object({
  type: z.enum(['payments', 'payouts', 'expenses']),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
});
```

### GET /api/reports/financial-summary

**Response:**
```json
{
  "period_start": "2026-03-01",
  "period_end": "2026-03-31",
  "total_revenue": 15000000,
  "total_payouts": 8000000,
  "total_expenses": 3000000,
  "net_profit": 4000000,
  "payment_count": 45,
  "payout_count": 5,
  "expense_count": 12,
  "revenue_by_month": [
    { "month": "2026-01", "amount": 12000000 },
    { "month": "2026-02", "amount": 14000000 },
    { "month": "2026-03", "amount": 15000000 }
  ]
}
```

**Logic:**
```typescript
async getFinancialSummary(institutionId: string, periodStart: Date, periodEnd: Date) {
  const where = { institution_id: institutionId };
  const dateRange = { gte: periodStart, lte: periodEnd };

  const [revenue, payouts, expenses] = await Promise.all([
    this.prisma.payment.aggregate({
      where: { ...where, status: 'PAID', paid_date: dateRange },
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

  // Revenue by month: last 6 months of PAID payments
  const sixMonthsAgo = new Date(periodEnd);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const monthlyPayments = await this.prisma.payment.findMany({
    where: { ...where, status: 'PAID', paid_date: { gte: sixMonthsAgo, lte: periodEnd } },
    select: { paid_date: true, amount: true },
  });

  // Group by month
  const revenueByMonth = groupByMonth(monthlyPayments);

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
    revenue_by_month: revenueByMonth,
  };
}
```

### GET /api/reports/revenue-breakdown

**Response:**
```json
{
  "by_class": [
    { "class_id": "uuid", "class_name": "Matematika SMP", "amount": 5000000, "payment_count": 15 }
  ],
  "by_payment_method": [
    { "method": "TRANSFER", "amount": 10000000, "count": 30 },
    { "method": "CASH", "amount": 5000000, "count": 15 }
  ],
  "by_status": [
    { "status": "PAID", "amount": 15000000, "count": 45 },
    { "status": "PENDING", "amount": 3000000, "count": 8 },
    { "status": "OVERDUE", "amount": 1500000, "count": 3 }
  ]
}
```

**Logic:**
- `by_class`: Join Payment → Enrollment → Class, group by class, sum amount for PAID payments in period
- `by_payment_method`: Group PAID payments by `method`, sum amount
- `by_status`: Group all payments in period by `status`, sum amount

### GET /api/reports/expense-breakdown

**Response:**
```json
{
  "by_category": [
    { "category": "RENT", "amount": 2000000, "count": 1 },
    { "category": "UTILITIES", "amount": 500000, "count": 3 }
  ],
  "monthly_trend": [
    { "month": "2026-01", "amount": 2800000 },
    { "month": "2026-02", "amount": 3200000 },
    { "month": "2026-03", "amount": 3000000 }
  ]
}
```

**Logic:**
- `by_category`: Group expenses in period by `category`, sum amount
- `monthly_trend`: Last 6 months of expenses grouped by month

### GET /api/reports/export-csv

**Response:** CSV file download with Content-Disposition header.

**Logic per type:**
- `payments`: All payments in period — columns: date, student, class, amount, status, method, invoice_number, notes
- `payouts`: All payouts in period — columns: date, tutor, amount, status, period_start, period_end, description
- `expenses`: All expenses in period — columns: date, category, amount, description

Uses existing `csv-stringify` library (already installed for student export).

## Frontend — Enhanced FinanceOverview.tsx

### Period Selector

Wire existing period buttons (This Month, This Quarter, Year to Date, Custom) to compute actual `period_start` and `period_end` dates:

```typescript
const [periodStart, setPeriodStart] = useState(() => startOfMonth(new Date()));
const [periodEnd, setPeriodEnd] = useState(() => endOfMonth(new Date()));
const [activePeriod, setActivePeriod] = useState('month');

// This Month: startOfMonth(today) → endOfMonth(today)
// This Quarter: startOfQuarter(today) → endOfQuarter(today)
// Year to Date: Jan 1 → today
// Custom: date picker inputs
```

Uses `date-fns` (already installed) for date calculation.

### Summary Cards

Replace current dashboard-based stats with data from `useFinancialSummary()`:

| Card | Value | Subtext |
|------|-------|---------|
| Total Revenue | Rp 15.000.000 | 45 payments |
| Total Payouts | Rp 8.000.000 | 5 payouts |
| Total Expenses | Rp 3.000.000 | 12 records |
| Net Profit | Rp 4.000.000 | Revenue - Payouts - Expenses |

### Revenue Trend Chart

Using Recharts `BarChart` (already installed):
- X-axis: months (last 6)
- Y-axis: revenue amount
- Data from `financial_summary.revenue_by_month`

### Revenue Breakdown Section

New collapsible `<Card>` with 3 sub-sections from `useRevenueBreakdown()`:

**By Class (table):**
| Class | Revenue | Payments |
|-------|---------|----------|
| Matematika SMP | Rp 5.000.000 | 15 |
| Fisika SMA | Rp 4.000.000 | 12 |

**By Payment Method (horizontal bars or table):**
| Method | Amount | Count |
|--------|--------|-------|
| Transfer | Rp 10.000.000 | 30 |
| Cash | Rp 5.000.000 | 15 |

**By Status (badges with amounts):**
- PAID: Rp 15.000.000 (45)
- PENDING: Rp 3.000.000 (8)
- OVERDUE: Rp 1.500.000 (3)

### Expense Breakdown Section

New collapsible `<Card>` from `useExpenseBreakdown()`:

**By Category (table or donut chart):**
| Category | Amount | Records |
|----------|--------|---------|
| Rent | Rp 2.000.000 | 1 |
| Utilities | Rp 500.000 | 3 |

**Monthly Trend (bar chart):**
Small Recharts `BarChart` showing expense amount per month (last 6 months).

### Export Section

"Export CSV" dropdown button with 3 options:
- Export Payments → downloads CSV
- Export Payouts → downloads CSV
- Export Expenses → downloads CSV

Each calls `/api/reports/export-csv?type=X&period_start=Y&period_end=Z`, creates blob, triggers download with filename `{type}_export_{YYYY-MM-DD}.csv`.

### New Frontend Files

**`src/services/reports.service.ts`:**
```typescript
export const reportsService = {
  getFinancialSummary: (params) => api.get('/api/reports/financial-summary', { params }).then(r => r.data),
  getRevenueBreakdown: (params) => api.get('/api/reports/revenue-breakdown', { params }).then(r => r.data),
  getExpenseBreakdown: (params) => api.get('/api/reports/expense-breakdown', { params }).then(r => r.data),
  exportCsv: (params) => api.get('/api/reports/export-csv', { params, responseType: 'blob' }).then(r => r.data),
};
```

**`src/hooks/useReports.ts`:**
```typescript
export function useFinancialSummary(params) {
  return useQuery({ queryKey: ['reports', 'summary', params], queryFn: () => reportsService.getFinancialSummary(params) });
}
export function useRevenueBreakdown(params) {
  return useQuery({ queryKey: ['reports', 'revenue', params], queryFn: () => reportsService.getRevenueBreakdown(params) });
}
export function useExpenseBreakdown(params) {
  return useQuery({ queryKey: ['reports', 'expense', params], queryFn: () => reportsService.getExpenseBreakdown(params) });
}
export function useExportCsv() {
  return useMutation({ mutationFn: reportsService.exportCsv });
}
```

**`src/types/report.ts`:**
TypeScript interfaces for all response shapes.

### Translation Keys

Add to `finance` namespace:
```
"netProfitFormula": "Revenue - Payouts - Expenses"
"revenueBreakdown": "Revenue Breakdown"
"byClass": "By Class"
"byPaymentMethod": "By Payment Method"
"byStatus": "By Status"
"expenseBreakdown": "Expense Breakdown"
"byCategory": "By Category"
"monthlyTrend": "Monthly Trend"
"exportPayments": "Export Payments"
"exportPayouts": "Export Payouts"
"exportExpenses": "Export Expenses"
"exportSuccess": "Export downloaded"
"noDataForPeriod": "No data for this period"
```

## Constraints

- No schema changes — all queries on existing data
- No bank reconciliation — deferred
- CSV export only (no XLSX) — use existing `csv-stringify`
- Charts use Recharts (already installed)
- Period date calculations use date-fns (already installed)
- Revenue = sum of PAID payments (consistent with dashboard)
- Revenue by_class requires Payment → Enrollment → Class join
- Expense categories are free strings (from Phase 1 change)
