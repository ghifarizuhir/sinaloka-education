import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Search,
  MoreHorizontal,
  Users,
  Calendar,
  Clock,
  DollarSign,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  User,
  Trash2,
  Table2
} from 'lucide-react';
import ClassTimetable from '../components/ClassTimetable';
import {
  Card,
  Button,
  Badge,
  Modal,
  Drawer,
  Input,
  Label,
  SearchInput,
  Progress,
  Switch,
  Skeleton
} from '../components/UI';
import { cn, formatCurrency } from '../lib/utils';
import { toast } from 'sonner';
import {
  useClasses,
  useClass,
  useCreateClass,
  useUpdateClass,
  useDeleteClass
} from '@/src/hooks/useClasses';
import { useSubjects, useSubjectTutors } from '@/src/hooks/useSubjects';
import { useBillingSettings } from '@/src/hooks/useSettings';
import { useGenerateSessions } from '@/src/hooks/useSessions';
import { format, addDays, getDay } from 'date-fns';
import type { Class, CreateClassDto, ScheduleDay } from '@/src/types/class';

function getSubjectColor(name: string): string {
  const colors = [
    'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
    'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const DAYS_OF_WEEK: ScheduleDay[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const Classes = () => {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Class | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateDuration, setGenerateDuration] = useState(30);
  const [viewMode, setViewMode] = useState<'table' | 'timetable'>('table');
  const generateSessions = useGenerateSessions();

  // Form state
  const [formName, setFormName] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formTutorId, setFormTutorId] = useState('');
  const [formCapacity, setFormCapacity] = useState('25');
  const [formFee, setFormFee] = useState('500000');
  const [formPackageFee, setFormPackageFee] = useState('');
  const [formTutorFee, setFormTutorFee] = useState('');
  const [formTutorFeeMode, setFormTutorFeeMode] = useState<'FIXED_PER_SESSION' | 'PER_STUDENT_ATTENDANCE' | 'MONTHLY_SALARY'>('FIXED_PER_SESSION');
  const [formTutorFeePerStudent, setFormTutorFeePerStudent] = useState('');
  const [formScheduleDays, setFormScheduleDays] = useState<ScheduleDay[]>([]);
  const [formStartTime, setFormStartTime] = useState('14:00');
  const [formEndTime, setFormEndTime] = useState('15:30');
  const [formRoom, setFormRoom] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  const { data, isLoading } = useClasses({ page, limit });
  const { data: allClassesData } = useClasses({ page: 1, limit: 100 });
  const { data: subjectsList } = useSubjects();
  const { data: subjectTutors } = useSubjectTutors(formSubjectId || null);
  const { data: billingSettings } = useBillingSettings();
  const billingMode = billingSettings?.billing_mode ?? 'manual';
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  const deleteClass = useDeleteClass();
  const classDetail = useClass(selectedClassId);

  const classes = data?.data ?? [];
  const meta = data?.meta;

  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const tutorName = c.tutor?.name ?? '';
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tutorName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = !filterSubject || c.subject.name === filterSubject;
      // "available" means not archived and enrolled (enrollments not in class object; use capacity as proxy)
      const matchesAvailability = !showOnlyAvailable || c.status === 'ACTIVE';
      return matchesSearch && matchesSubject && matchesAvailability;
    });
  }, [classes, searchQuery, filterSubject, showOnlyAvailable]);

  const allClasses = allClassesData?.data ?? [];
  const filteredTimetableClasses = useMemo(() => {
    return allClasses.filter(c => {
      const tutorName = c.tutor?.name ?? '';
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tutorName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = !filterSubject || c.subject.name === filterSubject;
      const matchesAvailability = !showOnlyAvailable || c.status === 'ACTIVE';
      return matchesSearch && matchesSubject && matchesAvailability;
    });
  }, [allClasses, searchQuery, filterSubject, showOnlyAvailable]);

  const selectedClass = filteredClasses.find((c) => c.id === selectedClassId) ?? null;

  const totalRevenue = useMemo(() => {
    return classes.reduce((sum, c) => sum + Number(c.fee), 0);
  }, [classes]);

  const openAddModal = () => {
    setEditingClass(null);
    setFormName('');
    setFormSubjectId('');
    setFormTutorId('');
    setFormCapacity('25');
    setFormFee('500000');
    setFormPackageFee('');
    setFormTutorFee('');
    setFormTutorFeeMode('FIXED_PER_SESSION');
    setFormTutorFeePerStudent('');
    setFormScheduleDays([]);
    setFormStartTime('14:00');
    setFormEndTime('15:30');
    setFormRoom('');
    setFormStatus('ACTIVE');
    setShowModal(true);
  };

  const openEditModal = (cls: Class) => {
    setEditingClass(cls);
    setFormName(cls.name);
    setFormSubjectId(cls.subject_id);
    setFormTutorId(cls.tutor_id);
    setFormCapacity(String(cls.capacity));
    setFormFee(String(cls.fee));
    setFormScheduleDays(cls.schedule_days);
    setFormStartTime(cls.schedule_start_time);
    setFormEndTime(cls.schedule_end_time);
    setFormRoom(cls.room ?? '');
    setFormPackageFee(cls.package_fee ? String(cls.package_fee) : '');
    setFormTutorFee(String(cls.tutor_fee ?? 0));
    setFormTutorFeeMode(cls.tutor_fee_mode ?? 'FIXED_PER_SESSION');
    setFormTutorFeePerStudent(cls.tutor_fee_per_student ? String(cls.tutor_fee_per_student) : '');
    setFormStatus(cls.status);
    setShowModal(true);
  };

  const toggleScheduleDay = (day: ScheduleDay) => {
    setFormScheduleDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleFormSubmit = () => {
    if (!formTutorId) {
      toast.error(t('classes.toast.selectTutor'));
      return;
    }
    if (formScheduleDays.length === 0) {
      toast.error(t('classes.toast.selectScheduleDay'));
      return;
    }

    const payload: CreateClassDto = {
      name: formName,
      subject_id: formSubjectId,
      tutor_id: formTutorId,
      capacity: Number(formCapacity),
      fee: Number(formFee),
      schedule_days: formScheduleDays,
      schedule_start_time: formStartTime,
      schedule_end_time: formEndTime,
      room: formRoom || undefined,
      package_fee: formPackageFee ? Number(formPackageFee) : null,
      tutor_fee: Number(formTutorFee),
      tutor_fee_mode: formTutorFeeMode,
      tutor_fee_per_student: formTutorFeeMode === 'PER_STUDENT_ATTENDANCE' ? Number(formTutorFeePerStudent) : null,
      status: formStatus,
    };

    if (editingClass) {
      updateClass.mutate(
        { id: editingClass.id, data: payload },
        {
          onSuccess: () => {
            toast.success(t('classes.toast.updated'));
            setShowModal(false);
            setEditingClass(null);
          },
          onError: () => toast.error(t('classes.toast.updateError')),
        }
      );
    } else {
      createClass.mutate(payload, {
        onSuccess: () => {
          toast.success(t('classes.toast.created'));
          setShowModal(false);
        },
        onError: () => toast.error(t('classes.toast.createError')),
      });
    }
  };

  const handleDeleteClass = (cls: Class) => {
    setDeleteTarget(cls);
    setActiveActionMenu(null);
  };

  const confirmDeleteClass = () => {
    if (!deleteTarget) return;
    deleteClass.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t('classes.toast.deleted'));
        setDeleteTarget(null);
        setDeleteConfirmText('');
        setSelectedClassId(null);
      },
      onError: () => toast.error(t('classes.toast.deleteError')),
    });
  };

  const estimateSessionCount = (scheduleDays: string[], duration: number): number => {
    const dayMap: Record<string, number> = {
      Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
      Thursday: 4, Friday: 5, Saturday: 6,
    };
    const targetDays = new Set(scheduleDays.map(d => dayMap[d]));
    const today = new Date();
    let count = 0;
    for (let i = 0; i < duration; i++) {
      if (targetDays.has(getDay(addDays(today, i)))) count++;
    }
    return count;
  };

  const handleGenerateSessions = () => {
    if (!classDetail.data) return;
    const today = new Date();
    const dateFrom = format(today, 'yyyy-MM-dd');
    const dateTo = format(addDays(today, generateDuration - 1), 'yyyy-MM-dd');
    generateSessions.mutate(
      { class_id: classDetail.data.id, date_from: dateFrom, date_to: dateTo },
      {
        onSuccess: (data) => {
          toast.success(t('classes.toast.generateSuccess', { count: data.count }));
          setShowGenerateModal(false);
          setGenerateDuration(30);
        },
        onError: () => toast.error(t('classes.toast.generateError')),
      },
    );
  };

  const currentPage = page;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('classes.title')}</h2>
          <p className="text-zinc-500 text-sm">{t('classes.subtitle')}</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus size={18} />
          {t('classes.registerNewClass')}
        </Button>
      </div>

      {/* Stats Overview */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('classes.totalMonthlyFee')}</p>
              <p className="text-xl font-bold">{formatCurrency(totalRevenue, i18n.language)}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
              <Users size={24} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('classes.totalClasses')}</p>
              <p className="text-xl font-bold">{meta?.total ?? classes.length}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('classes.activeCourses')}</p>
              <p className="text-xl font-bold">{classes.filter(c => c.status === 'ACTIVE').length}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <SearchInput
          placeholder={t('classes.searchPlaceholder')}
          className="w-full sm:max-w-xs"
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
        />
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <select
            className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
            value={filterSubject}
            onChange={(e) => {
              setFilterSubject(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('common.allSubjects')}</option>
            {(subjectsList ?? []).map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
            <span className="text-xs font-medium text-zinc-500">{t('classes.activeOnly')}</span>
            <Switch checked={showOnlyAvailable} onChange={(val: boolean) => {
              setShowOnlyAvailable(val);
              setPage(1);
            }} />
          </div>

          {/* View Mode Toggle */}
          <div className="h-8 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-1" />
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={cn('p-1.5 rounded-md transition-all', viewMode === 'table' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-500')}
              title={t('classes.view.table')}
            >
              <Table2 size={16} />
            </button>
            <button
              onClick={() => setViewMode('timetable')}
              className={cn('p-1.5 rounded-md transition-all', viewMode === 'timetable' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-500')}
              title={t('classes.view.timetable')}
            >
              <Calendar size={16} />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
      <>
      {/* Table */}
      <Card className="p-0 overflow-hidden relative">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('classes.table.className')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('classes.table.subject')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('classes.table.capacity')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('classes.table.tutorSchedule')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('classes.table.fee')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('classes.table.status')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredClasses.length > 0 ? (
                  filteredClasses.map((cls) => (
                    <tr
                      key={cls.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedClassId(cls.id);
                        setActiveActionMenu(null);
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold dark:text-zinc-200">{cls.name}</span>
                          <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-tighter">
                            {t('classes.table.cap', { count: cls.capacity })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          'text-[10px] font-bold px-2 py-1 rounded-md border border-transparent',
                          getSubjectColor(cls.subject.name)
                        )}>
                          {cls.subject.name.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 w-32">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-zinc-500">{cls.enrolled_count ?? 0}/{cls.capacity}</span>
                            <span className="text-zinc-400">{cls.capacity > 0 ? Math.round(((cls.enrolled_count ?? 0) / cls.capacity) * 100) : 0}%</span>
                          </div>
                          <Progress value={cls.enrolled_count ?? 0} max={cls.capacity} />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-sm font-medium dark:text-zinc-300">
                            <User size={14} className="text-zinc-400" />
                            {cls.tutor?.name ?? '—'}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar size={10} /> {cls.schedule_days.join(', ')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> {cls.schedule_start_time} - {cls.schedule_end_time}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold dark:text-zinc-200">{formatCurrency(cls.fee, i18n.language)}</span>
                          <span className="text-[10px] text-zinc-400 font-medium">{t('common.perSession')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={cls.status === 'ACTIVE' ? 'success' : 'default'}>
                          {cls.status === 'ACTIVE' ? t('common.active') : t('common.archived')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            onClick={() => setActiveActionMenu(activeActionMenu === cls.id ? null : cls.id)}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                          <AnimatePresence>
                            {activeActionMenu === cls.id && (
                              <>
                                <div className="fixed inset-0 z-[5]" onClick={() => setActiveActionMenu(null)} />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{ duration: 0.1 }}
                                  className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl z-10 p-1"
                                >
                                  <button
                                    onClick={() => { openEditModal(cls); setActiveActionMenu(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                  >
                                    {t('classes.menu.editClassDetails')}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClass(cls)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors text-red-500"
                                  >
                                    {t('classes.menu.deleteClass')}
                                  </button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                          <Search size={32} className="text-zinc-300" />
                        </div>
                        <h3 className="text-lg font-bold mb-1">{t('classes.noClassesFound')}</h3>
                        <p className="text-zinc-500 text-sm mb-6">{t('classes.noClassesHint')}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/30">
          <span className="text-xs text-zinc-500">
            {t('classes.pagination.page')} <span className="font-bold">{currentPage}</span> {t('classes.pagination.of')} <span className="font-bold">{totalPages}</span>
            {' '}&bull; <span className="font-bold">{meta?.total ?? 0}</span> {t('classes.pagination.totalClasses')}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!meta?.hasPreviousPage}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} />
              {t('common.prev')}
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => Math.abs(p - currentPage) <= 2)
                .map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-bold transition-all',
                      currentPage === p
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                        : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    )}
                  >
                    {p}
                  </button>
                ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta?.hasNextPage}
              onClick={() => setPage(p => p + 1)}
            >
              {t('common.next')}
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Card>
      </>
      ) : (
        <ClassTimetable
          classes={filteredTimetableClasses}
          onClassClick={(id) => setSelectedClassId(id)}
        />
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingClass(null); }}
        title={editingClass ? t('classes.modal.editTitle') : t('classes.modal.createTitle')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="class-name">{t('classes.form.className')}</Label>
              <Input
                id="class-name"
                placeholder={t('classes.form.classNamePlaceholder')}
                value={formName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject">{t('classes.form.subject')}</Label>
              <select
                className="w-full h-10 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100"
                value={formSubjectId}
                onChange={(e) => { setFormSubjectId(e.target.value); setFormTutorId(''); }}
              >
                <option value="">{t('classes.form.selectSubject')}</option>
                {(subjectsList ?? []).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tutor">{t('classes.form.assignTutor')}</Label>
              <select
                className="w-full h-10 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100 disabled:opacity-50"
                value={formTutorId}
                onChange={(e) => setFormTutorId(e.target.value)}
                disabled={!formSubjectId}
              >
                <option value="">{t('classes.form.selectTutor')}</option>
                {(subjectTutors ?? []).map((tutor: { id: string; name?: string; user?: { name: string } }) => (
                  <option key={tutor.id} value={tutor.id}>{tutor.user?.name ?? tutor.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">{t('classes.form.status')}</Label>
              <select
                className="w-full h-10 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as 'ACTIVE' | 'ARCHIVED')}
              >
                <option value="ACTIVE">{t('common.active')}</option>
                <option value="ARCHIVED">{t('common.archived')}</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('classes.form.scheduleDays')}</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleScheduleDay(day)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                    formScheduleDays.includes(day)
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                      : 'bg-white dark:bg-zinc-950 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
                  )}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start-time">{t('classes.form.startTime')}</Label>
              <Input
                id="start-time"
                type="time"
                value={formStartTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-time">{t('classes.form.endTime')}</Label>
              <Input
                id="end-time"
                type="time"
                value={formEndTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="capacity">{t('classes.form.capacity')}</Label>
              <Input
                id="capacity"
                type="number"
                placeholder="25"
                value={formCapacity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormCapacity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fee">
                {billingMode === 'subscription'
                  ? t('classes.form.monthlyFee')
                  : billingMode === 'manual'
                    ? t('classes.form.baseFee')
                    : t('classes.form.feePerSession')}
              </Label>
              <Input
                id="fee"
                type="number"
                placeholder="500000"
                value={formFee}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormFee(e.target.value)}
              />
            </div>
          </div>

          {billingMode === 'package' && (
            <div className="space-y-1.5">
              <Label>{t('classes.form.packageFee')}</Label>
              <Input
                type="number"
                placeholder="700000"
                value={formPackageFee}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormPackageFee(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>{t('classes.form.tutorFeeMode')}</Label>
            <select
              className="h-10 w-full px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
              value={formTutorFeeMode}
              onChange={(e) => setFormTutorFeeMode(e.target.value as any)}
            >
              <option value="FIXED_PER_SESSION">{t('classes.form.feeMode.fixedPerSession')}</option>
              <option value="PER_STUDENT_ATTENDANCE">{t('classes.form.feeMode.perStudentAttendance')}</option>
              <option value="MONTHLY_SALARY">{t('classes.form.feeMode.monthlySalary')}</option>
            </select>
          </div>
          {formTutorFeeMode === 'FIXED_PER_SESSION' && (
            <div className="space-y-1.5">
              <Label>{t('classes.form.tutorFee')}</Label>
              <Input
                type="number"
                placeholder="200000"
                required
                value={formTutorFee}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormTutorFee(e.target.value)}
              />
            </div>
          )}
          {formTutorFeeMode === 'PER_STUDENT_ATTENDANCE' && (
            <div className="space-y-1.5">
              <Label>{t('classes.form.tutorFeePerStudent')}</Label>
              <Input
                type="number"
                placeholder="30000"
                required
                value={formTutorFeePerStudent}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormTutorFeePerStudent(e.target.value)}
              />
            </div>
          )}
          {formTutorFeeMode === 'MONTHLY_SALARY' && (
            <p className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg">
              {t('classes.form.monthlySalaryHint')}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="room">{t('classes.form.room')}</Label>
            <Input
              id="room"
              placeholder={t('classes.form.roomPlaceholder')}
              value={formRoom}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormRoom(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 mt-8">
            <Button
              variant="outline"
              className="flex-1 justify-center"
              onClick={() => { setShowModal(false); setEditingClass(null); }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              className="flex-1 justify-center"
              onClick={handleFormSubmit}
              disabled={createClass.isPending || updateClass.isPending || !formName}
            >
              {editingClass ? t('classes.modal.updateClass') : t('classes.modal.createClass')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteConfirmText(''); }}
        title={t('classes.modal.deleteTitle')}
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
                  <Trash2 size={18} className="text-rose-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-rose-900 dark:text-rose-200">{t('classes.delete.cannotUndo')}</p>
                  <p className="text-sm text-rose-700 dark:text-rose-300 mt-1" dangerouslySetInnerHTML={{ __html: t('classes.delete.permanentDelete', { name: deleteTarget.name }) }} />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delete-confirm" dangerouslySetInnerHTML={{ __html: t('classes.delete.typeDelete') }} />
              <Input
                id="delete-confirm"
                placeholder="delete"
                value={deleteConfirmText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteConfirmText(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 justify-center"
                onClick={() => { setDeleteTarget(null); setDeleteConfirmText(''); }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1 justify-center bg-rose-600 hover:bg-rose-700 text-white"
                onClick={confirmDeleteClass}
                disabled={deleteConfirmText !== 'delete' || deleteClass.isPending}
              >
                {deleteClass.isPending ? t('common.deleting') : t('classes.modal.deleteClass')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Class Detail Drawer */}
      <Drawer
        isOpen={!!selectedClassId}
        onClose={() => setSelectedClassId(null)}
        title={t('classes.drawer.title')}
      >
        {selectedClass && (
          <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 text-2xl font-bold mb-3 shadow-lg">
                {selectedClass.name.charAt(0)}
              </div>
              <h3 className="text-xl font-bold dark:text-zinc-100">{selectedClass.name}</h3>
              <div className="mt-3 flex gap-2">
                <span className={cn(
                  'text-[10px] font-bold px-2 py-1 rounded-md border border-transparent',
                  getSubjectColor(selectedClass.subject.name)
                )}>
                  {selectedClass.subject.name.toUpperCase()}
                </span>
                <Badge variant={selectedClass.status === 'ACTIVE' ? 'success' : 'default'}>
                  {selectedClass.status === 'ACTIVE' ? t('common.active') : t('common.archived')}
                </Badge>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-center">
                <p className="text-[10px] text-zinc-400 uppercase font-bold">{t('classes.drawer.enrolled')}</p>
                <p className="text-lg font-bold dark:text-zinc-100">
                  {classDetail.data?.enrolled_count ?? 0}/{selectedClass.capacity}
                </p>
                <Progress value={classDetail.data?.enrolled_count ?? 0} max={selectedClass.capacity} />
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-center">
                <p className="text-[10px] text-zinc-400 uppercase font-bold">{t('classes.drawer.fee')}</p>
                <p className="text-lg font-bold dark:text-zinc-100">{formatCurrency(Number(selectedClass.fee), i18n.language)}</p>
                <p className="text-[10px] text-zinc-400">{t('classes.drawer.perSession')}</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-center">
                <p className="text-[10px] text-zinc-400 uppercase font-bold">{t('classes.drawer.room')}</p>
                <p className="text-lg font-bold dark:text-zinc-100">{selectedClass.room ?? '—'}</p>
                {!selectedClass.room && <p className="text-[10px] text-zinc-400">{t('classes.drawer.noRoom')}</p>}
              </div>
            </div>

            {/* Tutor Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('classes.drawer.tutor')}</h4>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold">
                  {(selectedClass.tutor?.name ?? '?').charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold dark:text-zinc-200">{selectedClass.tutor?.name ?? '—'}</p>
                  {classDetail.data?.tutor?.email && (
                    <p className="text-xs text-zinc-500">{classDetail.data.tutor.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Schedule Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('classes.drawer.schedule')}</h4>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedClass.schedule_days.map((day) => (
                    <span key={day} className="px-2 py-1 rounded-md bg-zinc-200 dark:bg-zinc-700 text-[10px] font-bold">
                      {day.slice(0, 3)}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                  <Clock size={14} />
                  {selectedClass.schedule_start_time} - {selectedClass.schedule_end_time}
                </div>
              </div>
            </div>

            {/* Enrolled Students Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                {t('classes.drawer.enrolledStudents')} ({classDetail.data?.enrolled_count ?? 0})
              </h4>
              {classDetail.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : classDetail.data?.enrollments?.length ? (
                <div className="space-y-2">
                  {classDetail.data.enrollments.map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold">
                          {enrollment.student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium dark:text-zinc-200">{enrollment.student.name}</p>
                          {enrollment.student.grade && (
                            <p className="text-[10px] text-zinc-400">{enrollment.student.grade}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={enrollment.status === 'ACTIVE' ? 'success' : 'default'}>
                        {enrollment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 text-center py-4">{t('classes.drawer.noStudents')}</p>
              )}
            </div>

            {/* Generate Sessions Button */}
            {classDetail.data?.status === 'ACTIVE' && classDetail.data?.schedule_days?.length > 0 && (
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2"
                  onClick={() => setShowGenerateModal(true)}
                  disabled={classDetail.isLoading}
                >
                  <Calendar size={16} />
                  {t('classes.drawer.generateSessions')}
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                variant="outline"
                className="flex-1 justify-center"
                onClick={() => { openEditModal(selectedClass); setSelectedClassId(null); }}
              >
                {t('classes.drawer.editClass')}
              </Button>
              <Button
                className="flex-1 justify-center bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => handleDeleteClass(selectedClass)}
              >
                {t('classes.drawer.deleteClass')}
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Generate Sessions Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => { setShowGenerateModal(false); setGenerateDuration(30); }}
        title={t('classes.generateModal.title')}
      >
        {classDetail.data && (
          <div className="space-y-5">
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 space-y-2">
              <p className="text-sm font-bold">{classDetail.data.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {classDetail.data.schedule_days?.map((day: string) => (
                  <span key={day} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-full">
                    {day}
                  </span>
                ))}
              </div>
              <p className="text-xs text-zinc-500">
                {classDetail.data.schedule_start_time} - {classDetail.data.schedule_end_time}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>{t('classes.generateModal.duration')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={generateDuration}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenerateDuration(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                  className="w-24"
                />
                <span className="text-sm text-zinc-500">{t('classes.generateModal.days')}</span>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 space-y-2">
              <p className="text-xs text-zinc-500">
                {t('classes.generateModal.dateRange', {
                  from: format(new Date(), 'dd MMM yyyy'),
                  to: format(addDays(new Date(), generateDuration - 1), 'dd MMM yyyy'),
                })}
              </p>
              <p className="text-lg font-bold">
                ~{estimateSessionCount(classDetail.data.schedule_days ?? [], generateDuration)}{' '}
                <span className="text-sm font-normal text-zinc-500">{t('classes.generateModal.estimatedSessions')}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1 justify-center"
                onClick={() => { setShowGenerateModal(false); setGenerateDuration(30); }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1 justify-center"
                onClick={handleGenerateSessions}
                disabled={generateSessions.isPending}
              >
                <Calendar size={16} />
                {generateSessions.isPending ? t('common.processing') : t('classes.generateModal.confirm')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
