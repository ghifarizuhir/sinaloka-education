import React from 'react';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Gagal memuat data. Periksa koneksi internet Anda dan coba lagi.',
  onRetry,
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-warning/20 bg-warning-muted/40 p-6 text-center"
    >
      {/* Inline SVG: cloud with exclamation */}
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mx-auto mb-4"
        aria-hidden="true"
      >
        {/* Cloud body */}
        <path
          d="M14 38h28a9 9 0 0 0 1.5-17.88A12 12 0 0 0 20.05 22 8 8 0 0 0 14 38Z"
          fill="oklch(0.750 0.170 75 / 0.18)"
          stroke="oklch(0.750 0.170 75 / 0.55)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Exclamation line */}
        <line
          x1="28"
          y1="26"
          x2="28"
          y2="32"
          stroke="oklch(0.750 0.170 75)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Exclamation dot */}
        <circle cx="28" cy="36" r="1.5" fill="oklch(0.750 0.170 75)" />
      </svg>

      <p className="text-sm font-medium text-foreground/80 leading-relaxed mb-4">
        {message}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-card border border-border rounded-lg text-sm font-semibold text-primary transition-all active:scale-95 shadow-sm hover:shadow-md"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Coba Lagi
        </button>
      )}
    </motion.div>
  );
}
