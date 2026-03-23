import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PasswordInput } from '../components/PasswordInput';
import { SinalokaLogo } from '../components/SinalokaLogo';

export function RegisterPage({ inviteToken, onSwitchToLogin }: { inviteToken: string; onSwitchToLogin: () => void }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try { await register(inviteToken, name, password); }
    catch (err: any) {
      setError(err?.response?.data?.message || 'Pendaftaran gagal.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex items-center justify-center selection:bg-lime-400 selection:text-black">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm mx-6">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <SinalokaLogo size={40} />
            <h1 className="text-3xl font-bold tracking-tight">Sinaloka</h1>
          </div>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Daftar Akun Orang Tua</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">Nama Lengkap</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nama Anda"
              className="w-full px-6 py-4 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">Password</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Minimal 8 karakter" minLength={8} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-lime-400 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-4 rounded-lg shadow-sm text-lg flex items-center justify-center gap-3 transition-all">
            <UserPlus className="w-6 h-6" />
            {loading ? 'Mendaftar...' : 'Daftar'}
          </button>
        </form>
        <p className="text-center text-zinc-500 text-sm mt-6">
          Sudah punya akun?{' '}
          <button onClick={onSwitchToLogin} className="text-lime-400 font-semibold">Masuk</button>
        </p>
      </motion.div>
    </div>
  );
}
