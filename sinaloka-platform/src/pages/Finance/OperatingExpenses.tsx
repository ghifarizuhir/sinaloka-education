import React, { useState } from 'react';
import {
  Plus, Search, Filter, Download, MoreVertical,
  Trash2, Receipt, Calendar, Tag, CreditCard,
  RefreshCcw, TrendingDown, AlertCircle, CheckCircle2,
  FileText, ExternalLink, Upload
} from 'lucide-react';
import { Card, Button, Badge, Input, Label, Switch, Drawer, Skeleton } from '../../components/UI';
import { cn } from '../../lib/utils';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/src/hooks/useExpenses';
import { toast } from 'sonner';
import type { ExpenseCategory, CreateExpenseDto, UpdateExpenseDto } from '@/src/types/expense';

const EXPENSE_CATEGORIES: ExpenseCategory[] = ['RENT', 'UTILITIES', 'SUPPLIES', 'MARKETING', 'OTHER'];

const toTitleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export const OperatingExpenses = () => {
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

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

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
    setFormAmount(expense.amount);
    setFormDate(expense.date);
    setFormCategory(expense.category);
    setFormDescription(expense.description ?? '');
    setIsRecurring(false);
    setShowDrawer(true);
  };

  const handleDeleteExpense = (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    deleteExpense.mutate(id, {
      onSuccess: () => toast.success('Expense deleted.'),
      onError: () => toast.error('Failed to delete expense.'),
    });
  };

  const handleSave = () => {
    if (!formAmount || !formDate) {
      toast.error('Please fill in required fields.');
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
            toast.success('Expense updated.');
            setShowDrawer(false);
          },
          onError: () => toast.error('Failed to update expense.'),
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
          toast.success('Expense recorded.');
          setShowDrawer(false);
        },
        onError: () => toast.error('Failed to record expense.'),
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
          <h2 className="text-2xl font-bold tracking-tight dark:text-zinc-100">Operating Expenses</h2>
          <p className="text-zinc-500 text-sm">Track and manage non-tutor operational costs.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download size={16} />
            Export
          </Button>
          <Button onClick={handleAddExpense} className="gap-2">
            <Plus size={16} />
            Record Expense
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
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Expenses (Page)</p>
          </div>
          <p className="text-2xl font-bold dark:text-zinc-100">Rp {totalExpenses.toLocaleString()}</p>
          <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
            <AlertCircle size={10} className="text-amber-500" />
            {total} records total
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
              <RefreshCcw size={18} />
            </div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Categories</p>
          </div>
          <p className="text-2xl font-bold dark:text-zinc-100">{EXPENSE_CATEGORIES.length}</p>
          <p className="text-[10px] text-zinc-500 mt-1">Active expense categories</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Records Shown</p>
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
              <Input placeholder="Search expenses..." className="pl-10 w-64" />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value as any); setCurrentPage(1); }}
              className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:text-zinc-100"
            >
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{toTitleCase(cat)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter size={14} />
              Filters
            </Button>
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Date / ID</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Category</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Description</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Amount</th>
              <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 text-sm">
                  No expenses found.
                </td>
              </tr>
            ) : expenses.map((e) => (
              <tr key={e.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium dark:text-zinc-200">{e.date}</span>
                    <span className="text-[10px] font-mono text-zinc-400">{e.id.slice(0, 8)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant="outline" className="bg-zinc-50 dark:bg-zinc-800/50">
                    {toTitleCase(e.category)}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm dark:text-zinc-300">{e.description ?? '-'}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm font-bold dark:text-zinc-200">Rp {e.amount.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {e.receipt_url && (
                      <button className="p-2 text-zinc-400 hover:text-indigo-600 transition-colors" title="View Receipt">
                        <Receipt size={18} />
                      </button>
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
      </Card>

      <Drawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={selectedExpenseId ? 'Edit Expense' : 'Record New Expense'}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Expense Amount (Rp)</Label>
              <Input
                type="number"
                placeholder="0"
                value={formAmount}
                onChange={(e) => setFormAmount(Number(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:text-zinc-100"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{toTitleCase(cat)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea
                rows={3}
                className="w-full px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:text-zinc-100 text-sm"
                placeholder="What was this for?"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCcw size={16} className="text-zinc-400" />
                  <span className="text-xs font-medium dark:text-zinc-300">Recurring Expense</span>
                </div>
                <Switch checked={isRecurring} onChange={setIsRecurring} />
              </div>
              {isRecurring && (
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <Label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-2 block">Frequency</Label>
                  <div className="flex gap-2">
                    {['Monthly', 'Quarterly', 'Yearly'].map(freq => (
                      <button key={freq} className="flex-1 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Receipt / Invoice</Label>
              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-2 hover:border-zinc-400 transition-colors cursor-pointer">
                <Upload size={24} className="text-zinc-400" />
                <p className="text-xs text-zinc-500">Upload proof of payment</p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex gap-3">
            <Button variant="outline" className="flex-1 justify-center" onClick={() => setShowDrawer(false)}>Cancel</Button>
            <Button
              className="flex-1 justify-center"
              onClick={handleSave}
              disabled={createExpense.isPending || updateExpense.isPending}
            >
              {createExpense.isPending || updateExpense.isPending
                ? 'Saving...'
                : selectedExpenseId ? 'Update Expense' : 'Save Expense'
              }
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};
