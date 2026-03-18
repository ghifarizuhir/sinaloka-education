import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import {
  History, ChevronLeft, ChevronRight, FileText, CheckCircle2,
  AlertCircle, Clock, DollarSign, Plus, Minus, Upload,
  Download, ExternalLink, Search, Filter, MoreVertical,
  ArrowLeft, BadgeCheck, X, AlertTriangle
} from 'lucide-react';
import { Card, Button, Badge, Input, Label, Checkbox, Skeleton, ConfirmDialog, PageHeader, Select } from '../../components/UI';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import { usePayouts, useCreatePayout, useUpdatePayout, useDeletePayout, useCalculatePayout, useGenerateSalaries } from '@/src/hooks/usePayouts';
import { useTutors } from '@/src/hooks/useTutors';
import { toast } from 'sonner';
import type { Payout, CreatePayoutDto, UpdatePayoutDto, PayoutCalculation } from '@/src/types/payout';
import { getPayoutTutorName, getPayoutBankInfo } from '@/src/types/payout';
import { payoutsService } from '@/src/services/payouts.service';

export const TutorPayouts = () => {
  const { t, i18n } = useTranslation();
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
  const [formPeriodStart, setFormPeriodStart] = useState('');
  const [formPeriodEnd, setFormPeriodEnd] = useState('');
  const [calculation, setCalculation] = useState<PayoutCalculation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'PROCESSING' | 'PAID' | ''>('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isGeneratingSlip, setIsGeneratingSlip] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isExportingAudit, setIsExportingAudit] = useState(false);
  const itemsPerPage = 10;

  const { data: payoutsData, isLoading } = usePayouts({
    page: currentPage,
    limit: itemsPerPage,
    ...(statusFilter ? { status: statusFilter as 'PENDING' | 'PROCESSING' | 'PAID' } : {}),
  });
  const { data: tutorsData } = useTutors({ limit: 100 });
  const updatePayout = useUpdatePayout();
  const createPayout = useCreatePayout();
  const deletePayout = useDeletePayout();
  const calculatePayout = useCalculatePayout();
  const generateSalaries = useGenerateSalaries();

  const allPayouts = payoutsData?.data ?? [];
  const payouts = searchQuery
    ? allPayouts.filter((p) =>
        getPayoutTutorName(p).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allPayouts;
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
    const totalAmount = Number(selectedPayout.amount) + bonus - deduction;
    const dto: UpdatePayoutDto = {
      status: 'PAID',
      amount: totalAmount,
      description: (bonus || deduction)
        ? `${selectedPayout.description || ''}${selectedPayout.description ? ' | ' : ''}${t('payouts.reconciliation.bonuses')}: +${formatCurrency(bonus, i18n.language)} ${t('payouts.reconciliation.deductions')}: -${formatCurrency(deduction, i18n.language)}`.trim()
        : undefined,
    };
    updatePayout.mutate(
      { id: selectedPayout.id, data: dto },
      {
        onSuccess: () => {
          toast.success(t('payouts.toast.confirmed', { tutor: getPayoutTutorName(selectedPayout) || t('common.noData') }));
          setView('list');
        },
        onError: () => toast.error(t('payouts.toast.confirmError')),
      }
    );
  };

  const handleCalculate = () => {
    if (!newTutorId || !formPeriodStart || !formPeriodEnd) return;
    calculatePayout.mutate(
      { tutor_id: newTutorId, period_start: formPeriodStart, period_end: formPeriodEnd },
      {
        onSuccess: (data: PayoutCalculation) => {
          setCalculation(data);
          setNewAmount(data.calculated_amount);
        },
      },
    );
  };

  const handleCreatePayout = () => {
    if (!newTutorId || !newAmount) {
      toast.error(t('payouts.toast.fillRequired'));
      return;
    }
    const dto: CreatePayoutDto = {
      tutor_id: newTutorId,
      amount: newAmount,
      date: newDate,
      description: newDescription || undefined,
      status: 'PENDING',
      period_start: formPeriodStart || undefined,
      period_end: formPeriodEnd || undefined,
    };
    createPayout.mutate(dto, {
      onSuccess: () => {
        toast.success(t('payouts.toast.created'));
        setShowCreateModal(false);
        setNewTutorId('');
        setNewAmount(0);
        setNewDescription('');
        setFormPeriodStart('');
        setFormPeriodEnd('');
        setCalculation(null);
      },
      onError: () => toast.error(t('payouts.toast.createError')),
    });
  };

  const handleProofUpload = async (file: File) => {
    if (!selectedPayout) return;
    setIsUploadingProof(true);
    try {
      const proofUrl = await payoutsService.uploadProof(file);
      updatePayout.mutate(
        { id: selectedPayout.id, data: { proof_url: proofUrl } },
        {
          onSuccess: (updated) => {
            setSelectedPayout(updated);
            toast.success(t('payouts.toast.proofUploaded', { defaultValue: 'Proof uploaded successfully' }));
          },
          onError: () => toast.error(t('payouts.toast.proofUploadError', { defaultValue: 'Failed to upload proof' })),
        },
      );
    } catch {
      toast.error(t('payouts.toast.proofUploadError', { defaultValue: 'Failed to upload proof' }));
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleGenerateSlip = async () => {
    if (!selectedPayout) return;
    setIsGeneratingSlip(true);
    try {
      const updated = await payoutsService.generateSlip(selectedPayout.id);
      setSelectedPayout(updated);
      if (updated.slip_url) {
        const apiUrl = import.meta.env.VITE_API_URL ?? '';
        window.open(`${apiUrl}/api/uploads/${updated.slip_url}`, '_blank');
      }
      toast.success(t('payouts.toast.slipGenerated', { defaultValue: 'Payout slip generated' }));
    } catch {
      toast.error(t('payouts.toast.slipError', { defaultValue: 'Failed to generate payout slip' }));
    } finally {
      setIsGeneratingSlip(false);
    }
  };

  const handleDownloadSlip = () => {
    if (!selectedPayout?.slip_url) return;
    const apiUrl = import.meta.env.VITE_API_URL ?? '';
    window.open(`${apiUrl}/api/uploads/${selectedPayout.slip_url}`, '_blank');
  };

  const handleExportAudit = async () => {
    if (!selectedPayout) return;
    setIsExportingAudit(true);
    try {
      const blob = await payoutsService.exportAudit(selectedPayout.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payout-audit-${selectedPayout.id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('payouts.toast.exportError', { defaultValue: 'Failed to export audit' }));
    } finally {
      setIsExportingAudit(false);
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePayout.mutate(deleteTarget, {
      onSuccess: () => { toast.success(t('payouts.toast.deleted')); setDeleteTarget(null); },
      onError: () => toast.error(t('payouts.toast.deleteError')),
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
    const totalPayout = Number(selectedPayout.amount) + bonus - deduction;

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
            <span className="font-bold">{t('payouts.backToPayouts')}</span>
          </button>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2" onClick={handleExportAudit} disabled={isExportingAudit}>
              <Download size={16} />
              {isExportingAudit ? t('common.processing') : t('payouts.exportAudit')}
            </Button>
            {selectedPayout.status === 'PAID' ? (
              selectedPayout.slip_url ? (
                <Button onClick={handleDownloadSlip} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                  <FileText size={16} />
                  {t('payouts.downloadPayoutSlip')}
                </Button>
              ) : (
                <Button
                  onClick={handleGenerateSlip}
                  disabled={isGeneratingSlip}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                >
                  <FileText size={16} />
                  {isGeneratingSlip ? t('common.processing') : t('payouts.downloadPayoutSlip')}
                </Button>
              )
            ) : (
              <Button
                onClick={handleConfirmPayout}
                disabled={updatePayout.isPending}
                className="gap-2"
              >
                {updatePayout.isPending ? t('common.processing') : t('payouts.confirmGenerateSlip')}
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
                  <h3 className="text-lg font-bold">{t('payouts.reconciliation.payoutDetails')}</h3>
                  <p className="text-sm text-zinc-500">{t('payouts.reconciliation.reviewInfo')}</p>
                </div>
                <Badge variant={
                  selectedPayout.status === 'PAID' ? 'success' :
                  selectedPayout.status === 'PROCESSING' ? 'default' : 'outline'
                }>
                  {selectedPayout.status === 'PAID' ? t('payouts.reconciliation.paid') : selectedPayout.status === 'PROCESSING' ? t('payouts.reconciliation.processing') : t('payouts.reconciliation.pending')}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('payouts.reconciliation.tutor')}</p>
                  <p className="text-sm font-medium dark:text-zinc-200 mt-1">{getPayoutTutorName(selectedPayout) || t('common.noData')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('payouts.reconciliation.bankAccount')}</p>
                  <p className="text-sm font-medium dark:text-zinc-200 mt-1">
                    {getPayoutBankInfo(selectedPayout).bank_name && getPayoutBankInfo(selectedPayout).bank_account_number
                      ? `${getPayoutBankInfo(selectedPayout).bank_name} - ${getPayoutBankInfo(selectedPayout).bank_account_number}`
                      : t('payouts.notSet')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('payouts.reconciliation.payoutDate')}</p>
                  <p className="text-sm font-medium dark:text-zinc-200 mt-1">{formatDate(selectedPayout.date, i18n.language)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('payouts.reconciliation.baseAmount')}</p>
                  <p className="text-sm font-bold text-indigo-600 mt-1">{formatCurrency(Number(selectedPayout.amount), i18n.language)}</p>
                </div>
              </div>
              {selectedPayout?.period_start && selectedPayout?.period_end && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-zinc-400">{t('payouts.period')}</span>
                  <span className="text-sm font-medium">{formatDate(selectedPayout.period_start, i18n.language)} — {formatDate(selectedPayout.period_end, i18n.language)}</span>
                </div>
              )}
              {selectedPayout.description && (
                <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="text-xs text-zinc-500 italic">"{selectedPayout.description}"</p>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">{t('payouts.reconciliation.proofOfPayment')}</h3>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-indigo-400 transition-colors cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                  {receiptFile || selectedPayout.proof_url ? <BadgeCheck className="text-emerald-500" size={24} /> : <Upload size={24} />}
                </div>
                <div>
                  <p className="text-sm font-bold dark:text-zinc-200">
                    {isUploadingProof
                      ? t('common.processing')
                      : receiptFile
                      ? receiptFile.name
                      : selectedPayout.proof_url
                      ? t('payouts.reconciliation.proofUploaded', { defaultValue: 'Proof uploaded' })
                      : t('payouts.reconciliation.uploadReceipt')}
                  </p>
                  <p className="text-xs text-zinc-500">{t('payouts.reconciliation.fileTypes')}</p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setReceiptFile(file);
                    if (file) handleProofUpload(file);
                  }}
                />
              </div>
            </Card>
          </div>

          {/* Right: Summary & Adjustments */}
          <div className="space-y-6">
            <Card className="p-6 bg-zinc-900 text-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold">
                  {(getPayoutTutorName(selectedPayout) || 'T').charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold">{getPayoutTutorName(selectedPayout) || t('common.noData')}</h4>
                  <p className="text-xs text-zinc-400">
                    {getPayoutBankInfo(selectedPayout).bank_name ? `${getPayoutBankInfo(selectedPayout).bank_name} - ${getPayoutBankInfo(selectedPayout).bank_account_number}` : t('payouts.noBankInfo')}
                  </p>
                </div>
              </div>

              <div className="space-y-4 border-t border-zinc-800 pt-6">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">{t('payouts.reconciliation.baseAmount')}</span>
                  <span className="font-bold">{formatCurrency(Number(selectedPayout.amount), i18n.language)}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-zinc-400 flex items-center gap-1">
                    {t('payouts.reconciliation.bonuses')} <Plus size={10} />
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
                    {t('payouts.reconciliation.deductions')} <Minus size={10} />
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
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('payouts.reconciliation.calculationFormula')}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      {formatCurrency(Number(selectedPayout.amount), i18n.language)} (Base) + {formatCurrency(bonus, i18n.language)} (Bonus) - {formatCurrency(deduction, i18n.language)} (Adj)
                    </p>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('payouts.reconciliation.netPayout')}</p>
                      <p className="text-2xl font-bold text-indigo-400">{formatCurrency(totalPayout, i18n.language)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-widest text-zinc-400">{t('payouts.reconciliation.payoutStatus')}</h4>
              <div className="space-y-3">
                {[
                  { label: t('payouts.reconciliation.pending'), icon: Clock, color: 'text-amber-500', active: selectedPayout.status === 'PENDING' },
                  { label: t('payouts.reconciliation.processing'), icon: History, color: 'text-blue-500', active: selectedPayout.status === 'PROCESSING' },
                  { label: t('payouts.reconciliation.paid'), icon: CheckCircle2, color: 'text-emerald-500', active: selectedPayout.status === 'PAID' },
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
      <PageHeader
        title={t('payouts.title')}
        subtitle={t('payouts.subtitle')}
        actions={<>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <Input
              placeholder={t('payouts.searchPlaceholder')}
              className="pl-9 h-9 w-64"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(value) => { setStatusFilter(value as any); setCurrentPage(1); }}
            options={[
              { value: '', label: t('payouts.allStatuses') },
              { value: 'PENDING', label: t('payouts.reconciliation.pending') },
              { value: 'PROCESSING', label: t('payouts.reconciliation.processing') },
              { value: 'PAID', label: t('payouts.reconciliation.paid') },
            ]}
          />
          <Button
            variant="outline"
            className="gap-2 h-9"
            onClick={() => {
              generateSalaries.mutate(undefined, {
                onSuccess: (result) => toast.success(t('payouts.salariesGenerated', { count: result.created })),
                onError: () => toast.error(t('payouts.salariesError')),
              });
            }}
            disabled={generateSalaries.isPending}
          >
            <DollarSign size={14} />
            {t('payouts.generateSalaries')}
          </Button>
          <Button className="gap-2 h-9" onClick={() => { setFormPeriodStart(''); setFormPeriodEnd(''); setCalculation(null); setShowCreateModal(true); }}>
            <Plus size={14} />
            {t('payouts.newPayout')}
          </Button>
        </>}
      />

      <Card className="p-0 overflow-hidden relative">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('payouts.table.tutor')}</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('payouts.table.status')}</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('payouts.table.date')}</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('payouts.table.amount')}</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">{t('payouts.table.action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {payouts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                      <Search size={32} className="text-zinc-300" />
                    </div>
                    <h3 className="text-lg font-bold mb-1">{t('payouts.noPayoutsFound')}</h3>
                    <p className="text-zinc-500 text-sm mb-6">{t('payouts.noPayoutsHint')}</p>
                  </div>
                </td>
              </tr>
            ) : payouts.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium dark:text-zinc-200">{getPayoutTutorName(p) || t('common.noData')}</span>
                    <span className="text-[10px] text-zinc-400">
                      {getPayoutBankInfo(p).bank_name ? `${getPayoutBankInfo(p).bank_name} - ${getPayoutBankInfo(p).bank_account_number}` : t('payouts.noBankInfo')}
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
                    {p.status === 'PAID' ? t('payouts.reconciliation.paid') : p.status === 'PROCESSING' ? t('payouts.reconciliation.processing') : t('payouts.reconciliation.pending')}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm dark:text-zinc-300">{formatDate(p.date, i18n.language)}</td>
                <td className="px-6 py-4 text-sm font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(Number(p.amount), i18n.language)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant={p.status === 'PAID' ? 'outline' : 'primary'}
                      onClick={() => handleOpenReconciliation(p)}
                      className="h-8 text-[10px]"
                    >
                      {p.status === 'PAID' ? t('payouts.viewSlip') : t('payouts.reconcile')}
                    </Button>
                    <button
                      onClick={() => setDeleteTarget(p.id)}
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
            {t('common.showing')} <span className="font-bold text-zinc-900 dark:text-zinc-100">{Math.min((currentPage - 1) * itemsPerPage + 1, total)}</span> {t('common.to')} <span className="font-bold text-zinc-900 dark:text-zinc-100">{Math.min(currentPage * itemsPerPage, total)}</span> {t('common.of')} <span className="font-bold text-zinc-900 dark:text-zinc-100">{total}</span> {t('common.results')}
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
            onClick={() => { setShowCreateModal(false); setFormPeriodStart(''); setFormPeriodEnd(''); setCalculation(null); }}
          />
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-zinc-100 dark:border-zinc-800">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-xl font-bold dark:text-zinc-100">{t('payouts.modal.createTitle')}</h3>
              <button onClick={() => { setShowCreateModal(false); setFormPeriodStart(''); setFormPeriodEnd(''); setCalculation(null); }} className="text-zinc-400 hover:text-zinc-900">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>{t('payouts.form.tutor')}</Label>
                <Select
                  value={newTutorId}
                  onChange={(value) => setNewTutorId(value)}
                  className="w-full"
                  placeholder={t('payouts.form.selectTutor')}
                  options={tutors.map(t_item => ({ value: t_item.id, label: t_item.name }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t('payouts.periodStart')}</Label>
                  <Input type="date" value={formPeriodStart} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormPeriodStart(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('payouts.periodEnd')}</Label>
                  <Input type="date" value={formPeriodEnd} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormPeriodEnd(e.target.value)} />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCalculate}
                disabled={!newTutorId || !formPeriodStart || !formPeriodEnd || calculatePayout.isPending}
                className="w-full justify-center"
              >
                {calculatePayout.isPending ? t('payouts.calculating') : t('payouts.calculate')}
              </Button>
              {calculation && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 space-y-2">
                  <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    {t('payouts.sessionBreakdown')} — {t('payouts.sessionsCount', { count: calculation.total_sessions })}
                  </p>
                  {calculation.sessions.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {calculation.sessions.map((s) => (
                        <div key={s.session_id} className="flex items-center justify-between text-xs text-zinc-500">
                          <span>{formatDate(s.date, i18n.language)} — {s.class_name}</span>
                          <span className="font-mono">{formatCurrency(s.tutor_fee_amount, i18n.language)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">{t('payouts.noSessions')}</p>
                  )}
                </div>
              )}
              {calculation?.overlap_warning && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    {calculation.overlap_warning}
                  </p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>{t('payouts.form.amount')}</Label>
                <Input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('payouts.form.date')}</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('payouts.form.description')}</Label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={t('payouts.form.descriptionPlaceholder')}
                />
              </div>
            </div>
            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex gap-3">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => { setShowCreateModal(false); setFormPeriodStart(''); setFormPeriodEnd(''); setCalculation(null); }}>{t('common.cancel')}</Button>
              <Button className="flex-1 justify-center" onClick={handleCreatePayout} disabled={createPayout.isPending}>
                {createPayout.isPending ? t('payouts.modal.creating') : t('payouts.modal.createPayout')}
              </Button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('payouts.confirm.deleteTitle', 'Delete Payout')}
        description={t('payouts.confirm.deletePayout')}
        confirmLabel={t('common.delete', 'Delete')}
        cancelLabel={t('common.cancel', 'Cancel')}
        isLoading={deletePayout.isPending}
      />
    </div>
  );
};
