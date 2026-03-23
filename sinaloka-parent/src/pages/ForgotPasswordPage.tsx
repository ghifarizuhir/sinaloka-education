import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';
import api from '../api/client';

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
      await api.post('/api/auth/forgot-password', { email });
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
      await api.post('/api/auth/forgot-password', { email });
      startCooldown();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center selection:bg-primary/20 selection:text-primary">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm mx-6"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Lupa Password</h1>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Masukkan email untuk reset password
          </p>
        </div>

        {sent ? (
          <div className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 bg-destructive-muted border border-destructive/15 text-destructive px-5 py-4 rounded-lg text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex items-start gap-3 bg-success-muted border border-success/15 text-success px-5 py-4 rounded-lg text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>Jika <strong>{email}</strong> terdaftar, link reset password akan dikirim. Periksa inbox atau folder spam.</span>
            </div>
            <button
              onClick={handleResend}
              disabled={loading || cooldown > 0}
              className="w-full bg-muted hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-foreground font-semibold py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {cooldown > 0 ? `Kirim Ulang (${cooldown}s)` : 'Kirim Ulang'}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 bg-destructive-muted border border-destructive/15 text-destructive px-5 py-4 rounded-lg text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="parent@example.com"
                className="w-full px-5 py-3.5 rounded-lg bg-card border border-input focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-all text-foreground text-sm shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold py-3.5 rounded-lg shadow-sm text-base flex items-center justify-center gap-3 transition-all"
            >
              <Mail className="w-5 h-5" />
              {loading ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
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
