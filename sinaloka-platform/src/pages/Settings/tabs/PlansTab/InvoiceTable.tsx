import React from 'react';
import { cn } from '../../../../lib/utils';
import { useSubscriptionInvoices } from '../../../../hooks/useSubscription';
import type { SubscriptionInvoice } from '../../../../types/subscription';

type InvoiceStatus = SubscriptionInvoice['status'];

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  PAID: {
    label: 'Lunas',
    className: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  },
  SENT: {
    label: 'Terkirim',
    className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  },
  OVERDUE: {
    label: 'Jatuh Tempo',
    className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  },
  DRAFT: {
    label: 'Draft',
    className: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
  },
  CANCELLED: {
    label: 'Dibatalkan',
    className: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500',
  },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatPeriod(start: string, end: string): string {
  const startDate = new Date(start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const endDate = new Date(end).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startDate} – ${endDate}`;
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" style={{ width: i === 1 ? '60%' : i === 2 ? '80%' : i === 3 ? '50%' : '40%' }} />
        </td>
      ))}
    </tr>
  );
}

export function InvoiceTable() {
  const { data: invoices, isLoading } = useSubscriptionInvoices();

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-zinc-50 dark:bg-zinc-800/50">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              No. Invoice
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Periode
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Jumlah
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading && (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          )}
          {!isLoading && (!invoices || invoices.length === 0) && (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">
                Belum ada invoice
              </td>
            </tr>
          )}
          {!isLoading &&
            invoices &&
            invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  {invoice.invoice_number}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {formatPeriod(invoice.period_start, invoice.period_end)}
                </td>
                <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">
                  {formatCurrency(invoice.amount)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={invoice.status} />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
