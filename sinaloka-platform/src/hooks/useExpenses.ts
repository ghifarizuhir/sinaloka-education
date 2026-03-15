import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesService } from '@/src/services/expenses.service';
import type { ExpenseQueryParams } from '@/src/types/expense';

export function useExpenses(params?: ExpenseQueryParams) {
  return useQuery({ queryKey: ['expenses', params], queryFn: () => expensesService.getAll(params) });
}
export function useExpense(id: string) {
  return useQuery({ queryKey: ['expenses', id], queryFn: () => expensesService.getById(id), enabled: !!id });
}
export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: expensesService.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] }); } });
}
export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: expensesService.update, onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] }); } });
}
export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: expensesService.remove, onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] }); } });
}
