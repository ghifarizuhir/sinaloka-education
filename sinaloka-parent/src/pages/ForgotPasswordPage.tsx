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
