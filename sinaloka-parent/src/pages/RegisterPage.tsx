import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PasswordInput } from '../components/PasswordInput';
import { PasswordStrength } from '../components/PasswordStrength';
import { SinalokaLogo } from '../components/SinalokaLogo';
import api from '../api/client';

type TokenState =
  | { status: 'validating' }
  | { status: 'valid'; email: string }
  | { status: 'invalid'; message: string };

export function RegisterPage({ inviteToken, onSwitchToLogin }: { inviteToken: string; onSwitchToLogin: () => void }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokenState, setTokenState] = useState<TokenState>({ status: 'validating' });

  useEffect(() => {
    api.get(`/api/auth/register/parent/validate/${encodeURIComponent(inviteToken)}`)
      .then((res) => {
        setTokenState({ status: 'valid', email: res.data.email });
      })
      .catch((err) => {
        const msg: string = err?.response?.data?.message || 'Link undangan tidak valid atau sudah kadaluarsa.';
        setTokenState({ status: 'invalid', message: msg });
      });
  }, [inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try { await register(inviteToken, name, password); }
    catch (err: any) {
      setError(err?.response?.data?.message || 'Pendaftaran gagal.');
    } finally { setLoading(false); }
  };

  if (tokenState.status === 'validating') {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Memverifikasi undangan...</p>
        </div>
      </div>
    );
  }

  if (tokenState.status === 'invalid') {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center selection:bg-primary/20 selection:text-primary">
        <div className="w-full max-w-sm mx-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Undangan Tidak Valid</h2>
          <p className="text-muted-foreground text-sm">{tokenState.message}</p>
          <button onClick={onSwitchToLogin} className="text-primary font-semibold text-sm">
            Masuk ke akun yang ada
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center selection:bg-primary/20 selection:text-primary">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm mx-6">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <SinalokaLogo size={40} />
            <h1 className="text-3xl font-bold tracking-tight">Sinaloka</h1>
          </div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Daftar Akun Orang Tua</p>
          {tokenState.email && (
            <p className="text-muted-foreground text-xs mt-1">Undangan untuk: <span className="text-foreground font-medium">{tokenState.email}</span></p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-3 bg-destructive-muted border border-destructive/15 text-destructive px-5 py-4 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Nama Lengkap</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nama Anda"
              className="w-full px-5 py-3.5 rounded-lg bg-card border border-input focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-all text-foreground text-sm shadow-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Password</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Minimal 8 karakter" minLength={8} />
            <PasswordStrength password={password} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold py-3.5 rounded-lg shadow-sm text-base flex items-center justify-center gap-3 transition-all">
            <UserPlus className="w-5 h-5" />
            {loading ? 'Mendaftar...' : 'Daftar'}
          </button>
        </form>
        <p className="text-center text-muted-foreground text-sm mt-6">
          Sudah punya akun?{' '}
          <button onClick={onSwitchToLogin} className="text-primary font-semibold">Masuk</button>
        </p>
      </motion.div>
    </div>
  );
}
