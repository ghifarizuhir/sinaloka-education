import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import api from '../api/client';

interface ProfileEditPageProps {
  onSaved: () => void;
  onClose: () => void;
}

export function ProfileEditPage({ onSaved, onClose }: ProfileEditPageProps) {
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/tutor/profile')
      .then((res) => {
        setBankName(res.data.bank_name ?? '');
        setBankAccountNumber(res.data.bank_account_number ?? '');
        setBankAccountHolder(res.data.bank_account_holder ?? '');
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!bankName || !bankAccountNumber || !bankAccountHolder) {
      return;
    }

    try {
      await api.patch('/api/tutor/profile', {
        bank_name: bankName,
        bank_account_number: bankAccountNumber,
        bank_account_holder: bankAccountHolder,
      });
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal menyimpan profil.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-surface-muted border border-surface-border flex items-center justify-center text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold leading-none mb-1">Edit Profil</h1>
          <p className="text-subtle text-[10px] font-bold uppercase tracking-wider">Informasi rekening bank</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-1">Nama Bank</label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="e.g., BCA, BNI, Mandiri"
            required
            className="w-full px-4 py-3 rounded-lg bg-surface-muted border border-surface-border focus:outline-none focus:border-brand transition-all text-white text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-1">Nomor Rekening</label>
          <input
            type="text"
            value={bankAccountNumber}
            onChange={(e) => setBankAccountNumber(e.target.value)}
            placeholder="e.g., 1234567890"
            required
            className="w-full px-4 py-3 rounded-lg bg-surface-muted border border-surface-border focus:outline-none focus:border-brand transition-all text-white text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-1">Nama Pemilik Rekening</label>
          <input
            type="text"
            value={bankAccountHolder}
            onChange={(e) => setBankAccountHolder(e.target.value)}
            placeholder="e.g., Budi Santoso"
            required
            className="w-full px-4 py-3 rounded-lg bg-surface-muted border border-surface-border focus:outline-none focus:border-brand transition-all text-white text-sm"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed text-brand-foreground font-semibold py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
          >
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </div>
  );
}
