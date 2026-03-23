import React from 'react';
import { cn } from '../lib/utils';

interface PasswordStrengthProps {
  password: string;
}

const CHECKS = [
  { label: 'Minimal 8 karakter', test: (p: string) => p.length >= 8 },
  { label: 'Huruf besar', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Huruf kecil', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Angka', test: (p: string) => /\d/.test(p) },
];

function getStrength(password: string): { score: number; label: string; color: string } {
  const passed = CHECKS.filter((c) => c.test(password)).length;
  if (passed <= 1) return { score: passed, label: 'Lemah', color: 'bg-destructive' };
  if (passed <= 2) return { score: passed, label: 'Cukup', color: 'bg-warning' };
  if (passed <= 3) return { score: passed, label: 'Baik', color: 'bg-info' };
  return { score: passed, label: 'Kuat', color: 'bg-success' };
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const { score, label, color } = getStrength(password);

  return (
    <div className="space-y-2 mt-2">
      {/* Progress bar */}
      <div className="flex gap-1">
        {Array.from({ length: CHECKS.length }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-all duration-300',
              i < score ? color : 'bg-border',
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Kekuatan: <span className={cn(score >= 3 ? 'text-success' : score >= 2 ? 'text-warning' : 'text-destructive')}>{label}</span>
        </p>
      </div>
      {/* Check list */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        {CHECKS.map((check) => {
          const passed = check.test(password);
          return (
            <p key={check.label} className={cn('text-[10px] transition-colors', passed ? 'text-success' : 'text-muted-foreground/50')}>
              {passed ? '✓' : '○'} {check.label}
            </p>
          );
        })}
      </div>
    </div>
  );
}
