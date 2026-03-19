import React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, CreditCard, GraduationCap, Wallet } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSettingsPage } from './useSettingsPage';
import { useScrollSpy } from './useScrollSpy';
import { GeneralTab } from './tabs/GeneralTab';
import { BillingTab } from './tabs/BillingTab';
import { AcademicTab } from './tabs/AcademicTab';
import { PaymentGatewayTab } from './tabs/PaymentGatewayTab';

const SECTION_IDS = ['general', 'billing', 'academic', 'payment-gateway'];

export const SettingsPage = () => {
  const { t } = useTranslation();
  const state = useSettingsPage();
  const activeSection = useScrollSpy(SECTION_IDS);

  const tabs = [
    { id: 'general', label: t('settings.tabs.general'), icon: Building2 },
    { id: 'billing', label: t('settings.tabs.billing'), icon: CreditCard },
    { id: 'academic', label: t('settings.tabs.academic'), icon: GraduationCap },
    { id: 'payment-gateway', label: t('settings.tabs.paymentGateway'), icon: Wallet },
  ];

  const handleTabClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Page header — scrolls away */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight dark:text-zinc-100">
            {t('settings.title')}
          </h2>
          <p className="text-zinc-500 text-sm">{t('settings.subtitle')}</p>
        </div>
      </div>

      {/* Sticky horizontal tab bar */}
      <div className="sticky top-16 z-10 bg-white dark:bg-zinc-950 -mx-1 px-1">
        <nav className="flex gap-7 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap pb-3 pt-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeSection === tab.id
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-semibold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* All sections rendered — scroll-spy determines active tab */}
      <section id="general" className="scroll-mt-32">
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
      </section>

      <section id="billing" className="scroll-mt-32">
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
      </section>

      <section id="academic" className="scroll-mt-32">
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
      </section>

      <section id="payment-gateway" className="scroll-mt-32">
        <PaymentGatewayTab
          t={state.t}
          isLoadingPaymentGateway={state.isLoadingPaymentGateway}
          updatePaymentGateway={state.updatePaymentGateway}
          formServerKey={state.formServerKey}
          setFormServerKey={state.setFormServerKey}
          formClientKey={state.formClientKey}
          setFormClientKey={state.setFormClientKey}
          formIsSandbox={state.formIsSandbox}
          setFormIsSandbox={state.setFormIsSandbox}
          paymentGatewayConfigured={state.paymentGatewayConfigured}
          handleSavePaymentGateway={state.handleSavePaymentGateway}
        />
      </section>
    </div>
  );
};
