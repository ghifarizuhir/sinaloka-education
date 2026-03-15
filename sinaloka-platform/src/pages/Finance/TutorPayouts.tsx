import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  History, ChevronLeft, ChevronRight, FileText, CheckCircle2,
  AlertCircle, Clock, DollarSign, Plus, Minus, Upload,
  Download, ExternalLink, Search, Filter, MoreVertical,
  ArrowLeft, BadgeCheck, X
} from 'lucide-react';
import { Card, Button, Badge, Input, Label, Checkbox, Skeleton } from '../../components/UI';
import { cn } from '../../lib/utils';
import { usePayouts, useCreatePayout, useUpdatePayout, useDeletePayout } from '@/src/hooks/usePayouts';
import { useTutors } from '@/src/hooks/useTutors';
import { toast } from 'sonner';
import type { Payout, CreatePayoutDto, UpdatePayoutDto } from '@/src/types/payout';

export const TutorPayouts = () => {
  const [view, setView] = useState<'list' | 'reconciliation'>('list');
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [bonus, setBonus] = useState(0);
  const [deduction, setDeduction] = useState(0);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTutorId, setNewTutorId] = useState('');
  const [newAmount, setNewAmount] = useState(0);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDescription, setNewDescription] = useState('');
  const itemsPerPage = 10;

  const { data: payoutsData, isLoading } = usePayouts({ page: currentPage, limit: itemsPerPage });
  const { data: tutorsData } = useTutors({ limit: 100 });
  const updatePayout = useUpdatePayout();
  const createPayout = useCreatePayout();
  const deletePayout = useDeletePayout();

  const payouts = payoutsData?.data ?? [];
  const total = payoutsData?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / itemsPerPage);
  const tutors = tutorsData?.data ?? [];

  const handleOpenReconciliation = (payout: Payout) => {
    setSelectedPayout(payout);
    setBonus(0);
    setDeduction(0);
    setReceiptFile(null);
    setView('reconciliation');
  };

  const handleConfirmPayout = () => {
    if (!selectedPayout) return;
    const dto: UpdatePayoutDto = { status: 'PAID' };
    updatePayout.mutate(
      { id: selectedPayout.id, data: dto },
      {
        onSuccess: () => {
          toast.success(`Payout confirmed for ${selectedPayout.tutor?.name ?? selectedPayout.tutor_id}.`);
          setView('list');
        },
        onError: () => toast.error('Failed to confirm payout.'),
      }
    );
  };

  const handleCreatePayout = () => {
    if (!newTutorId || !newAmount) {
      toast.error('Please fill in all required fields.');
      return;
    }
    const dto: CreatePayoutDto = {
      tutor_id: newTutorId,
      amount: newAmount,
      date: newDate,
      description: newDescription || undefined,
      status: 'PENDING',
    };
    createPayout.mutate(dto, {
      onSuccess: () => {
        toast.success('Payout created successfully.');
        setShowCreateModal(false);
        setNewTutorId('');
        setNewAmount(0);
        setNewDescription('');
      },
      onError: () => toast.error('Failed to create payout.'),
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this payout?')) return;
    deletePayout.mutate(id, {
      onSuccess: () => toast.success('Payout deleted.'),
      onError: () => toast.error('Failed to delete payout.'),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-9 w-40" />
        </div>
        <Card className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </Card>
      </div>
    );
  }

  if (view === 'reconciliation' && selectedPayout) {
    const totalPayout = selectedPayout.amount + bonus - deduction;

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6 pb-20"
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-bold">Back to Payouts</span>
          </button>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <Download size={16} />
              Export Audit
            </Button>
            {selectedPayout.status === 'PAID' ? (
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                <FileText size={16} />
                Download Payout Slip
              </Button>
            ) : (
              <Button
                onClick={handleConfirmPayout}
                disabled={updatePayout.isPending}
                className="gap-2"
              >
                {updatePayout.isPending ? 'Processing...' : 'Confirm & Generate Slip'}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Payout Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold">Payout Details</h3>
                  <p className="text-sm text-zinc-500">Review payout information for this cycle</p>
                </div>
                <Badge variant={
                  selectedPayout.status === 'PAID' ? 'success' :
                  selectedPayout.status === 'PROCESSING' ? 'default' : 'outline'
                }>
                  {selectedPayout.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tutor</p>
                  <p className="text-sm font-medium dark:text-zinc-200 mt-1">{selectedPayout.tutor?.name ?? selectedPayout.tutor_id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Bank Account</p>
                  <p className="text-sm font-medium dark:text-zinc-200 mt-1">
                    {selectedPayout.tutor?.bank_name && selectedPayout.tutor?.bank_account_number
                      ? `${selectedPayout.tutor.bank_name} - ${selectedPayout.tutor.bank_account_number}`
                      : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Payout Date</p>
                  <p className="text-sm font-medium dark:text-zinc-200 mt-1">{selectedPayout.date}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Base Amount</p>
                  <p className="text-sm font-bold text-indigo-600 mt-1">Rp {selectedPayout.amount.toLocaleString()}</p>
                </div>
              </div>
              {selectedPayout.description && (
                <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="text-xs text-zinc-500 italic">"{selectedPayout.description}"</p>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">Proof of Payment</h3>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-indigo-400 transition-colors cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                  {receiptFile ? <BadgeCheck className="text-emerald-500" size={24} /> : <Upload size={24} />}
                </div>
                <div>
                  <p className="text-sm font-bold dark:text-zinc-200">
                    {receiptFile ? receiptFile.name : 'Click to upload bank transfer receipt'}
                  </p>
                  <p className="text-xs text-zinc-500">JPG, PNG or PDF (Max 5MB)</p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
              </div>
            </Card>
          </div>

          {/* Right: Summary & Adjustments */}
          <div className="space-y-6">
            <Card className="p-6 bg-zinc-900 text-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold">
                  {(selectedPayout.tutor?.name ?? 'T').charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold">{selectedPayout.tutor?.name ?? selectedPayout.tutor_id}</h4>
                  <p className="text-xs text-zinc-400">
                    {selectedPayout.tutor?.bank_name ? `${selectedPayout.tutor.bank_name} - ${selectedPayout.tutor.bank_account_number}` : 'No bank info'}
                  </p>
                </div>
              </div>

              <div className="space-y-4 border-t border-zinc-800 pt-6">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Base Amount</span>
                  <span className="font-bold">Rp {selectedPayout.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-zinc-400 flex items-center gap-1">
                    Bonuses <Plus size={10} />
                  </span>
                  <input
                    type="number"
                    disabled={selectedPayout.status === 'PAID'}
                    value={bonus}
                    onChange={(e) => setBonus(Number(e.target.value))}
                    className="w-24 bg-zinc-800 border-none rounded px-2 py-1 text-right text-xs focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-zinc-400 flex items-center gap-1">
                    Deductions <Minus size={10} />
                  </span>
                  <input
                    type="number"
                    disabled={selectedPayout.status === 'PAID'}
                    value={deduction}
                    onChange={(e) => setDeduction(Number(e.target.value))}
                    className="w-24 bg-zinc-800 border-none rounded px-2 py-1 text-right text-xs focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>
                <div className="pt-4 border-t border-zinc-800 space-y-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Calculation Formula</p>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      {selectedPayout.amount.toLocaleString()} (Base) + {bonus.toLocaleString()} (Bonus) - {deduction.toLocaleString()} (Adj)
                    </p>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Net Payout</p>
                      <p className="text-2xl font-bold text-indigo-400">Rp {totalPayout.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-widest text-zinc-400">Payout Status</h4>
              <div className="space-y-3">
                {[
                  { label: 'Pending', icon: Clock, color: 'text-amber-500', active: selectedPayout.status === 'PENDING' },
                  { label: 'Processing', icon: History, color: 'text-blue-500', active: selectedPayout.status === 'PROCESSING' },
                  { label: 'Paid', icon: CheckCircle2, color: 'text-emerald-500', active: selectedPayout.status === 'PAID' },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all",
                      s.active ? "border-zinc-900 bg-zinc-50 dark:bg-zinc-800" : "border-zinc-100 dark:border-zinc-800 opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <s.icon size={16} className={s.color} />
                      <span className="text-xs font-bold">{s.label}</span>
                    </div>
                    {s.active && <div className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100" />}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tutor Payouts Intelligence</h2>
          <p className="text-zinc-500 text-sm">Verification-first model for tutor earnings and audit trails.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <Input placeholder="Search tutors..." className="pl-9 h-9 w-64" />
          </div>
          <Button variant="outline" className="gap-2 h-9">
            <Filter size={14} />
            Filter
          </Button>
          <Button className="gap-2 h-9" onClick={() => setShowCreateModal(true)}>
            <Plus size={14} />
            New Payout
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden relative">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tutor</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Date</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Amount</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {payouts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 text-sm">
                  No payouts found.
                </td>
              </tr>
            ) : payouts.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium dark:text-zinc-200">{p.tutor?.name ?? p.tutor_id}</span>
                    <span className="text-[10px] text-zinc-400">
                      {p.tutor?.bank_name ? `${p.tutor.bank_name} - ${p.tutor.bank_account_number}` : 'No bank info'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant={
                      p.status === 'PAID' ? 'success' :
                      p.status === 'PROCESSING' ? 'default' : 'outline'
                    }
                    className="text-[8px] uppercase tracking-tighter"
                  >
                    {p.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm dark:text-zinc-300">{p.date}</td>
                <td className="px-6 py-4 text-sm font-bold text-zinc-900 dark:text-zinc-100">Rp {p.amount.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant={p.status === 'PAID' ? 'outline' : 'primary'}
                      onClick={() => handleOpenReconciliation(p)}
                      className="h-8 text-[10px]"
                    >
                      {p.status === 'PAID' ? 'View Slip' : 'Reconcile'}
                    </Button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-zinc-400 hover:text-rose-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/30">
          <p className="text-xs text-zinc-500">
            Showing <span className="font-bold text-zinc-900 dark:text-zinc-100">{Math.min((currentPage - 1) * itemsPerPage + 1, total)}</span> to <span className="font-bold text-zinc-900 dark:text-zinc-100">{Math.min(currentPage * itemsPerPage, total)}</span> of <span className="font-bold text-zinc-900 dark:text-zinc-100">{total}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-1.5 disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={cn(
                    "w-8 h-8 text-xs font-bold rounded-lg transition-all",
                    currentPage === i + 1 ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-1.5 disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Card>

      {/* Create Payout Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-zinc-100 dark:border-zinc-800">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-xl font-bold dark:text-zinc-100">Create Payout</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-zinc-900">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Tutor</Label>
                <select
                  value={newTutorId}
                  onChange={(e) => setNewTutorId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:text-zinc-100"
                >
                  <option value="">Select tutor...</option>
                  {tutors.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Amount (Rp)</Label>
                <Input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. March 2026 payout"
                />
              </div>
            </div>
            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex gap-3">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button className="flex-1 justify-center" onClick={handleCreatePayout} disabled={createPayout.isPending}>
                {createPayout.isPending ? 'Creating...' : 'Create Payout'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
