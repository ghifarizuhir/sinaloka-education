import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PasswordInput } from '../components/PasswordInput';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invited = searchParams.get('invited') === 'true';
  const reset = searchParams.get('reset') === 'true';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      const message =
        err?.response?.data?.message || 'Login gagal. Periksa email dan password.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-white font-sans flex items-center justify-center selection:bg-brand/30 selection:text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm mx-6"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Sinaloka
          </h1>
          <p className="text-subtle text-xs font-medium uppercase tracking-wider">
            Portal Tutor
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {invited && (
            <div className="flex items-center gap-3 bg-brand-muted border border-brand/20 text-brand px-5 py-4 rounded-lg text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Akun berhasil diaktivasi! Silakan masuk.</span>
            </div>
          )}

          {reset && (
            <div className="flex items-center gap-3 bg-brand-muted border border-brand/20 text-brand px-5 py-4 rounded-lg text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Password berhasil direset. Silakan login.</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tutor@example.com"
              className="w-full px-6 py-4 rounded-lg bg-surface-muted border border-surface-border focus:outline-none focus:border-brand transition-all text-white text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-2">
              Password
            </label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed text-brand-foreground font-semibold py-4 rounded-lg shadow-sm text-lg flex items-center justify-center gap-3 transition-all"
          >
            <LogIn className="w-6 h-6" />
            {loading ? 'Masuk...' : 'Masuk'}
          </button>

          <Link
            to="/forgot-password"
            className="w-full flex items-center justify-center text-subtle hover:text-surface-foreground/70 text-sm font-medium transition-colors"
          >
            Lupa Password?
          </Link>
        </form>
      </motion.div>
    </div>
  );
}
