import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import api from './api';

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
 * Download a file from an authenticated API endpoint.
 * Fetches the file as a blob via the API client (with JWT) and triggers a browser download.
 */
export async function downloadFile(path: string, filename: string) {
  const response = await api.get(`/api/uploads/${path}`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatCurrencyShort(amount: number, lang: string = 'id'): string {
  const prefix = lang === 'id' ? 'Rp' : 'IDR';
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  if (amount >= 1_000_000_000) return `${prefix} ${(amount / 1_000_000_000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}B`;
  if (amount >= 1_000_000) return `${prefix} ${(amount / 1_000_000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (amount >= 1_000) return `${prefix} ${(amount / 1_000).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K`;
  return formatCurrency(amount, lang);
}
