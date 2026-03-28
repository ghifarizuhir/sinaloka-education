import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined, lang: string = 'id'): string {
  if (!dateStr) return '—';
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  return new Date(dateStr).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number, lang: string = 'id'): string {
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Build a public URL for an uploaded file.
 * File serve endpoint is public — no auth required.
 */
export function getFileUrl(path: string): string {
  const base = import.meta.env.VITE_API_URL ?? '';
  return `${base}/api/uploads/${path}`;
}

/**
 * Open a file URL in a new tab (for PDFs, images, etc).
 */
export function openFile(path: string) {
  window.open(getFileUrl(path), '_blank');
}

export function getSubjectColor(name?: string): string {
  if (!name) return '';
  const colors = [
    'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
    'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function formatCurrencyShort(amount: number, lang: string = 'id'): string {
  const prefix = lang === 'id' ? 'Rp' : 'IDR';
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  if (amount >= 1_000_000_000) return `${prefix} ${(amount / 1_000_000_000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}B`;
  if (amount >= 1_000_000) return `${prefix} ${(amount / 1_000_000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (amount >= 1_000) return `${prefix} ${(amount / 1_000).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K`;
  return formatCurrency(amount, lang);
}
