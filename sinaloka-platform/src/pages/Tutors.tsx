import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  MoreHorizontal,
  Search,
  Grid,
  List,
  Star,
  Mail,
  Phone,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  UserPlus,
  MessageSquare,
  FileText
} from 'lucide-react';
import {
  Card,
  Button,
  Input,
  Label,
  Modal,
  Badge,
  SearchInput,
  Switch,
  MultiSelect,
  Skeleton,
  ConfirmDialog,
  PageHeader,
  Select,
  DropdownMenu,
  Avatar,
} from '../components/UI';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import {
  useTutors,
  useCreateTutor,
  useUpdateTutor,
  useDeleteTutor,
  useInviteTutor,
  useResendInvite,
  useCancelInvite,
} from '@/src/hooks/useTutors';
import { useSubjects } from '@/src/hooks/useSubjects';
import type { Tutor } from '@/src/types/tutor';

const TutorForm = ({ initialData, onSubmit, onCancel, isEditing }: {
  initialData?: Tutor | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isEditing: boolean;
}) => {
  const { t } = useTranslation();
  const { data: subjectsList } = useSubjects();
  const [formData, setFormData] = useState({
    name: initialData?.name ?? '',
    email: initialData?.email ?? '',
    password: '',
    subject_ids: initialData?.tutor_subjects?.map(ts => ts.subject.id) ?? [],
    experience_years: initialData?.experience_years ?? 0,
    is_verified: initialData?.is_verified ?? false,
    bank_name: initialData?.bank_name ?? '',
    bank_account_number: initialData?.bank_account_number ?? '',
    bank_account_holder: initialData?.bank_account_holder ?? '',
    monthly_salary: initialData?.monthly_salary ? String(initialData.monthly_salary) : '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      email: formData.email,
      subject_ids: formData.subject_ids,
      experience_years: Number(formData.experience_years),
      ...(isEditing ? { is_verified: formData.is_verified } : {}),
      bank_name: isEditing ? formData.bank_name : (formData.bank_name || undefined),
      bank_account_number: isEditing ? formData.bank_account_number : (formData.bank_account_number || undefined),
      bank_account_holder: isEditing ? formData.bank_account_holder : (formData.bank_account_holder || undefined),
      monthly_salary: formData.monthly_salary ? Number(formData.monthly_salary) : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t('tutors.form.fullName')}</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} required placeholder={t('tutors.form.namePlaceholder')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t('tutors.form.emailAddress')}</Label>
          <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required placeholder={t('tutors.form.emailPlaceholder')} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>{t('tutors.form.subjects')}</Label>
          <MultiSelect
            options={(subjectsList ?? []).map(s => ({ id: s.id, label: s.name }))}
            selected={formData.subject_ids}
            onChange={(ids) => setFormData(prev => ({ ...prev, subject_ids: ids }))}
            placeholder={t('common.search') + '...'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="experience_years">{t('tutors.form.yearsOfExperience')}</Label>
          <Input
            id="experience_years"
            name="experience_years"
            type="number"
            min={0}
            max={50}
            step={1}
            value={formData.experience_years}
            onChange={(e) => setFormData(prev => ({ ...prev, experience_years: Number(e.target.value) || 0 }))}
            placeholder="e.g. 5"
          />
        </div>
      </div>

      {isEditing && (
        <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col">
            <span className="text-sm font-bold dark:text-zinc-200">{t('tutors.form.verifiedStatus')}</span>
            <span className="text-xs text-zinc-500">{t('tutors.form.markVerified')}</span>
          </div>
          <Switch
            checked={formData.is_verified}
            onChange={(checked: boolean) => setFormData(prev => ({ ...prev, is_verified: checked }))}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bank_name">{t('tutors.form.bankName')}</Label>
          <Input id="bank_name" name="bank_name" value={formData.bank_name} onChange={handleChange} placeholder={t('tutors.form.bankNamePlaceholder')} required={isEditing} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bank_account_number">{t('tutors.form.accountNumber')}</Label>
          <Input id="bank_account_number" name="bank_account_number" value={formData.bank_account_number} onChange={handleChange} placeholder={t('tutors.form.accountNumberPlaceholder')} required={isEditing} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bank_account_holder">{t('tutors.form.accountHolder')}</Label>
          <Input id="bank_account_holder" name="bank_account_holder" value={formData.bank_account_holder} onChange={handleChange} placeholder={t('tutors.form.accountHolderPlaceholder')} required={isEditing} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthly_salary">{t('tutors.form.monthlySalary')}</Label>
          <Input id="monthly_salary" name="monthly_salary" type="number" value={formData.monthly_salary} onChange={handleChange} placeholder={t('tutors.form.monthlySalaryPlaceholder')} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button type="submit">{isEditing ? t('common.saveChanges') : t('tutors.form.sendInvitation')}</Button>
      </div>
    </form>
  );
};

export const Tutors = () => {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'experience_years' | 'name'>('rating');
  const [filterSubject, setFilterSubject] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTutor, setEditingTutor] = useState<Tutor | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'cancel' | 'delete'; tutorId: string } | null>(null);

  const { data, isLoading } = useTutors({ page, limit });
  const createTutor = useCreateTutor();
  const updateTutor = useUpdateTutor();
  const deleteTutor = useDeleteTutor();
  const inviteTutor = useInviteTutor();
  const resendInvite = useResendInvite();
  const cancelInvite = useCancelInvite();

  const tutors = data?.data ?? [];

  const filteredTutors = useMemo(() => {
    return tutors
      .filter(t => {
        const subs = t.tutor_subjects.map(ts => ts.subject.name);
        const matchesSearch =
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          subs.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesSubject =
          !filterSubject ||
          subs.some(s => s.toLowerCase() === filterSubject.toLowerCase());
        return matchesSearch && matchesSubject;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
        if (sortBy === 'experience_years') return (b.experience_years ?? 0) - (a.experience_years ?? 0);
        return a.name.localeCompare(b.name);
      });
  }, [tutors, searchQuery, filterSubject, sortBy]);

  // collect unique subjects
  const subjects = Array.from(new Set(tutors.flatMap(t => t.tutor_subjects.map(ts => ts.subject.name))));

  const handleAddTutor = (data: any) => {
    inviteTutor.mutate(
      { email: data.email, name: data.name, subject_ids: data.subject_ids, experience_years: data.experience_years },
      {
        onSuccess: () => {
          toast.success(t('tutors.toast.inviteSent'));
          setShowForm(false);
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || t('tutors.toast.inviteError'));
        },
      }
    );
  };

  const handleResendInvite = (tutorId: string) => {
    resendInvite.mutate(tutorId, {
      onSuccess: () => toast.success(t('tutors.toast.inviteResent')),
      onError: () => toast.error(t('tutors.toast.resendError')),
    });
  };

  const handleCancelInvite = (tutorId: string) => {
    setConfirmAction({ type: 'cancel', tutorId });
  };

  const handleEditTutor = (formData: any) => {
    if (!editingTutor) return;
    updateTutor.mutate(
      { id: editingTutor.id, data: formData },
      {
        onSuccess: () => {
          toast.success(t('tutors.toast.updated'));
          setShowForm(false);
          setEditingTutor(null);
        },
        onError: () => toast.error(t('tutors.toast.updateError')),
      }
    );
  };

  const handleDeleteTutor = (id: string) => {
    setConfirmAction({ type: 'delete', tutorId: id });
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'cancel') {
      cancelInvite.mutate(confirmAction.tutorId, {
        onSuccess: () => {
          toast.success(t('tutors.toast.inviteCancelled'));
          setConfirmAction(null);
        },
        onError: () => toast.error(t('tutors.toast.cancelError')),
      });
    } else {
      deleteTutor.mutate(confirmAction.tutorId, {
        onSuccess: () => {
          toast.success(t('tutors.toast.deleted'));
          setConfirmAction(null);
        },
        onError: () => toast.error(t('tutors.toast.deleteError')),
      });
    }
  };

  const getAvailabilityBadge = (tutor: Tutor) => {
    const isActive = (tutor as any).user?.is_active !== false;
    if (!isActive) {
      return <Badge variant="warning" className="flex items-center gap-1"><Clock size={10} /> {t('tutors.status.pendingInvite')}</Badge>;
    }
    if (!tutor.is_verified) {
      return <Badge variant="default" className="flex items-center gap-1"><XCircle size={10} /> {t('tutors.status.unverified')}</Badge>;
    }
    return <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 size={10} /> {t('tutors.status.verified')}</Badge>;
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title={t('tutors.title')}
        subtitle={t('tutors.subtitle')}
        actions={
          <Button onClick={() => { setEditingTutor(null); setShowForm(true); }}>
            <Plus size={18} />
            {t('tutors.addTutor')}
          </Button>
        }
      />

      {/* Filter & Sort Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <SearchInput
          placeholder={t('tutors.searchPlaceholder')}
          className="w-full sm:max-w-xs"
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
        />
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <Select
            value={filterSubject}
            onChange={setFilterSubject}
            options={[
              { value: '', label: t('common.allSubjects') },
              ...subjects.map(s => ({ value: s, label: s })),
            ]}
          />
          <Select
            value={sortBy}
            onChange={(val) => setSortBy(val as any)}
            options={[
              { value: 'rating', label: t('tutors.sort.byRating') },
              { value: 'experience_years', label: t('tutors.sort.byExperience') },
              { value: 'name', label: t('tutors.sort.byName') },
            ]}
          />
          <div className="h-8 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-1" />
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1.5 rounded-md transition-all', viewMode === 'grid' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500')}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1.5 rounded-md transition-all', viewMode === 'list' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500')}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      {(searchQuery || filterSubject) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-zinc-400 uppercase mr-2">{t('tutors.filtersLabel')}</span>
          {searchQuery && (
            <Badge variant="outline" className="flex items-center gap-1 normal-case font-medium">
              "{searchQuery}"
              <X size={12} className="cursor-pointer" onClick={() => setSearchQuery('')} />
            </Badge>
          )}
          {filterSubject && (
            <Badge variant="outline" className="flex items-center gap-1 normal-case font-medium">
              {t('students.filter.subject', { subject: filterSubject })}
              <X size={12} className="cursor-pointer" onClick={() => setFilterSubject('')} />
            </Badge>
          )}
          <button
            onClick={() => { setSearchQuery(''); setFilterSubject(''); }}
            className="text-xs text-indigo-600 hover:underline font-medium"
          >
            {t('common.clearAll')}
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : filteredTutors.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTutors.map((tutor) => (
              <Card key={tutor.id} className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <DropdownMenu
                    trigger={<MoreHorizontal size={18} />}
                    items={
                      (tutor as any).user?.is_active === false
                        ? [
                            { label: t('tutors.menu.resendInvite'), icon: Mail, onClick: () => handleResendInvite(tutor.id) },
                            { label: t('tutors.menu.cancelInvite'), icon: XCircle, onClick: () => handleCancelInvite(tutor.id), variant: 'danger' as const },
                          ]
                        : [
                            { label: t('tutors.menu.editProfile'), icon: FileText, onClick: () => { setEditingTutor(tutor); setShowForm(true); } },
                            { label: t('tutors.menu.deleteTutor'), icon: XCircle, onClick: () => handleDeleteTutor(tutor.id), variant: 'danger' as const },
                          ]
                    }
                  />
                </div>

                <div className="flex items-start gap-4 mb-6">
                  <Avatar name={tutor.name} size="lg" />
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-lg dark:text-zinc-100">{tutor.name}</h4>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate" title={`${tutor.tutor_subjects.map(ts => ts.subject.name).slice(0, 2).join(', ')} ${t('tutors.specialist')}`}>
                      {tutor.tutor_subjects.map(ts => ts.subject.name).slice(0, 2).join(', ')} {t('tutors.specialist')}
                    </p>
                    <div className="mt-1">{getAvailabilityBadge(tutor)}</div>
                  </div>
                </div>

                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-6 h-10">
                  {tutor.email}
                </p>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-zinc-50 dark:border-zinc-800">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 mb-1">{t('tutors.card.experience')}</p>
                    <p className="text-sm font-bold dark:text-zinc-300">{tutor.experience_years}y</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 mb-1">{t('tutors.card.rating')}</p>
                    <p className="text-sm font-bold dark:text-zinc-300 flex items-center gap-1">
                      {(tutor.rating ?? 0) > 0 ? (
                        <><Star size={12} className="text-amber-400 fill-amber-400" /> {tutor.rating.toFixed(1)}</>
                      ) : (
                        <span className="text-xs text-zinc-400 font-normal">{t('tutors.noRatings')}</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 mb-1">{t('tutors.card.subjects')}</p>
                    <p className="text-sm font-bold dark:text-zinc-300 flex items-center gap-1">
                      <Users size={12} className="text-zinc-400" /> {tutor.tutor_subjects.length}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('tutors.table.tutor')}</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('tutors.table.subjects')}</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('tutors.table.experience')}</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('tutors.table.rating')}</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('tutors.table.status')}</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredTutors.map((tutor) => (
                  <tr key={tutor.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={tutor.name} size="md" />
                        <div>
                          <p className="text-sm font-bold dark:text-zinc-200">{tutor.name}</p>
                          <p className="text-xs text-zinc-500">{tutor.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {tutor.tutor_subjects.map(ts => ts.subject.name).join(', ')}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">{tutor.experience_years} {t('tutors.card.years')}</td>
                    <td className="px-6 py-4">
                      {(tutor.rating ?? 0) > 0 ? (
                        <div className="flex items-center gap-1 text-sm font-bold text-amber-500">
                          <Star size={14} fill="currentColor" /> {tutor.rating.toFixed(1)}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">{t('tutors.noRatings')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getAvailabilityBadge(tutor)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu
                        trigger={<MoreHorizontal size={18} />}
                        items={
                          (tutor as any).user?.is_active === false
                            ? [
                                { label: t('tutors.menu.resendInvite'), icon: Mail, onClick: () => handleResendInvite(tutor.id) },
                                { label: t('tutors.menu.cancelInvite'), icon: XCircle, onClick: () => handleCancelInvite(tutor.id), variant: 'danger' as const },
                              ]
                            : [
                                { label: t('tutors.menu.editProfile'), icon: FileText, onClick: () => { setEditingTutor(tutor); setShowForm(true); } },
                                { label: t('tutors.menu.deleteTutor'), icon: XCircle, onClick: () => handleDeleteTutor(tutor.id), variant: 'danger' as const },
                              ]
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
            <Search size={32} className="text-zinc-300" />
          </div>
          <h3 className="text-lg font-bold mb-1">{t('tutors.noTutorsFound')}</h3>
          <p className="text-zinc-500 text-sm mb-6">{t('tutors.noTutorsHint')}</p>
          <Button variant="outline" onClick={() => { setSearchQuery(''); setFilterSubject(''); }}>
            {t('common.clearAllFilters')}
          </Button>
        </div>
      )}

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingTutor(null); }}
        title={editingTutor ? t('tutors.modal.editTitle') : t('tutors.modal.inviteTitle')}
      >
        <TutorForm
          initialData={editingTutor}
          isEditing={!!editingTutor}
          onSubmit={editingTutor ? handleEditTutor : handleAddTutor}
          onCancel={() => { setShowForm(false); setEditingTutor(null); }}
        />
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmAction?.type === 'cancel' ? t('tutors.confirmDialog.cancelTitle') : t('tutors.confirmDialog.deleteTitle')}
        description={confirmAction?.type === 'cancel' ? t('tutors.confirmDialog.cancelDescription') : t('tutors.confirmDialog.deleteDescription')}
        confirmLabel={confirmAction?.type === 'cancel' ? t('tutors.confirmDialog.cancelConfirm') : t('tutors.confirmDialog.deleteConfirm')}
        cancelLabel={t('common.cancel')}
        isLoading={cancelInvite.isPending || deleteTutor.isPending}
      />
    </div>
  );
};
