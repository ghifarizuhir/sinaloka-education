# Reset Password Validation & UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the forgot password UX in both tutor and parent apps with email validation, secure "if registered" messaging, email display, and resend with cooldown.

**Architecture:** Frontend-only changes to two `ForgotPasswordPage.tsx` files (tutors and parent). No backend changes. Both files get identical logic changes — they differ only in navigation pattern (React Router Link vs onBack prop) and placeholder text.

**Tech Stack:** React, TypeScript, Axios, Motion (Framer Motion), Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-18-reset-password-validation-design.md`

---

## Chunk 1: Both Apps

### Task 1: Update sinaloka-tutors ForgotPasswordPage

**Files:**
- Modify: `sinaloka-tutors/src/pages/ForgotPasswordPage.tsx`

- [ ] **Step 1: Rewrite ForgotPasswordPage.tsx**

Replace the entire file with the following. Key changes from current version:
- Added `useRef` import and `intervalRef` for cooldown timer
- Added `isValidEmail` helper and validation in `handleSubmit`
- Added `cooldown` state and `startCooldown` helper
- Added `handleResend` function
- Updated success message to include email and "if registered" qualifier
- Added resend button with cooldown timer
- Added cleanup effect for interval on unmount

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const startCooldown = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCooldown(60);
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!isValidEmail(email)) {
      setError('Format email tidak valid');
      setLoading(false);
      return;
    }

    try {
      await axios.post('/api/auth/forgot-password', { email });
      setSent(true);
      startCooldown();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setLoading(true);
    try {
      await axios.post('/api/auth/forgot-password', { email });
      startCooldown();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex items-center justify-center selection:bg-lime-400 selection:text-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm mx-6"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Lupa Password</h1>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">
            Masukkan email untuk reset password
          </p>
        </div>

        {sent ? (
          <div className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-lg text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex items-start gap-3 bg-lime-400/10 border border-lime-400/20 text-lime-400 px-5 py-4 rounded-lg text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>Jika <strong>{email}</strong> terdaftar, link reset password akan dikirim. Periksa inbox atau folder spam.</span>
            </div>
            <button
              onClick={handleResend}
              disabled={loading || cooldown > 0}
              className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {cooldown > 0 ? `Kirim Ulang (${cooldown}s)` : 'Kirim Ulang'}
            </button>
            <Link
              to="/login"
              className="w-full flex items-center justify-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-lg text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tutor@example.com"
                className="w-full px-6 py-4 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-lime-400 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-4 rounded-lg shadow-sm text-lg flex items-center justify-center gap-3 transition-all"
            >
              <Mail className="w-6 h-6" />
              {loading ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>

            <Link
              to="/login"
              className="w-full flex items-center justify-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Login
            </Link>
          </form>
        )}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd sinaloka-tutors && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-tutors/src/pages/ForgotPasswordPage.tsx
git commit -m "feat(tutors): improve forgot password with validation, secure messaging, and resend"
```

---

### Task 2: Update sinaloka-parent ForgotPasswordPage

**Files:**
- Modify: `sinaloka-parent/src/pages/ForgotPasswordPage.tsx`

- [ ] **Step 1: Rewrite ForgotPasswordPage.tsx**

Same logic as Task 1, but with parent-specific differences:
- Uses `onBack` prop instead of `<Link to="/login">`
- Placeholder is "parent@example.com"

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';
import axios from 'axios';

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function ForgotPasswordPage({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const startCooldown = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCooldown(60);
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!isValidEmail(email)) {
      setError('Format email tidak valid');
      setLoading(false);
      return;
    }

    try {
      await axios.post('/api/auth/forgot-password', { email });
      setSent(true);
      startCooldown();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setLoading(true);
    try {
      await axios.post('/api/auth/forgot-password', { email });
      startCooldown();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex items-center justify-center selection:bg-lime-400 selection:text-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm mx-6"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Lupa Password</h1>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">
            Masukkan email untuk reset password
          </p>
        </div>

        {sent ? (
          <div className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-lg text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex items-start gap-3 bg-lime-400/10 border border-lime-400/20 text-lime-400 px-5 py-4 rounded-lg text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>Jika <strong>{email}</strong> terdaftar, link reset password akan dikirim. Periksa inbox atau folder spam.</span>
            </div>
            <button
              onClick={handleResend}
              disabled={loading || cooldown > 0}
              className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {cooldown > 0 ? `Kirim Ulang (${cooldown}s)` : 'Kirim Ulang'}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-lg text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="parent@example.com"
                className="w-full px-6 py-4 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-lime-400 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-4 rounded-lg shadow-sm text-lg flex items-center justify-center gap-3 transition-all"
            >
              <Mail className="w-6 h-6" />
              {loading ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Login
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd sinaloka-parent && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-parent/src/pages/ForgotPasswordPage.tsx
git commit -m "feat(parent): improve forgot password with validation, secure messaging, and resend"
```

---

### Task 3: Build verification

**Files:** None (verification only)

- [ ] **Step 1: Build tutors**

Run: `cd sinaloka-tutors && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 2: Build parent**

Run: `cd sinaloka-parent && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Manual smoke test checklist**

If dev servers are running:

1. **Tutors forgot password:** Navigate to /forgot-password → enter invalid email format → should show "Format email tidak valid"
2. **Tutors forgot password:** Enter valid email → submit → should show success with email displayed bold and "Jika ... terdaftar" message
3. **Tutors resend:** On success screen → "Kirim Ulang" button should be disabled with countdown → after 60s should be enabled
4. **Parent forgot password:** Same tests via parent app's forgot password flow
