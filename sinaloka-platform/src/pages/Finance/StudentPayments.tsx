import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  Filter, DollarSign, History, ChevronLeft, ChevronRight,
  Send, Receipt, AlertCircle, TrendingUp, Download,
  MoreVertical, CheckCircle2, Clock, Trash2, Mail,
  FileText, FileDown
} from 'lucide-react';
import { Card, Button, Badge, Input, Label, Checkbox, Drawer, Skeleton } from '../../components/UI';
import { cn, formatDate, formatCurrency } from '../../lib/utils';
import { usePayments, useUpdatePayment, useDeletePayment, useGenerateInvoice, useOverdueSummary } from '@/src/hooks/usePayments';
import { toast } from 'sonner';
import type { Payment, UpdatePaymentDto } from '@/src/types/payment';

export const StudentPayments = () => {
  const { t, i18n } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [filterStatus, setFilterStatus] = useState<'PAID' | 'PENDING' | 'OVERDUE' | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'OTHER'>('TRANSFER');
  const [sendReceipt, setSendReceipt] = useState(true);

  const itemsPerPage = 10;

  const { data: paymentsData, isLoading } = usePayments({
    page: currentPage,
    limit: itemsPerPage,
    ...(filterStatus !== 'all' ? { status: filterStatus } : {}),
  });

  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();
  const generateInvoice = useGenerateInvoice();
  const { data: overdueSummary } = useOverdueSummary();

  const payments = paymentsData?.data ?? [];
  const total = paymentsData?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / itemsPerPage);

  const handleRecordPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setPaymentAmount(Number(payment.amount));
    setDiscount(0);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('TRANSFER');
    setShowModal(true);
  };

  const handleViewLedger = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowLedger(true);
  };

  const handleSavePayment = () => {
    if (!selectedPayment) return;
    const updateDto: UpdatePaymentDto = {
      status: 'PAID',
      paid_date: paymentDate,
      method: paymentMethod,
      notes: discount > 0 ? `Discount applied: ${formatCurrency(discount, i18n.language)}` : 'Payment recorded',
    };
    updatePayment.mutate(
      { id: selectedPayment.id, data: updateDto },
      {
        onSuccess: () => {
          toast.success(t('payments.toast.recorded'));
          setShowModal(false);
        },
        onError: () => {
          toast.error(t('payments.toast.recordError'));
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm(t('payments.confirm.deletePayment'))) return;
    deletePayment.mutate(id, {
      onSuccess: () => toast.success(t('payments.toast.deleted')),
      onError: () => toast.error(t('payments.toast.deleteError')),
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getAging = (dueDate: string, status: string) => {
    if (status === 'PAID') return null;
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = now.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return null;
    return diffDays;
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Card className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('payments.title')}</h2>
          <p className="text-zinc-500 text-sm">{t('payments.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <Button variant="primary" className="gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={() => toast.info(t('common.comingSoon'))}>
              <CheckCircle2 size={16} />
              {t('payments.recordBatch', { count: selectedIds.length })}
            </Button>
          )}
          <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as any); setCurrentPage(1); }}
              className="bg-transparent text-xs font-bold px-3 py-1.5 focus:outline-none dark:text-zinc-100"
            >
              <option value="all">{t('common.allStatuses')}</option>
              <option value="PAID">{t('common.paid')}</option>
              <option value="PENDING">{t('common.pending')}</option>
              <option value="OVERDUE">{t('common.overdue')}</option>
            </select>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => toast.info(t('common.comingSoon'))}>
            <TrendingUp size={16} />
            {t('payments.revenueAnalytics')}
          </Button>
        </div>
      </div>

      {/* Aging Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: t('payments.totalRecords'), value: total.toString(), color: 'text-zinc-900 dark:text-zinc-100' },
          { label: t('payments.overdueCount'), value: (overdueSummary?.overdue_count ?? 0).toString(), color: 'text-orange-600' },
          { label: t('payments.overdueAmount'), value: overdueSummary ? formatCurrency(overdueSummary.total_overdue_amount, i18n.language) : '-', color: 'text-rose-600' },
          { label: t('payments.flaggedStudents'), value: (overdueSummary?.flagged_students?.length ?? 0).toString(), color: 'text-amber-600' },
        ].map((stat, i) => (
          <Card key={i} className="p-4">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{stat.label}</p>
            <p className={cn("text-xl font-bold mt-1", stat.color)}>{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden relative">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
              <th className="px-6 py-3 w-10">
                <Checkbox
                  checked={selectedIds.length === payments.length && payments.length > 0}
                  onChange={(checked) => {
                    if (checked) setSelectedIds(payments.map(p => p.id));
                    else setSelectedIds([]);
                  }}
                />
              </th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('payments.table.invoiceStudent')}</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('payments.table.class')}</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('payments.table.dueDate')}</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('payments.table.amount')}</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('payments.table.status')}</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">{t('payments.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-zinc-400 text-sm">
                  {t('payments.noPaymentsFound')}
                </td>
              </tr>
            ) : payments.map((p) => {
              const aging = getAging(p.due_date, p.status);
              return (
                <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group">
                  <td className="px-6 py-4">
                    <Checkbox
                      checked={selectedIds.includes(p.id)}
                      onChange={() => toggleSelect(p.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-zinc-400">{p.id.slice(0, 8)}</span>
                        <span className="text-sm font-medium dark:text-zinc-200">{p.student?.name ?? p.student_id}</span>
                        {p.notes?.startsWith('Auto:') && (
                          <Badge variant="outline" className="text-[9px] ml-2">Auto</Badge>
                        )}
                        {p.invoice_number && (
                          <Badge variant="outline" className="text-[9px] ml-1">{p.invoice_number}</Badge>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] text-zinc-400">{p.enrollment?.class?.name ?? '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm dark:text-zinc-400">{formatDate(p.due_date, i18n.language)}</span>
                      {aging && (
                        <span className="text-[10px] text-rose-500 font-bold uppercase">
                          {t('payments.daysOverdue', { count: aging })}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold dark:text-zinc-300">{formatCurrency(Number(p.amount), i18n.language)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={
                      p.status === 'PAID' ? 'success' :
                      p.status === 'OVERDUE' ? 'error' : 'warning'
                    }>
                      {p.status === 'PAID' ? t('common.paid') : p.status === 'OVERDUE' ? t('common.overdue') : t('common.pending')}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {p.status !== 'PAID' && (
                        <>
                          <button
                            onClick={() => handleRecordPayment(p)}
                            className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                            title={t('payments.tooltip.recordPayment')}
                          >
                            <DollarSign size={18} />
                          </button>
                          <button
                            onClick={() => toast.info(t('common.comingSoon'))}
                            className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                            title={t('payments.tooltip.sendReminder')}
                          >
                            <Send size={18} />
                          </button>
                        </>
                      )}
                      {p.invoice_url ? (
                        <button
                          title={t('payments.downloadInvoice')}
                          onClick={(e) => { e.stopPropagation(); window.open(`${import.meta.env.VITE_API_URL}/api/uploads/${p.invoice_url}`, '_blank'); }}
                          className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                          <FileDown size={16} />
                        </button>
                      ) : (
                        <button
                          title={t('payments.generateInvoice')}
                          onClick={(e) => { e.stopPropagation(); generateInvoice.mutate(p.id, {
                            onSuccess: () => toast.success(t('payments.invoiceGenerated')),
                            onError: (err: any) => toast.error(err?.response?.data?.message || t('payments.invoiceExists')),
                          }); }}
                          className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                          <FileText size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleViewLedger(p)}
                        className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                        title={t('payments.tooltip.viewDetails')}
                      >
                        <History size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                        title={t('payments.tooltip.delete')}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
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

      {/* Record Payment Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !updatePayment.isPending && setShowModal(false)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-zinc-100 dark:border-zinc-800"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold dark:text-zinc-100">{t('payments.modal.recordTitle')}</h3>
                  <p className="text-xs text-zinc-500 mt-1">{selectedPayment?.student?.name ?? selectedPayment?.student_id}</p>
                </div>
                <Badge variant="outline">
                  {selectedPayment?.status === 'PAID' ? t('common.paid') : selectedPayment?.status === 'OVERDUE' ? t('common.overdue') : t('common.pending')}
                </Badge>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('payments.modal.amountDue')}</p>
                    <p className="text-lg font-bold text-rose-600">{formatCurrency(Number(selectedPayment?.amount ?? 0), i18n.language)}</p>
                  </div>
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/20">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{t('payments.modal.afterDiscount')}</p>
                    <p className="text-lg font-bold text-indigo-600">
                      {formatCurrency(Math.max(0, Number(selectedPayment?.amount ?? 0) - discount), i18n.language)}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t('payments.form.paymentAmount')}</Label>
                      <Input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('payments.form.discount')}</Label>
                      <Input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t('payments.form.date')}</Label>
                      <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('payments.form.method')}</Label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'TRANSFER' | 'OTHER')}
                        className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:text-zinc-100"
                      >
                        <option value="TRANSFER">{t('payments.form.bankTransfer')}</option>
                        <option value="CASH">{t('payments.form.cash')}</option>
                        <option value="OTHER">{t('payments.form.eWallet')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-zinc-400" />
                      <span className="text-xs font-medium dark:text-zinc-300">{t('payments.form.sendReceipt')}</span>
                    </div>
                    <Checkbox checked={sendReceipt} onChange={setSendReceipt} />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                <Button variant="outline" className="flex-1 justify-center" onClick={() => setShowModal(false)} disabled={updatePayment.isPending}>{t('common.cancel')}</Button>
                <Button className="flex-1 justify-center" onClick={handleSavePayment} disabled={updatePayment.isPending}>
                  {updatePayment.isPending ? t('common.processing') : t('payments.modal.confirmPayment')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ledger Drawer */}
      <Drawer
        isOpen={showLedger}
        onClose={() => setShowLedger(false)}
        title={t('payments.drawer.title')}
      >
        {selectedPayment && (
          <div className="space-y-6">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold dark:text-zinc-100">{selectedPayment.student?.name ?? selectedPayment.student_id}</h4>
                  <p className="text-xs text-zinc-500">{selectedPayment.enrollment?.class?.name ?? '-'}</p>
                </div>
                <Badge variant={selectedPayment.status === 'PAID' ? 'success' : 'warning'}>
                  {selectedPayment.status === 'PAID' ? t('common.paid') : selectedPayment.status === 'OVERDUE' ? t('common.overdue') : t('common.pending')}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('payments.drawer.amount')}</p>
                  <p className="text-sm font-bold dark:text-zinc-200">{formatCurrency(Number(selectedPayment.amount), i18n.language)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('payments.drawer.dueDate')}</p>
                  <p className="text-sm font-bold dark:text-zinc-200">{formatDate(selectedPayment.due_date, i18n.language)}</p>
                </div>
                {selectedPayment.paid_date && (
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('payments.drawer.paidDate')}</p>
                    <p className="text-sm font-bold text-emerald-600">{formatDate(selectedPayment.paid_date, i18n.language)}</p>
                  </div>
                )}
                {selectedPayment.method && (
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('payments.drawer.method')}</p>
                    <p className="text-sm font-bold dark:text-zinc-200">{selectedPayment.method}</p>
                  </div>
                )}
              </div>
              {selectedPayment?.invoice_number && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">{t('payments.invoiceNumber')}</span>
                  <span className="text-sm font-medium">{selectedPayment.invoice_number}</span>
                </div>
              )}
              {selectedPayment.notes && (
                <p className="text-xs text-zinc-500 mt-3 italic">"{selectedPayment.notes}"</p>
              )}
            </div>

            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-3">
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 gap-2 text-xs" onClick={() => toast.info(t('common.comingSoon'))}>
                  <Download size={14} />
                  {t('payments.drawer.exportPdf')}
                </Button>
                <Button variant="outline" className="flex-1 gap-2 text-xs" onClick={() => toast.info(t('common.comingSoon'))}>
                  <Receipt size={14} />
                  {t('payments.drawer.resendReceipt')}
                </Button>
              </div>
              {selectedPayment?.invoice_url ? (
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2"
                  onClick={() => window.open(`${import.meta.env.VITE_API_URL}/api/uploads/${selectedPayment.invoice_url}`, '_blank')}
                >
                  <FileDown size={16} />
                  {t('payments.downloadInvoice')}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2"
                  onClick={() => {
                    generateInvoice.mutate(selectedPayment!.id, {
                      onSuccess: () => toast.success(t('payments.invoiceGenerated')),
                      onError: (err: any) => toast.error(err?.response?.data?.message || t('payments.invoiceExists')),
                    });
                  }}
                  disabled={generateInvoice.isPending}
                >
                  <FileText size={16} />
                  {generateInvoice.isPending ? t('payments.generatingInvoice') : t('payments.generateInvoice')}
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
