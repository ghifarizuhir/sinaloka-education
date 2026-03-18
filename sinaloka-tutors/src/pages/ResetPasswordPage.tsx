import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PasswordInput } from '../components/PasswordInput';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      return;
    }
    axios.get(`/api/auth/reset-password/${token}`)
      .then((res) => {
        setValid(true);
        setEmail(res.data.email);
      })
      .catch(() => {
        setValid(false);
      })
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
      await axios.post('/api/auth/reset-password', { token, password });
      navigate('/login?reset=true');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal mereset password.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token || !valid) {
    return (
      <div className="min-h-screen bg-surface text-white font-sans flex items-center justify-center selection:bg-brand/30 selection:text-white">
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
            <p className="text-subtle text-sm">Link reset password sudah kedaluwarsa atau tidak valid. Silakan minta link baru.</p>
          </div>
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-2 text-brand hover:text-brand/80 text-sm font-medium transition-colors"
          >
            Minta Link Baru
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-surface-foreground font-sans flex items-center justify-center selection:bg-brand/30 selection:text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm mx-6"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Reset Password</h1>
          <p className="text-subtle text-xs font-medium uppercase tracking-wider">{email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-2">
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
            <label className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-2">
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
            className="w-full bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed text-brand-foreground font-semibold py-4 rounded-lg shadow-sm text-lg flex items-center justify-center gap-3 transition-all"
          >
            <Lock className="w-6 h-6" />
            {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>

          <Link
            to="/login"
            className="w-full flex items-center justify-center gap-2 text-subtle hover:text-white text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Login
          </Link>
        </form>
      </motion.div>
    </div>
  );
}
