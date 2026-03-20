import React, { useState, useRef } from 'react';
import {
  Card, Button, Input, Badge, Skeleton, ConfirmChangesModal
} from '../../../components/UI';
import type { FieldChange } from '../../../components/UI';
import {
  Building2, Save, Trash2,
  Plus, X, Tag
} from 'lucide-react';
import { collectChanges, detectArrayChange } from '../../../lib/change-detection';
import { toast } from 'sonner';
import type { SettingsPageState } from '../useSettingsPage';

type BillingTabProps = Pick<SettingsPageState,
  't' | 'isLoadingBilling' | 'updateBilling' |
  'formExpenseCategories' | 'newCategoryInput' | 'setNewCategoryInput' |
  'handleSaveBilling' | 'handleAddCategory' | 'handleRemoveCategory' |
  'formBankAccounts' | 'showAddBankForm' | 'setShowAddBankForm' |
  'newBankName' | 'setNewBankName' | 'newBankAccount' | 'setNewBankAccount' |
  'newBankHolder' | 'setNewBankHolder' |
  'handleAddBankAccount' | 'handleRemoveBankAccount'
>;

export const BillingTab = ({
  t, isLoadingBilling, updateBilling,
  formExpenseCategories, newCategoryInput, setNewCategoryInput,
  handleSaveBilling, handleAddCategory, handleRemoveCategory,
  formBankAccounts, showAddBankForm, setShowAddBankForm,
  newBankName, setNewBankName, newBankAccount, setNewBankAccount,
  newBankHolder, setNewBankHolder,
  handleAddBankAccount, handleRemoveBankAccount,
}: BillingTabProps) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<FieldChange[]>([]);
  const initialRef = useRef<{ categories: string[]; bankAccounts: string[] } | null>(null);

  if (!isLoadingBilling && !initialRef.current) {
    initialRef.current = {
      categories: [...formExpenseCategories],
      bankAccounts: formBankAccounts.map(a => `${a.bank_name} - ${a.account_number}`),
    };
  }

  const handleSaveClick = () => {
    if (!initialRef.current) return;
    const changes = collectChanges(
      detectArrayChange('Kategori Pengeluaran', initialRef.current.categories, formExpenseCategories),
      detectArrayChange(
        'Rekening Bank',
        initialRef.current.bankAccounts,
        formBankAccounts.map(a => `${a.bank_name} - ${a.account_number}`),
      ),
    );
    if (changes.length === 0) {
      toast.info('Tidak ada perubahan');
      return;
    }
    setPendingChanges(changes);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    handleSaveBilling();
    setShowConfirm(false);
    initialRef.current = {
      categories: [...formExpenseCategories],
      bankAccounts: formBankAccounts.map(a => `${a.bank_name} - ${a.account_number}`),
    };
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold dark:text-zinc-100 flex items-center gap-2">
            <Tag size={20} className="text-zinc-400" />
            {t('settings.billing.expenseCategories')}
          </h3>
        </div>
        {isLoadingBilling ? (
          <div className="space-y-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {formExpenseCategories.map(cat => (
                <Badge key={cat} variant="default" className="gap-1 pr-1">
                  {cat}
                  <X size={10} className="cursor-pointer" onClick={() => handleRemoveCategory(cat)} />
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Input
                placeholder={t('settings.billing.addCategoryPlaceholder')}
                value={newCategoryInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategoryInput(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleAddCategory()}
                className="max-w-xs"
              />
              <Button variant="outline" size="sm" onClick={handleAddCategory}>
                <Plus size={14} />
                {t('settings.billing.addCategory')}
              </Button>
            </div>
            <p className="text-[10px] text-zinc-500 mt-4 italic">{t('settings.billing.categoriesNote')}</p>
          </>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold dark:text-zinc-100 flex items-center gap-2">
            <Building2 size={20} className="text-zinc-400" />
            {t('settings.billing.bankAccounts')}
          </h3>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowAddBankForm(!showAddBankForm)}>
            <Plus size={14} />
            {t('settings.billing.addAccount')}
          </Button>
        </div>
        {isLoadingBilling ? (
          <div className="space-y-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {formBankAccounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs">
                      {acc.bank_name}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{acc.account_number}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{acc.account_holder}</p>
                    </div>
                  </div>
                  <button className="text-zinc-400 hover:text-rose-600 transition-colors" onClick={() => handleRemoveBankAccount(acc.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            {showAddBankForm && (
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3 mt-3">
                <div className="grid grid-cols-3 gap-3">
                  <Input placeholder={t('settings.billing.bankNamePlaceholder')} value={newBankName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBankName(e.target.value)} />
                  <Input placeholder={t('settings.billing.accountNumberPlaceholder')} value={newBankAccount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBankAccount(e.target.value)} />
                  <Input placeholder={t('settings.billing.accountHolderPlaceholder')} value={newBankHolder} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBankHolder(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddBankAccount}>{t('settings.billing.addBankAccount')}</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddBankForm(false)}>{t('common.cancel')}</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <div className="flex justify-end">
        <Button className="gap-2" onClick={handleSaveClick} disabled={updateBilling.isPending}>
          <Save size={16} />
          {updateBilling.isPending ? t('common.saving') : t('common.saveChanges')}
        </Button>
      </div>

      <ConfirmChangesModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        changes={pendingChanges}
        isLoading={updateBilling.isPending}
      />
    </div>
  );
};
