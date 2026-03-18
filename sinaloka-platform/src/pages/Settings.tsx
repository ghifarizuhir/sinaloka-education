import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Button, Input, Label, Switch, Badge, Skeleton
} from '../components/UI';
import {
  Building2, CreditCard, GraduationCap, ShieldCheck,
  Puzzle, Globe, Palette, Clock, Calendar,
  Smartphone, Mail, MapPin, Save, Trash2,
  Plus, ExternalLink, Upload, CheckCircle2, AlertCircle, X, Tag, Users
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/src/hooks/useAuth';
import { useGeneralSettings, useUpdateGeneralSettings, useBillingSettings, useUpdateBillingSettings } from '@/src/hooks/useSettings';
import type { BankAccount } from '@/src/types/settings';

export const SettingsPage = () => {
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

  const tabs = [
    { id: 'general', label: t('settings.tabs.general'), icon: Building2 },
    { id: 'billing', label: t('settings.tabs.billing'), icon: CreditCard },
    { id: 'branding', label: t('settings.tabs.branding'), icon: Palette },
    { id: 'academic', label: t('settings.tabs.academic'), icon: GraduationCap },
    { id: 'security', label: t('settings.tabs.security'), icon: ShieldCheck },
    { id: 'integrations', label: t('settings.tabs.integrations'), icon: Puzzle },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-bold mb-6 dark:text-zinc-100 flex items-center gap-2">
                <Building2 size={20} className="text-zinc-400" />
                {t('settings.general.institutionInfo')}
              </h3>
              {isLoadingGeneral ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label>{t('settings.general.institutionName')}</Label>
                      <Input value={formName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('settings.general.supportEmail')}</Label>
                      <Input type="email" value={formEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('settings.general.phone')}</Label>
                      <Input value={formPhone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormPhone(e.target.value)} placeholder="+62 812 3456 7890" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('settings.general.address')}</Label>
                      <Input value={formAddress} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormAddress(e.target.value)} placeholder={t('settings.general.addressPlaceholder')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('settings.general.timezone')}</Label>
                      <select
                        value={formTimezone}
                        onChange={(e) => setFormTimezone(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:text-zinc-100"
                      >
                        <option value="Asia/Jakarta">Asia/Jakarta (GMT+7)</option>
                        <option value="Asia/Makassar">Asia/Makassar (GMT+8)</option>
                        <option value="Asia/Jayapura">Asia/Jayapura (GMT+9)</option>
                        <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('settings.general.language')}</Label>
                      <select
                        value={formLanguage}
                        onChange={(e) => setFormLanguage(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:text-zinc-100"
                      >
                        <option value="id">Bahasa Indonesia</option>
                        <option value="en">English (US)</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-8 flex justify-end">
                    <Button className="gap-2" onClick={handleSaveGeneral} disabled={updateSettings.isPending}>
                      <Save size={16} />
                      {updateSettings.isPending ? t('common.saving') : t('common.saveChanges')}
                    </Button>
                  </div>
                </>
              )}
            </Card>

            <Card className="border-rose-100 dark:border-rose-900/30">
              <h3 className="text-lg font-bold mb-2 text-rose-600 flex items-center gap-2">
                <AlertCircle size={20} />
                {t('settings.general.dangerZone')}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                {t('settings.general.dangerZoneDesc')}
              </p>
              <Button variant="outline" className="text-rose-600 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-600 gap-2">
                <Trash2 size={16} />
                {t('settings.general.deleteInstitution')}
              </Button>
            </Card>
          </div>
        );
      case 'billing':
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
      case 'branding':
        return (
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-bold mb-6 dark:text-zinc-100 flex items-center gap-2">
                <Palette size={20} className="text-zinc-400" />
                {t('settings.branding.whiteLabelingTitle')}
              </h3>

              <div className="space-y-8">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1 space-y-4">
                    <Label>{t('settings.branding.institutionLogo')}</Label>
                    <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-zinc-400 transition-colors cursor-pointer">
                      <div className="w-16 h-16 rounded-xl bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-400">
                        <Upload size={32} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{t('settings.branding.clickToUploadLogo')}</p>
                        <p className="text-xs text-zinc-500">{t('settings.branding.logoUsage')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <Label>{t('settings.branding.primaryBrandColor')}</Label>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-16 h-16 rounded-2xl shadow-inner border border-zinc-200 dark:border-zinc-800"
                        style={{ backgroundColor: primaryColor }}
                      />
                      <div className="flex-1 space-y-2">
                        <Input
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          placeholder="#000000"
                        />
                        <p className="text-[10px] text-zinc-500">{t('settings.branding.colorNote')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">{t('settings.branding.customDomain')}</Label>
                      <p className="text-xs text-zinc-500">{t('settings.branding.customDomainDesc')}</p>
                    </div>
                    <Badge variant="outline">{t('common.proFeature')}</Badge>
                  </div>
                  <div className="flex gap-3">
                    <Input placeholder="tutor.yourbrand.com" disabled />
                    <Button variant="outline" disabled className="gap-2">
                      <Globe size={16} />
                      {t('settings.branding.connect')}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );
      case 'academic':
        return (
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-bold mb-6 dark:text-zinc-100 flex items-center gap-2">
                <Calendar size={20} className="text-zinc-400" />
                {t('settings.academic.regionalSettings')}
              </h3>

              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>{t('settings.academic.workingDays')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <button
                        key={day}
                        className={cn(
                          "px-4 py-2 rounded-lg text-xs font-bold border transition-all",
                          ['Sat', 'Sun'].includes(day)
                            ? "border-zinc-100 text-zinc-400 dark:border-zinc-800"
                            : "border-zinc-900 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500 italic">{t('settings.academic.workingDaysNote')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>{t('settings.academic.subjectCategories')}</Label>
                      <Plus size={14} className="text-zinc-400 cursor-pointer" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['Science', 'Mathematics', 'Languages', 'Arts'].map(cat => (
                        <Badge key={cat} variant="default" className="gap-1 pr-1">
                          {cat}
                          <X size={10} className="cursor-pointer" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>{t('settings.academic.gradeLevels')}</Label>
                      <Plus size={14} className="text-zinc-400 cursor-pointer" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['Elementary', 'Middle School', 'High School', 'University'].map(grade => (
                        <Badge key={grade} variant="outline" className="gap-1 pr-1">
                          {grade}
                          <X size={10} className="cursor-pointer" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="font-bold text-sm">{t('settings.academic.roomManagement')}</h4>
                      <p className="text-xs text-zinc-500">{t('settings.academic.roomManagementDesc')}</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Plus size={14} />
                      {t('settings.academic.addRoom')}
                    </Button>
                  </div>

                  <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-zinc-50 dark:bg-zinc-900">
                        <tr>
                          <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('settings.academic.roomName')}</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('settings.academic.type')}</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('settings.academic.capacity')}</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('settings.academic.status')}</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">{t('common.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {rooms.map((room) => (
                          <tr key={room.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium dark:text-zinc-200">{room.name}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-zinc-500">{room.type}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Users size={14} className="text-zinc-400" />
                                <span className="text-sm font-bold dark:text-zinc-100">{room.capacity}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={room.status === 'Available' ? 'success' : 'warning'}
                                className="text-[10px]"
                              >
                                {room.status === 'Available' ? t('settings.academic.available') : t('settings.academic.maintenance')}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                                  <ExternalLink size={14} />
                                </button>
                                <button className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-bold mb-6 dark:text-zinc-100 flex items-center gap-2">
                <ShieldCheck size={20} className="text-zinc-400" />
                {t('settings.security.securityTitle')}
              </h3>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{t('settings.security.twoFactorAuth')}</p>
                      <p className="text-xs text-zinc-500">{t('settings.security.twoFactorAuthDesc')}</p>
                    </div>
                  </div>
                  <Switch checked={false} onChange={() => {}} />
                </div>

                <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                  <Label>{t('settings.security.passwordPolicy')}</Label>
                  <div className="space-y-3">
                    {[
                      { label: t('settings.security.minChars'), active: true },
                      { label: t('settings.security.includeNumbers'), active: true },
                      { label: t('settings.security.includeSpecialChars'), active: false },
                      { label: t('settings.security.requirePasswordChange'), active: false },
                    ].map((policy, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">{policy.label}</span>
                        <Switch checked={policy.active} onChange={() => {}} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );
      case 'integrations':
        return (
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-bold mb-6 dark:text-zinc-100 flex items-center gap-2">
                <Puzzle size={20} className="text-zinc-400" />
                {t('settings.integrations.connectedServices')}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: t('settings.integrations.whatsappApi'), desc: t('settings.integrations.whatsappDesc'), icon: Smartphone, status: 'connected', color: 'text-emerald-500' },
                  { name: t('settings.integrations.midtrans'), desc: t('settings.integrations.midtransDesc'), icon: CreditCard, status: 'notConnected', color: 'text-zinc-400' },
                  { name: t('settings.integrations.sendgrid'), desc: t('settings.integrations.sendgridDesc'), icon: Mail, status: 'connected', color: 'text-emerald-500' },
                  { name: t('settings.integrations.googleCalendar'), desc: t('settings.integrations.googleCalendarDesc'), icon: Calendar, status: 'notConnected', color: 'text-zinc-400' },
                ].map((service, i) => (
                  <div key={i} className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between hover:border-zinc-200 transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-400">
                        <service.icon size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{service.name}</p>
                        <p className="text-[10px] text-zinc-500">{service.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-bold uppercase", service.color)}>
                        {service.status === 'connected' ? t('settings.integrations.connected') : t('settings.integrations.notConnected')}
                      </span>
                      <ExternalLink size={12} className="text-zinc-300" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight dark:text-zinc-100">{t('settings.title')}</h2>
          <p className="text-zinc-500 text-sm">{t('settings.subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                  activeTab === tab.id
                    ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/20 dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};
