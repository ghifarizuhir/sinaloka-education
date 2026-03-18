import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '@/src/hooks/useAuth';
import { useGeneralSettings, useUpdateGeneralSettings, useBillingSettings, useUpdateBillingSettings } from '@/src/hooks/useSettings';
import type { BankAccount } from '@/src/types/settings';

export const useSettingsPage = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [primaryColor, setPrimaryColor] = useState('#0f172a');

  // General settings form state
  const { data: generalSettings, isLoading: isLoadingGeneral } = useGeneralSettings();
  const updateSettings = useUpdateGeneralSettings();

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formTimezone, setFormTimezone] = useState('Asia/Jakarta');
  const [formLanguage, setFormLanguage] = useState('id');

  useEffect(() => {
    if (generalSettings) {
      setFormName(generalSettings.name);
      setFormEmail(generalSettings.email ?? '');
      setFormPhone(generalSettings.phone ?? '');
      setFormAddress(generalSettings.address ?? '');
      setFormTimezone(generalSettings.timezone);
      setFormLanguage(generalSettings.default_language);
    }
  }, [generalSettings]);

  const handleSaveGeneral = () => {
    updateSettings.mutate({
      name: formName,
      email: formEmail || null,
      phone: formPhone || null,
      address: formAddress || null,
      timezone: formTimezone,
      default_language: formLanguage,
    }, {
      onSuccess: () => {
        toast.success(t('settings.general.saveSuccess'));
        if (formLanguage !== i18n.language) {
          i18n.changeLanguage(formLanguage);
          localStorage.setItem('sinaloka-lang', formLanguage);
          document.documentElement.lang = formLanguage;
        }
      },
      onError: () => toast.error(t('settings.general.saveFailed')),
    });
  };

  // Billing settings form state
  const { data: billingSettings, isLoading: isLoadingBilling } = useBillingSettings();
  const updateBilling = useUpdateBillingSettings();

  const [formBillingMode, setFormBillingMode] = useState('manual');
  const [formCurrency, setFormCurrency] = useState('IDR');
  const [formInvoicePrefix, setFormInvoicePrefix] = useState('INV-');
  const [formLatePaymentAutoLock, setFormLatePaymentAutoLock] = useState(false);
  const [formLatePaymentThreshold, setFormLatePaymentThreshold] = useState(0);
  const [formExpenseCategories, setFormExpenseCategories] = useState<string[]>([]);
  const [formBankAccounts, setFormBankAccounts] = useState<BankAccount[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showAddBankForm, setShowAddBankForm] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankAccount, setNewBankAccount] = useState('');
  const [newBankHolder, setNewBankHolder] = useState('');

  useEffect(() => {
    if (billingSettings) {
      setFormBillingMode(billingSettings.billing_mode);
      setFormCurrency(billingSettings.currency);
      setFormInvoicePrefix(billingSettings.invoice_prefix);
      setFormLatePaymentAutoLock(billingSettings.late_payment_auto_lock);
      setFormLatePaymentThreshold(billingSettings.late_payment_threshold);
      setFormExpenseCategories(billingSettings.expense_categories);
      setFormBankAccounts(billingSettings.bank_accounts);
    }
  }, [billingSettings]);

  const handleSaveBilling = () => {
    updateBilling.mutate({
      billing_mode: formBillingMode,
      currency: formCurrency,
      invoice_prefix: formInvoicePrefix,
      late_payment_auto_lock: formLatePaymentAutoLock,
      late_payment_threshold: formLatePaymentThreshold,
      expense_categories: formExpenseCategories,
      bank_accounts: formBankAccounts,
    }, {
      onSuccess: () => toast.success(t('settings.billing.saveSuccess')),
      onError: () => toast.error(t('settings.billing.saveFailed')),
    });
  };

  const handleAddCategory = () => {
    const cat = newCategoryInput.trim().toUpperCase();
    if (cat && !formExpenseCategories.includes(cat)) {
      setFormExpenseCategories([...formExpenseCategories, cat]);
      setNewCategoryInput('');
    }
  };

  const handleRemoveCategory = (cat: string) => {
    setFormExpenseCategories(formExpenseCategories.filter(c => c !== cat));
  };

  const handleAddBankAccount = () => {
    if (newBankName && newBankAccount && newBankHolder) {
      setFormBankAccounts([...formBankAccounts, {
        id: crypto.randomUUID(),
        bank_name: newBankName,
        account_number: newBankAccount,
        account_holder: newBankHolder,
      }]);
      setNewBankName('');
      setNewBankAccount('');
      setNewBankHolder('');
      setShowAddBankForm(false);
    }
  };

  const handleRemoveBankAccount = (id: string | undefined) => {
    setFormBankAccounts(formBankAccounts.filter(a => a.id !== id));
  };

  const [rooms, setRooms] = useState([
    { id: 'R1', name: 'Room A (Main)', capacity: 20, type: 'Classroom', status: 'Available' },
    { id: 'R2', name: 'Science Lab', capacity: 15, type: 'Laboratory', status: 'Available' },
    { id: 'R3', name: 'Music Studio', capacity: 5, type: 'Studio', status: 'Maintenance' },
  ]);

  return {
    t,
    i18n,
    user,
    activeTab,
    setActiveTab,
    primaryColor,
    setPrimaryColor,
    isLoadingGeneral,
    updateSettings,
    formName,
    setFormName,
    formEmail,
    setFormEmail,
    formPhone,
    setFormPhone,
    formAddress,
    setFormAddress,
    formTimezone,
    setFormTimezone,
    formLanguage,
    setFormLanguage,
    handleSaveGeneral,
    isLoadingBilling,
    updateBilling,
    formBillingMode,
    setFormBillingMode,
    formCurrency,
    setFormCurrency,
    formInvoicePrefix,
    setFormInvoicePrefix,
    formLatePaymentAutoLock,
    setFormLatePaymentAutoLock,
    formLatePaymentThreshold,
    setFormLatePaymentThreshold,
    formExpenseCategories,
    setFormExpenseCategories,
    formBankAccounts,
    setFormBankAccounts,
    newCategoryInput,
    setNewCategoryInput,
    showAddBankForm,
    setShowAddBankForm,
    newBankName,
    setNewBankName,
    newBankAccount,
    setNewBankAccount,
    newBankHolder,
    setNewBankHolder,
    handleSaveBilling,
    handleAddCategory,
    handleRemoveCategory,
    handleAddBankAccount,
    handleRemoveBankAccount,
    rooms,
    setRooms,
  };
};

export type SettingsPageState = ReturnType<typeof useSettingsPage>;
