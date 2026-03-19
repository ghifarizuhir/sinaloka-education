import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '@/src/hooks/useAuth';
import { useGeneralSettings, useUpdateGeneralSettings, useBillingSettings, useUpdateBillingSettings, useAcademicSettings, useUpdateAcademicSettings } from '@/src/hooks/useSettings';
import type { BankAccount, Room, RoomType, RoomStatus, SubjectCategory, GradeLevel } from '@/src/types/settings';

export const useSettingsPage = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
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

  // Academic settings
  const { data: academicSettings, isLoading: isLoadingAcademic } = useAcademicSettings();
  const updateAcademic = useUpdateAcademicSettings();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [subjectCategories, setSubjectCategories] = useState<SubjectCategory[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);

  useEffect(() => {
    if (academicSettings) {
      setRooms(academicSettings.rooms);
      setSubjectCategories(academicSettings.subject_categories);
      setGradeLevels(academicSettings.grade_levels);
      setWorkingDays(academicSettings.working_days);
    }
  }, [academicSettings]);

  // Room modal form state
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomFormName, setRoomFormName] = useState('');
  const [roomFormType, setRoomFormType] = useState<RoomType>('Classroom');
  const [roomFormCapacity, setRoomFormCapacity] = useState('');
  const [roomFormStatus, setRoomFormStatus] = useState<RoomStatus>('Available');

  const handleOpenRoomModal = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      setRoomFormName(room.name);
      setRoomFormType(room.type);
      setRoomFormCapacity(room.capacity !== null ? String(room.capacity) : '');
      setRoomFormStatus(room.status);
    } else {
      setEditingRoom(null);
      setRoomFormName('');
      setRoomFormType('Classroom');
      setRoomFormCapacity('');
      setRoomFormStatus('Available');
    }
    setShowRoomModal(true);
  };

  const handleSaveRoom = () => {
    const capacity = roomFormType === 'Online' ? null : parseInt(roomFormCapacity, 10) || null;
    const newRoom: Room = {
      id: editingRoom?.id ?? crypto.randomUUID(),
      name: roomFormName.trim(),
      type: roomFormType,
      capacity,
      status: roomFormStatus,
    };
    const updatedRooms = editingRoom
      ? rooms.map(r => r.id === editingRoom.id ? newRoom : r)
      : [...rooms, newRoom];
    updateAcademic.mutate({ rooms: updatedRooms }, {
      onSuccess: () => {
        toast.success(t(editingRoom ? 'settings.academic.roomUpdated' : 'settings.academic.roomSaved'));
        setShowRoomModal(false);
        setEditingRoom(null);
      },
      onError: () => toast.error(t('settings.academic.roomSaveFailed')),
    });
  };

  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

  const handleDeleteRoom = () => {
    if (!roomToDelete) return;
    const updatedRooms = rooms.filter(r => r.id !== roomToDelete.id);
    updateAcademic.mutate({ rooms: updatedRooms }, {
      onSuccess: () => {
        toast.success(t('settings.academic.roomDeleted'));
        setRoomToDelete(null);
      },
      onError: () => toast.error(t('settings.academic.roomSaveFailed')),
    });
  };

  // Subject category handlers
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddSubjectCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (subjectCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) return;
    const newCat: SubjectCategory = {
      id: crypto.randomUUID(),
      name,
      order: subjectCategories.length,
    };
    const updated = [...subjectCategories, newCat];
    updateAcademic.mutate({ subject_categories: updated }, {
      onSuccess: () => {
        toast.success(t('settings.academic.categorySaved'));
        setNewCategoryName('');
        setShowCategoryInput(false);
      },
      onError: () => toast.error(t('settings.academic.settingsSaveFailed')),
    });
  };

  const handleRemoveSubjectCategory = (id: string) => {
    const updated = subjectCategories.filter(c => c.id !== id);
    updateAcademic.mutate({ subject_categories: updated }, {
      onSuccess: () => toast.success(t('settings.academic.categorySaved')),
      onError: () => toast.error(t('settings.academic.settingsSaveFailed')),
    });
  };

  // Grade level handlers
  const [showGradeInput, setShowGradeInput] = useState(false);
  const [newGradeName, setNewGradeName] = useState('');

  const handleAddGrade = () => {
    const name = newGradeName.trim();
    if (!name) return;
    if (gradeLevels.some(g => g.name.toLowerCase() === name.toLowerCase())) return;
    const newGrade: GradeLevel = {
      id: crypto.randomUUID(),
      name,
      order: gradeLevels.length,
    };
    const updated = [...gradeLevels, newGrade];
    updateAcademic.mutate({ grade_levels: updated }, {
      onSuccess: () => {
        toast.success(t('settings.academic.gradeSaved'));
        setNewGradeName('');
        setShowGradeInput(false);
      },
      onError: () => toast.error(t('settings.academic.settingsSaveFailed')),
    });
  };

  const handleRemoveGrade = (id: string) => {
    const updated = gradeLevels.filter(g => g.id !== id);
    updateAcademic.mutate({ grade_levels: updated }, {
      onSuccess: () => toast.success(t('settings.academic.gradeSaved')),
      onError: () => toast.error(t('settings.academic.settingsSaveFailed')),
    });
  };

  // Working days handlers
  const handleToggleWorkingDay = (day: number) => {
    const updated = workingDays.includes(day)
      ? workingDays.filter(d => d !== day)
      : [...workingDays, day].sort();
    if (updated.length === 0) return; // Minimum 1 day
    setWorkingDays(updated);
  };

  const handleSaveWorkingDays = () => {
    updateAcademic.mutate({ working_days: workingDays }, {
      onSuccess: () => toast.success(t('settings.academic.settingsSaved')),
      onError: () => toast.error(t('settings.academic.settingsSaveFailed')),
    });
  };

  return {
    t,
    i18n,
    user,
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
    subjectCategories,
    gradeLevels,
    workingDays,
    isLoadingAcademic,
    updateAcademic,
    showRoomModal,
    setShowRoomModal,
    editingRoom,
    setEditingRoom,
    roomFormName,
    setRoomFormName,
    roomFormType,
    setRoomFormType,
    roomFormCapacity,
    setRoomFormCapacity,
    roomFormStatus,
    setRoomFormStatus,
    handleOpenRoomModal,
    handleSaveRoom,
    roomToDelete,
    setRoomToDelete,
    handleDeleteRoom,
    showCategoryInput,
    setShowCategoryInput,
    newCategoryName,
    setNewCategoryName,
    handleAddSubjectCategory,
    handleRemoveSubjectCategory,
    showGradeInput,
    setShowGradeInput,
    newGradeName,
    setNewGradeName,
    handleAddGrade,
    handleRemoveGrade,
    handleToggleWorkingDay,
    handleSaveWorkingDays,
  };
};

export type SettingsPageState = ReturnType<typeof useSettingsPage>;
