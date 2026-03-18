import React from 'react';
import {
  Card, Button, Input, Label, Switch, Badge, Skeleton
} from '../../../components/UI';
import {
  CreditCard, Building2, Save, Trash2,
  Plus, CheckCircle2, X, Tag
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { SettingsPageState } from '../useSettingsPage';

type BillingTabProps = Pick<SettingsPageState,
  't' | 'isLoadingBilling' | 'updateBilling' |
  'formBillingMode' | 'setFormBillingMode' |
  'formCurrency' | 'setFormCurrency' |
  'formInvoicePrefix' | 'setFormInvoicePrefix' |
  'formLatePaymentAutoLock' | 'setFormLatePaymentAutoLock' |
  'formLatePaymentThreshold' | 'setFormLatePaymentThreshold' |
  'formExpenseCategories' | 'newCategoryInput' | 'setNewCategoryInput' |
  'handleSaveBilling' | 'handleAddCategory' | 'handleRemoveCategory' |
  'formBankAccounts' | 'showAddBankForm' | 'setShowAddBankForm' |
  'newBankName' | 'setNewBankName' | 'newBankAccount' | 'setNewBankAccount' |
  'newBankHolder' | 'setNewBankHolder' |
  'handleAddBankAccount' | 'handleRemoveBankAccount'
>;

export const BillingTab = ({
  t, isLoadingBilling, updateBilling,
  formBillingMode, setFormBillingMode,
  formCurrency, setFormCurrency,
  formInvoicePrefix, setFormInvoicePrefix,
  formLatePaymentAutoLock, setFormLatePaymentAutoLock,
  formLatePaymentThreshold, setFormLatePaymentThreshold,
  formExpenseCategories, newCategoryInput, setNewCategoryInput,
  handleSaveBilling, handleAddCategory, handleRemoveCategory,
  formBankAccounts, showAddBankForm, setShowAddBankForm,
  newBankName, setNewBankName, newBankAccount, setNewBankAccount,
  newBankHolder, setNewBankHolder,
  handleAddBankAccount, handleRemoveBankAccount,
}: BillingTabProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-bold mb-6 dark:text-zinc-100 flex items-center gap-2">
          <CreditCard size={20} className="text-zinc-400" />
          {t('settings.billing.billingConfig')}
        </h3>

        {isLoadingBilling ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="space-y-4">
              <Label className="text-zinc-400 uppercase tracking-widest text-[10px]">{t('settings.billing.billingMode')}</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'pay-as-you-go', label: t('settings.billing.payAsYouGo'), desc: t('settings.billing.payAsYouGoDesc') },
                  { id: 'package', label: t('settings.billing.packagePrepaid'), desc: t('settings.billing.packagePrepaidDesc') },
                  { id: 'subscription', label: t('settings.billing.subscription'), desc: t('settings.billing.subscriptionDesc') },
                ].map((mode) => (
                  <div
                    key={mode.id}
                    onClick={() => setFormBillingMode(mode.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 cursor-pointer transition-all",
                      formBillingMode === mode.id
                        ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                        : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-200"
                    )}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm">{mode.label}</span>
                      {formBillingMode === mode.id && <CheckCircle2 size={16} className="text-zinc-900 dark:text-zinc-100" />}
                    </div>
                    <p className="text-xs text-zinc-500">{mode.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <div className="space-y-1.5">
                <Label>{t('settings.billing.currency')}</Label>
                <select
                  value={formCurrency}
                  onChange={(e) => setFormCurrency(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100"
                >
                  <option value="IDR">IDR (Rp)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('settings.billing.invoicePrefix')}</Label>
                <Input value={formInvoicePrefix} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormInvoicePrefix(e.target.value)} />
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{t('settings.billing.latePaymentAutoLock')}</p>
                <p className="text-xs text-zinc-500">{t('settings.billing.latePaymentAutoLockDesc')}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">{t('settings.billing.threshold')}</span>
                  <Input
                    className="w-24 h-8 text-xs"
                    value={formLatePaymentThreshold}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormLatePaymentThreshold(Number(e.target.value))}
                  />
                </div>
                <Switch checked={formLatePaymentAutoLock} onChange={() => setFormLatePaymentAutoLock(!formLatePaymentAutoLock)} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button className="gap-2" onClick={handleSaveBilling} disabled={updateBilling.isPending}>
                <Save size={16} />
                {updateBilling.isPending ? t('common.saving') : t('common.saveChanges')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold dark:text-zinc-100 flex items-center gap-2">
            <Tag size={20} className="text-zinc-400" />
            {t('settings.billing.expenseCategories')}
          </h3>
        </div>
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
        <div className="mt-6 flex justify-end">
          <Button className="gap-2" onClick={handleSaveBilling} disabled={updateBilling.isPending}>
            <Save size={16} />
            {updateBilling.isPending ? t('common.saving') : t('common.saveChanges')}
          </Button>
        </div>
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
        <div className="mt-6 flex justify-end">
          <Button className="gap-2" onClick={handleSaveBilling} disabled={updateBilling.isPending}>
            <Save size={16} />
            {updateBilling.isPending ? t('common.saving') : t('common.saveChanges')}
          </Button>
        </div>
      </Card>
    </div>
  );
};
