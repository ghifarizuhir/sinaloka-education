import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, Filter, Download, MoreVertical,
  Trash2, Receipt, Calendar, Tag, CreditCard,
  RefreshCcw, TrendingDown, AlertCircle, CheckCircle2,
  FileText, ExternalLink, Upload
} from 'lucide-react';
import { Card, Button, Badge, Input, Label, Switch, Drawer, Skeleton } from '../../components/UI';
import { cn, formatDate, formatCurrency } from '../../lib/utils';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/src/hooks/useExpenses';
import { toast } from 'sonner';
import type { ExpenseCategory, CreateExpenseDto, UpdateExpenseDto } from '@/src/types/expense';

const EXPENSE_CATEGORIES: ExpenseCategory[] = ['RENT', 'UTILITIES', 'SUPPLIES', 'MARKETING', 'OTHER'];


export const OperatingExpenses = () => {
  const { t, i18n } = useTranslation();
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Form state
  const [formAmount, setFormAmount] = useState(0);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('OTHER');
  const [formDescription, setFormDescription] = useState('');

  const itemsPerPage = 20;

  const { data: expensesData, isLoading } = useExpenses({
    page: currentPage,
    limit: itemsPerPage,
    ...(filterCategory !== 'all' ? { category: filterCategory } : {}),
  });

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const expenses = expensesData?.data ?? [];
  const total = expensesData?.meta?.total ?? 0;

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const handleAddExpense = () => {
    setSelectedExpenseId(null);
    setFormAmount(0);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCategory('OTHER');
    setFormDescription('');
    setIsRecurring(false);
    setShowDrawer(true);
  };

  const handleEditExpense = (expenseId: string) => {
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;
    setSelectedExpenseId(expenseId);
    setFormAmount(Number(expense.amount));
    setFormDate(expense.date);
    setFormCategory(expense.category);
    setFormDescription(expense.description ?? '');
    setIsRecurring(false);
    setShowDrawer(true);
  };

  const handleDeleteExpense = (id: string) => {
    if (!confirm(t('expenses.confirm.deleteExpense'))) return;
    deleteExpense.mutate(id, {
      onSuccess: () => toast.success(t('expenses.toast.deleted')),
      onError: () => toast.error(t('expenses.toast.deleteError')),
    });
  };

  const handleSave = () => {
    if (!formAmount || !formDate) {
      toast.error(t('expenses.toast.fillRequired'));
      return;
    }

    if (selectedExpenseId) {
      const dto: UpdateExpenseDto = {
        amount: formAmount,
        date: formDate,
        category: formCategory,
        description: formDescription || undefined,
      };
      updateExpense.mutate(
        { id: selectedExpenseId, data: dto },
        {
          onSuccess: () => {
            toast.success(t('expenses.toast.updated'));
            setShowDrawer(false);
          },
          onError: () => toast.error(t('expenses.toast.updateError')),
        }
      );
    } else {
      const dto: CreateExpenseDto = {
        amount: formAmount,
        date: formDate,
        category: formCategory,
        description: formDescription || undefined,
      };
      createExpense.mutate(dto, {
        onSuccess: () => {
          toast.success(t('expenses.toast.created'));
          setShowDrawer(false);
        },
        onError: () => toast.error(t('expenses.toast.createError')),
      });
    }
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Card className="p-6 space-y-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight dark:text-zinc-100">{t('expenses.title')}</h2>
          <p className="text-zinc-500 text-sm">{t('expenses.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download size={16} />
            {t('common.export')}
          </Button>
          <Button onClick={handleAddExpense} className="gap-2">
            <Plus size={16} />
            {t('expenses.recordExpense')}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-zinc-900 dark:border-l-zinc-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400">
              <TrendingDown size={18} />
            </div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('expenses.totalExpensesPage')}</p>
          </div>
          <p className="text-2xl font-bold dark:text-zinc-100">{formatCurrency(totalExpenses, i18n.language)}</p>
          <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
            <AlertCircle size={10} className="text-amber-500" />
            {total} {t('finance.recordsTotal')}
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
              <RefreshCcw size={18} />
            </div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('expenses.categories')}</p>
          </div>
          <p className="text-2xl font-bold dark:text-zinc-100">{EXPENSE_CATEGORIES.length}</p>
          <p className="text-[10px] text-zinc-500 mt-1">{t('expenses.activeExpenseCategories')}</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('expenses.recordsShown')}</p>
          </div>
          <p className="text-2xl font-bold dark:text-zinc-100">{expenses.length}</p>
          <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: total > 0 ? `${(expenses.length / total) * 100}%` : '0%' }}></div>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-50/30 dark:bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <Input placeholder={t('expenses.searchPlaceholder')} className="pl-10 w-64" />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value as any); setCurrentPage(1); }}
              className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:text-zinc-100"
            >
              <option value="all">{t('common.allCategories')}</option>
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{t(`expenses.categoryLabel.${cat}`)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter size={14} />
              {t('common.filters')}
            </Button>
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('expenses.table.dateId')}</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('expenses.table.category')}</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('expenses.table.description')}</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">{t('expenses.table.amount')}</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">{t('expenses.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 text-sm">
                  {t('expenses.noExpensesFound')}
                </td>
              </tr>
            ) : expenses.map((e) => (
              <tr key={e.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium dark:text-zinc-200">{formatDate(e.date, i18n.language)}</span>
                    <span className="text-[10px] font-mono text-zinc-400">{e.id.slice(0, 8)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant="outline" className="bg-zinc-50 dark:bg-zinc-800/50">
                    {t(`expenses.categoryLabel.${e.category}`)}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm dark:text-zinc-300">{e.description ?? '-'}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm font-bold dark:text-zinc-200">{formatCurrency(Number(e.amount), i18n.language)}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {e.receipt_url && (
                      <a href={e.receipt_url} target="_blank" rel="noopener noreferrer" className="p-2 text-zinc-400 hover:text-indigo-600 transition-colors inline-flex" title={t('expenses.form.viewReceipt')}>
                        <Receipt size={18} />
                      </a>
                    )}
                    <button
                      onClick={() => handleEditExpense(e.id)}
                      className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                    >
                      <FileText size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteExpense(e.id)}
                      className="p-2 text-zinc-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {total > itemsPerPage && (
          <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              {t('common.showing')} <span className="font-bold text-zinc-900 dark:text-zinc-100">{(currentPage - 1) * itemsPerPage + 1}</span> {t('common.to')} <span className="font-bold text-zinc-900 dark:text-zinc-100">{Math.min(currentPage * itemsPerPage, total)}</span> {t('common.of')} <span className="font-bold text-zinc-900 dark:text-zinc-100">{total}</span> {t('common.results')}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                {t('common.prev')}
              </Button>
              <span className="text-xs text-zinc-500">{currentPage} / {Math.ceil(total / itemsPerPage)}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= Math.ceil(total / itemsPerPage)}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                {t('common.next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Drawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={selectedExpenseId ? t('expenses.drawer.editTitle') : t('expenses.drawer.createTitle')}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('expenses.form.expenseAmount')}</Label>
              <Input
                type="number"
                placeholder="0"
                value={formAmount}
                onChange={(e) => setFormAmount(Number(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('expenses.form.date')}</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('expenses.form.category')}</Label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:text-zinc-100"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{t(`expenses.categoryLabel.${cat}`)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('expenses.form.description')}</Label>
              <textarea
                rows={3}
                className="w-full px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:text-zinc-100 text-sm"
                placeholder={t('expenses.form.descriptionPlaceholder')}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCcw size={16} className="text-zinc-400" />
                  <span className="text-xs font-medium dark:text-zinc-300">{t('expenses.form.recurringExpense')}</span>
                </div>
                <Switch checked={isRecurring} onChange={setIsRecurring} />
              </div>
              {isRecurring && (
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <Label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-2 block">{t('expenses.form.frequency')}</Label>
                  <div className="flex gap-2">
                    {[
                      { key: 'Monthly', label: t('expenses.form.monthly') },
                      { key: 'Quarterly', label: t('expenses.form.quarterly') },
                      { key: 'Yearly', label: t('expenses.form.yearly') },
                    ].map(freq => (
                      <button key={freq.key} className="flex-1 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                        {freq.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>{t('expenses.form.receiptInvoice')}</Label>
              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-2 hover:border-zinc-400 transition-colors cursor-pointer">
                <Upload size={24} className="text-zinc-400" />
                <p className="text-xs text-zinc-500">{t('expenses.form.uploadProof')}</p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex gap-3">
            <Button variant="outline" className="flex-1 justify-center" onClick={() => setShowDrawer(false)}>{t('common.cancel')}</Button>
            <Button
              className="flex-1 justify-center"
              onClick={handleSave}
              disabled={createExpense.isPending || updateExpense.isPending}
            >
              {createExpense.isPending || updateExpense.isPending
                ? t('common.saving')
                : selectedExpenseId ? t('expenses.drawer.updateExpense') : t('expenses.drawer.saveExpense')
              }
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};
