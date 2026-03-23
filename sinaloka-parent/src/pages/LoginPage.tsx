import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PasswordInput } from '../components/PasswordInput';
import { SinalokaLogo } from '../components/SinalokaLogo';

export function LoginPage({ onForgotPassword }: { onForgotPassword: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try { await login(email, password); }
    catch (err: any) {
      setError(err?.response?.data?.message || 'Login gagal. Periksa email dan password.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center selection:bg-primary/20 selection:text-primary">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm mx-6">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <SinalokaLogo size={40} />
            <h1 className="text-3xl font-bold tracking-tight">Sinaloka</h1>
          </div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Portal Orang Tua</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-3 bg-destructive-muted border border-destructive/15 text-destructive px-5 py-4 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="parent@example.com"
              className="w-full px-5 py-3.5 rounded-lg bg-card border border-input focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-all text-foreground text-sm shadow-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Password</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold py-3.5 rounded-lg shadow-sm text-base flex items-center justify-center gap-3 transition-all">
            <LogIn className="w-5 h-5" />
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
          <button
            type="button"
            onClick={onForgotPassword}
            className="w-full text-center text-muted-foreground hover:text-primary text-sm font-medium transition-colors"
          >
            Lupa Password?
          </button>
        </form>
      </motion.div>
    </div>
  );
}
