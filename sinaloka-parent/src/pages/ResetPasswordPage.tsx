import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import api from '../api/client';
import { PasswordInput } from '../components/PasswordInput';
import { PasswordStrength } from '../components/PasswordStrength';

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center selection:bg-primary/20 selection:text-primary">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-sm mx-6 text-center"
        >
          <div className="mb-8">
            <div className="w-16 h-16 rounded-full bg-destructive-muted flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Link Tidak Valid</h1>
            <p className="text-muted-foreground text-sm">Link reset password sudah kedaluwarsa atau tidak valid. Silakan minta link baru.</p>
          </div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
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
      <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center selection:bg-primary/20 selection:text-primary">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-sm mx-6 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-success-muted flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Password Berhasil Direset</h1>
          <p className="text-muted-foreground text-sm">Mengalihkan ke halaman login...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center selection:bg-primary/20 selection:text-primary">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm mx-6"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Reset Password</h1>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-3 bg-destructive-muted border border-destructive/15 text-destructive px-5 py-4 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">
              Password Baru
            </label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Minimal 8 karakter"
            />
            <PasswordStrength password={password} />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">
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
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold py-3.5 rounded-lg shadow-sm text-base flex items-center justify-center gap-3 transition-all"
          >
            <Lock className="w-5 h-5" />
            {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
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
      </motion.div>
    </div>
  );
}
