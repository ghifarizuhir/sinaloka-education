import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, CheckCircle2, Eye, AlertCircle, MessageSquare, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Card, Button, Badge, Drawer, Input, Label, SearchInput, Switch, Skeleton } from '../components/UI';
import { cn, formatDate, formatCurrency } from '../lib/utils';
import { toast } from 'sonner';
import { useWhatsappMessages, useWhatsappStats, useWhatsappSettings, useUpdateWhatsappSettings, useSendPaymentReminder } from '@/src/hooks/useWhatsapp';
import { usePayments } from '@/src/hooks/usePayments';

const STATUS_BADGE: Record<string, { variant: 'default' | 'success' | 'warning' | 'error' | 'outline'; className?: string }> = {
  SENT: { variant: 'outline', className: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  DELIVERED: { variant: 'success' },
  READ: { variant: 'outline', className: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' },
  FAILED: { variant: 'error' },
  PENDING: { variant: 'default' },
};

export const WhatsApp = () => {
  const { t, i18n } = useTranslation();

  const [activeTab, setActiveTab] = useState<'messages' | 'paymentReminders' | 'settings'>('messages');
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterRelatedType, setFilterRelatedType] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [settingsAutoReminders, setSettingsAutoReminders] = useState(true);
  const [settingsRemindDays, setSettingsRemindDays] = useState(1);
  const [sendingPaymentId, setSendingPaymentId] = useState<string | null>(null);

  const stats = useWhatsappStats();
  const messages = useWhatsappMessages({
    page,
    limit: 20,
    ...(filterStatus && { status: filterStatus }),
    ...(filterDateFrom && { date_from: filterDateFrom }),
    ...(filterDateTo && { date_to: filterDateTo }),
    ...(filterRelatedType && { related_type: filterRelatedType }),
  });
  const settings = useWhatsappSettings();
  const updateSettings = useUpdateWhatsappSettings();
  const sendReminder = useSendPaymentReminder();
  const payments = usePayments({ limit: 50, search: paymentSearch || undefined });

  useEffect(() => {
    if (settings.data) {
      setSettingsAutoReminders(settings.data.auto_reminders);
      setSettingsRemindDays(settings.data.remind_days_before);
    }
  }, [settings.data]);

  const messagesList = messages.data?.data ?? [];
  const messagesMeta = messages.data?.meta;
  const totalMessages = messagesMeta?.total ?? 0;
  const totalPages = messagesMeta?.totalPages ?? 1;

  const selectedMessage = messagesList.find((m) => m.id === selectedMessageId) ?? null;

  const paymentsList = (payments.data?.data ?? []).filter(
    (p) => p.status === 'PENDING' || p.status === 'OVERDUE'
  );

  const handleSendReminder = (paymentId: string) => {
    setSendingPaymentId(paymentId);
    sendReminder.mutate(paymentId, {
      onSuccess: () => {
        toast.success(t('whatsapp.toast.reminderSent'));
        setSendingPaymentId(null);
      },
      onError: () => {
        toast.error(t('whatsapp.toast.reminderError'));
        setSendingPaymentId(null);
      },
    });
  };

  const handleSaveSettings = () => {
    updateSettings.mutate(
      { auto_reminders: settingsAutoReminders, remind_days_before: settingsRemindDays },
      {
        onSuccess: () => toast.success(t('whatsapp.toast.settingsSaved')),
        onError: () => toast.error(t('whatsapp.toast.settingsError')),
      }
    );
  };

  if (stats.isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Card className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('layout.pageTitle.whatsapp')}</h2>
        <p className="text-zinc-500 text-sm">{t('whatsapp.send.title')}</p>
      </div>

      {/* Not-configured banner */}
      {stats.data?.configured === false && (
        <Card className="p-4 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-amber-600" />
            <p className="text-sm text-amber-900 dark:text-amber-200">{t('whatsapp.notConfigured')}</p>
          </div>
        </Card>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1">
        {(['messages', 'paymentReminders', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            disabled={tab !== 'messages' && stats.data?.configured === false}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              activeTab === tab
                ? 'bg-white dark:bg-zinc-800 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300',
              tab !== 'messages' && stats.data?.configured === false && 'opacity-50 cursor-not-allowed'
            )}
          >
            {t(`whatsapp.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: t('whatsapp.stats.totalSent'), value: stats.data?.total ?? 0, icon: Send, color: 'text-zinc-600 dark:text-zinc-400', bg: 'bg-zinc-50 dark:bg-zinc-800/50' },
              { label: t('whatsapp.stats.delivered'), value: stats.data?.delivered ?? 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { label: t('whatsapp.stats.read'), value: stats.data?.read ?? 0, icon: Eye, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
              { label: t('whatsapp.stats.failed'), value: stats.data?.failed ?? 0, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
            ].map((stat) => (
              <Card key={stat.label} className="p-4 flex items-center gap-4">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stat.bg)}>
                  <stat.icon size={20} className={stat.color} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-xl font-bold dark:text-zinc-100">{stat.value}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="bg-transparent text-xs font-bold px-3 py-1.5 focus:outline-none dark:text-zinc-100"
              >
                <option value="">{t('whatsapp.filter.allStatuses')}</option>
                <option value="PENDING">{t('whatsapp.statusLabel.pending')}</option>
                <option value="SENT">{t('whatsapp.statusLabel.sent')}</option>
                <option value="DELIVERED">{t('whatsapp.statusLabel.delivered')}</option>
                <option value="READ">{t('whatsapp.statusLabel.read')}</option>
                <option value="FAILED">{t('whatsapp.statusLabel.failed')}</option>
              </select>
            </div>
            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
              placeholder={t('whatsapp.filter.dateFrom')}
              className="w-auto"
            />
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
              placeholder={t('whatsapp.filter.dateTo')}
              className="w-auto"
            />
            <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
              <select
                value={filterRelatedType}
                onChange={(e) => { setFilterRelatedType(e.target.value); setPage(1); }}
                className="bg-transparent text-xs font-bold px-3 py-1.5 focus:outline-none dark:text-zinc-100"
              >
                <option value="">{t('whatsapp.filter.allTypes')}</option>
                <option value="payment">{t('whatsapp.typeLabel.payment')}</option>
                <option value="attendance">{t('whatsapp.typeLabel.attendance')}</option>
                <option value="enrollment">{t('whatsapp.typeLabel.enrollment')}</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <Card className="p-0 overflow-hidden relative">
            {messages.isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                      <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('whatsapp.table.recipient')}</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('whatsapp.table.template')}</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('whatsapp.table.status')}</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('whatsapp.table.relatedTo')}</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('whatsapp.table.date')}</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('whatsapp.table.error')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {messagesList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                              <MessageSquare size={32} className="text-zinc-300" />
                            </div>
                            <p className="text-sm text-zinc-500">{t('whatsapp.noMessages')}</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      messagesList.map((msg) => {
                        const badge = STATUS_BADGE[msg.status] ?? { variant: 'default' as const };
                        return (
                          <tr
                            key={msg.id}
                            onClick={() => setSelectedMessageId(msg.id)}
                            className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
                          >
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium dark:text-zinc-200">{msg.phone}</span>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline">{msg.template_name}</Badge>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant={badge.variant} className={badge.className}>{t(`whatsapp.statusLabel.${msg.status.toLowerCase()}`)}</Badge>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-zinc-500">{msg.related_type ? t(`whatsapp.typeLabel.${msg.related_type}`) : '—'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-zinc-500 dark:text-zinc-400">{formatDate(msg.created_at, i18n.language)}</span>
                            </td>
                            <td className="px-6 py-4">
                              {msg.error ? (
                                <span className="text-xs text-rose-500 truncate max-w-[200px] block">{msg.error}</span>
                              ) : (
                                <span className="text-xs text-zinc-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalMessages > 0 && (
              <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/30">
                <p className="text-xs text-zinc-500">
                  {t('common.showing')}{' '}
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{Math.min((page - 1) * 20 + 1, totalMessages)}</span>{' '}
                  {t('common.to')}{' '}
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{Math.min(page * 20, totalMessages)}</span>{' '}
                  {t('common.of')}{' '}
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{totalMessages}</span>{' '}
                  {t('common.results')}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((prev) => prev - 1)}
                    className="p-1.5 disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i + 1)}
                        className={cn(
                          'w-8 h-8 text-xs font-bold rounded-lg transition-all',
                          page === i + 1
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500'
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={page === totalPages || totalPages === 0}
                    onClick={() => setPage((prev) => prev + 1)}
                    className="p-1.5 disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Message Detail Drawer */}
          <Drawer isOpen={!!selectedMessageId} onClose={() => setSelectedMessageId(null)} title={t('whatsapp.drawer.title')}>
            {selectedMessage && (
              <div className="space-y-6">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{t('whatsapp.drawer.phone')}</p>
                  <p className="text-sm font-bold dark:text-zinc-200">{selectedMessage.phone}</p>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{t('whatsapp.drawer.templateName')}</p>
                  <Badge variant="outline">{selectedMessage.template_name}</Badge>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{t('whatsapp.drawer.currentStatus')}</p>
                  {(() => {
                    const badge = STATUS_BADGE[selectedMessage.status] ?? { variant: 'default' as const };
                    return <Badge variant={badge.variant} className={badge.className}>{t(`whatsapp.statusLabel.${selectedMessage.status.toLowerCase()}`)}</Badge>;
                  })()}
                </div>

                {selectedMessage.template_params.length > 0 && (
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">{t('whatsapp.drawer.templateParams')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMessage.template_params.map((param, idx) => (
                        <span key={idx} className="px-2 py-1 rounded-md bg-zinc-200 dark:bg-zinc-700 text-xs font-medium dark:text-zinc-300">
                          {String(param)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedMessage.error && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-200 dark:border-rose-800">
                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">{t('whatsapp.drawer.errorDetails')}</p>
                    <p className="text-sm text-rose-600 dark:text-rose-400">{selectedMessage.error}</p>
                  </div>
                )}

                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{t('whatsapp.drawer.retryCount')}</p>
                  <p className="text-sm font-bold dark:text-zinc-200">{selectedMessage.retry_count}</p>
                </div>

                {selectedMessage.related_type && (
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{t('whatsapp.drawer.relatedEntity')}</p>
                    <p className="text-sm dark:text-zinc-200">
                      {t(`whatsapp.typeLabel.${selectedMessage.related_type}`)}
                      {selectedMessage.related_id && (
                        <span className="text-xs text-zinc-400 ml-2 font-mono">{selectedMessage.related_id.slice(0, 8)}</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Drawer>
        </>
      )}

      {/* Payment Reminders Tab */}
      {activeTab === 'paymentReminders' && (
        <div className="space-y-4">
          <SearchInput
            placeholder={t('whatsapp.send.searchPlaceholder')}
            className="w-full sm:max-w-xs"
            value={paymentSearch}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentSearch(e.target.value)}
          />

          {payments.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : paymentsList.length === 0 ? (
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                  <Send size={24} className="text-zinc-300" />
                </div>
                <p className="text-sm text-zinc-500">{t('whatsapp.send.noPayments')}</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3 scrollbar-thin">
              {paymentsList.map((payment) => {
                const hasPhone = !!payment.student?.name;
                return (
                  <Card key={payment.id} className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold dark:text-zinc-200 truncate">{payment.student?.name ?? payment.student_id}</span>
                          <Badge variant={payment.status === 'OVERDUE' ? 'error' : 'warning'}>{payment.status}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          <span className="font-bold">{formatCurrency(payment.amount, i18n.language)}</span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {payment.due_date}
                          </span>
                          {payment.enrollment?.class?.name && (
                            <span>{payment.enrollment.class.name}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        className="gap-1.5 shrink-0"
                        disabled={sendingPaymentId === payment.id}
                        onClick={() => handleSendReminder(payment.id)}
                      >
                        <Send size={14} />
                        {sendingPaymentId === payment.id ? t('common.processing') : t('whatsapp.send.sendReminder')}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-6 dark:text-zinc-100">{t('whatsapp.settings.title')}</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <div>
                <Label className="text-sm font-bold">{t('whatsapp.settings.autoReminders')}</Label>
                <p className="text-xs text-zinc-500 mt-1">{t('whatsapp.settings.autoRemindersDesc')}</p>
              </div>
              <Switch checked={settingsAutoReminders} onChange={setSettingsAutoReminders} />
            </div>

            <div className="space-y-2">
              <Label>{t('whatsapp.settings.remindDaysBefore')}</Label>
              <p className="text-xs text-zinc-500">{t('whatsapp.settings.remindDaysBeforeDesc')}</p>
              <Input
                type="number"
                min={1}
                max={7}
                value={settingsRemindDays}
                onChange={(e) => setSettingsRemindDays(Number(e.target.value))}
                disabled={!settingsAutoReminders}
                className="w-32"
              />
            </div>

            <Button
              onClick={handleSaveSettings}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? t('common.saving') : t('whatsapp.settings.save')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
