import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2, CreditCard, Palette, GraduationCap, ShieldCheck, Puzzle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSettingsPage } from './useSettingsPage';
import { GeneralTab } from './tabs/GeneralTab';
import { BillingTab } from './tabs/BillingTab';
import { BrandingTab } from './tabs/BrandingTab';
import { AcademicTab } from './tabs/AcademicTab';
import { SecurityTab } from './tabs/SecurityTab';
import { IntegrationsTab } from './tabs/IntegrationsTab';

export const SettingsPage = () => {
  const { t } = useTranslation();
  const state = useSettingsPage();

  const tabs = [
    { id: 'general', label: t('settings.tabs.general'), icon: Building2 },
    { id: 'billing', label: t('settings.tabs.billing'), icon: CreditCard },
    { id: 'branding', label: t('settings.tabs.branding'), icon: Palette },
    { id: 'academic', label: t('settings.tabs.academic'), icon: GraduationCap },
    { id: 'security', label: t('settings.tabs.security'), icon: ShieldCheck },
    { id: 'integrations', label: t('settings.tabs.integrations'), icon: Puzzle },
  ];

  const renderTabContent = () => {
    switch (state.activeTab) {
      case 'general':
        return (
          <GeneralTab
            t={state.t}
            isLoadingGeneral={state.isLoadingGeneral}
            updateSettings={state.updateSettings}
            formName={state.formName}
            setFormName={state.setFormName}
            formEmail={state.formEmail}
            setFormEmail={state.setFormEmail}
            formPhone={state.formPhone}
            setFormPhone={state.setFormPhone}
            formAddress={state.formAddress}
            setFormAddress={state.setFormAddress}
            formTimezone={state.formTimezone}
            setFormTimezone={state.setFormTimezone}
            formLanguage={state.formLanguage}
            setFormLanguage={state.setFormLanguage}
            handleSaveGeneral={state.handleSaveGeneral}
          />
        );
      case 'billing':
        return (
          <BillingTab
            t={state.t}
            isLoadingBilling={state.isLoadingBilling}
            updateBilling={state.updateBilling}
            formBillingMode={state.formBillingMode}
            setFormBillingMode={state.setFormBillingMode}
            formCurrency={state.formCurrency}
            setFormCurrency={state.setFormCurrency}
            formInvoicePrefix={state.formInvoicePrefix}
            setFormInvoicePrefix={state.setFormInvoicePrefix}
            formLatePaymentAutoLock={state.formLatePaymentAutoLock}
            setFormLatePaymentAutoLock={state.setFormLatePaymentAutoLock}
            formLatePaymentThreshold={state.formLatePaymentThreshold}
            setFormLatePaymentThreshold={state.setFormLatePaymentThreshold}
            formExpenseCategories={state.formExpenseCategories}
            newCategoryInput={state.newCategoryInput}
            setNewCategoryInput={state.setNewCategoryInput}
            handleSaveBilling={state.handleSaveBilling}
            handleAddCategory={state.handleAddCategory}
            handleRemoveCategory={state.handleRemoveCategory}
            formBankAccounts={state.formBankAccounts}
            showAddBankForm={state.showAddBankForm}
            setShowAddBankForm={state.setShowAddBankForm}
            newBankName={state.newBankName}
            setNewBankName={state.setNewBankName}
            newBankAccount={state.newBankAccount}
            setNewBankAccount={state.setNewBankAccount}
            newBankHolder={state.newBankHolder}
            setNewBankHolder={state.setNewBankHolder}
            handleAddBankAccount={state.handleAddBankAccount}
            handleRemoveBankAccount={state.handleRemoveBankAccount}
          />
        );
      case 'branding':
        return (
          <BrandingTab
            t={state.t}
            primaryColor={state.primaryColor}
            setPrimaryColor={state.setPrimaryColor}
          />
        );
      case 'academic':
        return (
          <AcademicTab
            t={state.t}
            rooms={state.rooms}
            subjectCategories={state.subjectCategories}
            gradeLevels={state.gradeLevels}
            workingDays={state.workingDays}
            isLoadingAcademic={state.isLoadingAcademic}
            updateAcademic={state.updateAcademic}
            showRoomModal={state.showRoomModal}
            setShowRoomModal={state.setShowRoomModal}
            editingRoom={state.editingRoom}
            setEditingRoom={state.setEditingRoom}
            roomFormName={state.roomFormName}
            setRoomFormName={state.setRoomFormName}
            roomFormType={state.roomFormType}
            setRoomFormType={state.setRoomFormType}
            roomFormCapacity={state.roomFormCapacity}
            setRoomFormCapacity={state.setRoomFormCapacity}
            roomFormStatus={state.roomFormStatus}
            setRoomFormStatus={state.setRoomFormStatus}
            handleOpenRoomModal={state.handleOpenRoomModal}
            handleSaveRoom={state.handleSaveRoom}
            roomToDelete={state.roomToDelete}
            setRoomToDelete={state.setRoomToDelete}
            handleDeleteRoom={state.handleDeleteRoom}
            showCategoryInput={state.showCategoryInput}
            setShowCategoryInput={state.setShowCategoryInput}
            newCategoryName={state.newCategoryName}
            setNewCategoryName={state.setNewCategoryName}
            handleAddSubjectCategory={state.handleAddSubjectCategory}
            handleRemoveSubjectCategory={state.handleRemoveSubjectCategory}
            showGradeInput={state.showGradeInput}
            setShowGradeInput={state.setShowGradeInput}
            newGradeName={state.newGradeName}
            setNewGradeName={state.setNewGradeName}
            handleAddGrade={state.handleAddGrade}
            handleRemoveGrade={state.handleRemoveGrade}
            handleToggleWorkingDay={state.handleToggleWorkingDay}
            handleSaveWorkingDays={state.handleSaveWorkingDays}
          />
        );
      case 'security':
        return (
          <SecurityTab
            t={state.t}
          />
        );
      case 'integrations':
        return (
          <IntegrationsTab
            t={state.t}
          />
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
                onClick={() => state.setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                  state.activeTab === tab.id
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
