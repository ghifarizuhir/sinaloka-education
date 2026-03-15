import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserPlus, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

interface InvitationInfo {
  name: string;
  email: string;
}

type PageState =
  | { status: 'loading' }
  | { status: 'form'; invitation: InvitationInfo }
  | { status: 'error'; message: string }
  | { status: 'submitting' }
  | { status: 'no_token' };

export function AcceptInvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [pageState, setPageState] = useState<PageState>({ status: 'loading' });
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');

  useEffect(() => {
    if (!token) {
      setPageState({ status: 'no_token' });
      return;
    }

    axios
      .get(`/api/invitation/${token}`)
      .then((res) => {
        const invitation: InvitationInfo = res.data;
        setFullName(invitation.name ?? '');
        setPageState({ status: 'form', invitation });
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 409) {
          // Already accepted — redirect to login
          navigate('/login', { replace: true });
        } else if (status === 410) {
          setPageState({
            status: 'error',
            message: 'Undangan ini sudah kadaluarsa atau dibatalkan.',
          });
        } else if (status === 404) {
          setPageState({
            status: 'error',
            message: 'Link undangan tidak valid.',
          });
        } else {
          setPageState({
            status: 'error',
            message: 'Terjadi kesalahan saat memverifikasi undangan.',
          });
        }
      });
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError('Password minimal 8 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Konfirmasi password tidak cocok.');
      return;
    }

    setPageState({ status: 'submitting' });

    try {
      await axios.post('/api/invitation/accept', {
        token,
        name: fullName,
        password,
        bank_name: bankName || undefined,
        bank_account_number: bankAccountNumber || undefined,
        bank_account_holder: bankAccountHolder || undefined,
      });
      navigate('/login?invited=true', { replace: true });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        'Gagal menerima undangan. Silakan coba lagi.';
      setFormError(message);
      // Restore form state so user can retry
      setPageState({
        status: 'form',
        invitation: { name: fullName, email: '' },
      });
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (pageState.status === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-lime-400 animate-spin" />
      </div>
    );
  }

  // ── No token ─────────────────────────────────────────────────────────────
  if (pageState.status === 'no_token') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans flex items-center justify-center selection:bg-lime-400 selection:text-black">
        <div className="w-full max-w-sm mx-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-zinc-500 mx-auto" />
          <h2 className="text-xl font-semibold">Token tidak ditemukan</h2>
          <p className="text-zinc-500 text-sm">
            Link undangan tidak memiliki token yang valid.
          </p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (pageState.status === 'error') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans flex items-center justify-center selection:bg-lime-400 selection:text-black">
        <div className="w-full max-w-sm mx-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-semibold">Undangan Tidak Valid</h2>
          <p className="text-zinc-500 text-sm">{pageState.message}</p>
        </div>
      </div>
    );
  }

  // ── Form (and submitting) ────────────────────────────────────────────────
  const isSubmitting = pageState.status === 'submitting';

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex items-center justify-center selection:bg-lime-400 selection:text-black py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm mx-6"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Sinaloka</h1>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">
            Aktivasi Akun Tutor
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Nama lengkap"
              className="w-full px-6 py-4 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Min. 8 karakter"
              className="w-full px-6 py-4 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm"
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">
              Konfirmasi Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Ulangi password"
              className="w-full px-6 py-4 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm"
            />
          </div>

          {/* Bank info divider */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
              Info Bank (Opsional)
            </span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Bank Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">
              Nama Bank
            </label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Contoh: BCA, Mandiri, BNI"
              className="w-full px-6 py-4 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm"
            />
          </div>

          {/* Bank Account Number */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">
              Nomor Rekening
            </label>
            <input
              type="text"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              placeholder="Nomor rekening bank"
              className="w-full px-6 py-4 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm"
            />
          </div>

          {/* Bank Account Holder */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-2">
              Nama Pemilik Rekening
            </label>
            <input
              type="text"
              value={bankAccountHolder}
              onChange={(e) => setBankAccountHolder(e.target.value)}
              placeholder="Nama sesuai rekening"
              className="w-full px-6 py-4 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-lime-400 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-4 rounded-lg shadow-sm text-lg flex items-center justify-center gap-3 transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <UserPlus className="w-6 h-6" />
            )}
            {isSubmitting ? 'Memproses...' : 'Aktivasi Akun'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
