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

export function formatCurrencyShort(amount: number, lang: string = 'id'): string {
  const prefix = lang === 'id' ? 'Rp' : 'IDR';
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  if (amount >= 1_000_000_000) return `${prefix} ${(amount / 1_000_000_000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}B`;
  if (amount >= 1_000_000) return `${prefix} ${(amount / 1_000_000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (amount >= 1_000) return `${prefix} ${(amount / 1_000).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K`;
  return formatCurrency(amount, lang);
}
