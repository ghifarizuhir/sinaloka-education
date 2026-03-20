import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import api from '../api/client';
import { PasswordInput } from '../components/PasswordInput';

export function ResetPasswordPage({ token, onBack }: { token: string; onBack: () => void }) {
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get(`/api/auth/reset-password/${token}`)
      .then((res) => {
        setValid(true);
        setEmail(res.data.email);
      })
      .catch(() => setValid(false))
      .finally(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setSuccess(true);
      // Clear the token from URL and go back to login after a short delay
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => onBack(), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal mereset password.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans flex items-center justify-center selection:bg-lime-400 selection:text-black">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-sm mx-6 text-center"
        >
          <div className="mb-8">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Link Tidak Valid</h1>
            <p className="text-zinc-500 text-sm">Link reset password sudah kedaluwarsa atau tidak valid. Silakan minta link baru.</p>
          </div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-lime-400 hover:text-lime-300 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Login
          </button>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans flex items-center justify-center selection:bg-lime-400 selection:text-black">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-sm mx-6 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-lime-400/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-lime-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Password Berhasil Direset</h1>
          <p className="text-zinc-500 text-sm">Mengalihkan ke halaman login...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex items-center justify-center selection:bg-lime-400 selection:text-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm mx-6"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Reset Password</h1>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">{email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">
              Password Baru
            </label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Minimal 8 karakter"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">
              Konfirmasi Password
            </label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Ulangi password baru"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-lime-400 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-4 rounded-lg shadow-sm text-lg flex items-center justify-center gap-3 transition-all"
          >
            <Lock className="w-6 h-6" />
            {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
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
      </motion.div>
    </div>
  );
}
