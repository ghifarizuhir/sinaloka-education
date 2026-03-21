import React from 'react';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { Button } from '../../../../components/UI';
import type { SubscriptionStatus } from '../../../../types/subscription';

interface SubscriptionStatusCardProps {
  data: SubscriptionStatus;
  onRenew: () => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function SubscriptionStatusCard({ data, onRenew }: SubscriptionStatusCardProps) {
  const { plan_type, subscription } = data;

  // STARTER — no subscription
  if (plan_type === 'STARTER' || !subscription) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0">
            <Calendar size={18} className="text-zinc-500 dark:text-zinc-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Free Plan</span>
              <span className="inline-flex items-center rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                STARTER
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Maks. {data.plan_config.maxStudents ?? '∞'} siswa · Maks. {data.plan_config.maxTutors ?? '∞'} tutor
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { status, expires_at, grace_ends_at, days_remaining } = subscription;

  if (status === 'ACTIVE') {
    const showRenew = days_remaining <= 7;
    return (
      <div
        className={cn(
          'rounded-xl border p-5 flex items-center justify-between gap-4',
          showRenew
            ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
            : 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20',
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
              showRenew
                ? 'bg-amber-200 dark:bg-amber-800'
                : 'bg-emerald-200 dark:bg-emerald-800',
            )}
          >
            <Calendar
              size={18}
              className={showRenew ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-300'}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {plan_type === 'GROWTH' ? 'Growth Plan' : 'Business Plan'}
              </span>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  showRenew
                    ? 'bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300'
                    : 'bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300',
                )}
              >
                AKTIF
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Berlaku hingga {formatDate(expires_at)} ·{' '}
              <span className={showRenew ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                {days_remaining} hari lagi
              </span>
            </p>
          </div>
        </div>
        {showRenew && (
          <Button size="sm" onClick={onRenew} className="shrink-0">
            Perpanjang
          </Button>
        )}
      </div>
    );
  }

  if (status === 'GRACE_PERIOD') {
    const graceEndDisplay = grace_ends_at ? formatDate(grace_ends_at) : '—';
    return (
      <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {plan_type === 'GROWTH' ? 'Growth Plan' : 'Business Plan'}
              </span>
              <span className="inline-flex items-center rounded-full bg-amber-200 dark:bg-amber-800 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                GRACE PERIOD
              </span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Langganan habis. Layanan premium aktif sampai {graceEndDisplay} sebelum downgrade.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={onRenew} className="shrink-0">
          Perpanjang
        </Button>
      </div>
    );
  }

  if (status === 'EXPIRED' || status === 'CANCELLED') {
    return (
      <div className="rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-red-200 dark:bg-red-800 flex items-center justify-center shrink-0">
            <Clock size={18} className="text-red-600 dark:text-red-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {plan_type === 'GROWTH' ? 'Growth Plan' : 'Business Plan'}
              </span>
              <span className="inline-flex items-center rounded-full bg-red-200 dark:bg-red-800 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
                {status === 'EXPIRED' ? 'EXPIRED' : 'DIBATALKAN'}
              </span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              Langganan tidak aktif. Upgrade kembali untuk menggunakan fitur premium.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={onRenew} className="shrink-0 bg-red-600 hover:bg-red-700 text-white">
          Upgrade Kembali
        </Button>
      </div>
    );
  }

  return null;
}
