import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  useClasses,
  useClass,
  useCreateClass,
  useUpdateClass,
  useDeleteClass
} from '@/src/hooks/useClasses';
import { useSubjects, useSubjectTutors } from '@/src/hooks/useSubjects';
import { useBillingSettings, useAcademicSettings } from '@/src/hooks/useSettings';
import { useGenerateSessions } from '@/src/hooks/useSessions';
import { format, addDays, getDay } from 'date-fns';
import type { Class, CreateClassDto, ScheduleDay, ClassScheduleItem } from '@/src/types/class';
import { useQuery } from '@tanstack/react-query';
import { classesService } from '../../services/classes.service';

export const DAYS_OF_WEEK: ScheduleDay[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function getSubjectColor(name: string): string {
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

export function useClassesPage() {
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
  const [formSchedules, setFormSchedules] = useState<ClassScheduleItem[]>([]);
  const [formRoom, setFormRoom] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  const { data, isLoading } = useClasses({ page, limit });
  const { data: allClassesData } = useClasses({ page: 1, limit: 100 });
  const { data: subjectsList } = useSubjects();
  const { data: subjectTutors } = useSubjectTutors(formSubjectId || null);
  const { data: billingSettings } = useBillingSettings();
  const { data: academicSettings } = useAcademicSettings();
  const billingMode = billingSettings?.billing_mode ?? 'manual';
  const availableRooms = (academicSettings?.rooms ?? []).filter(r => r.status === 'Available');
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  const deleteClass = useDeleteClass();
  const classDetail = useClass(selectedClassId);

  const { data: tutorClassesData } = useQuery({
    queryKey: ['classes', 'tutor-preview', formTutorId],
    queryFn: () => classesService.getAll({ tutor_id: formTutorId!, limit: 100 }),
    enabled: !!formTutorId,
  });
  const tutorClasses = tutorClassesData?.data ?? [];

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
    setFormSchedules([]);
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
    setFormSchedules(cls.schedules?.map(s => ({ day: s.day as ScheduleDay, start_time: s.start_time, end_time: s.end_time })) ?? []);
    setFormRoom(cls.room ?? '');
    setFormPackageFee(cls.package_fee ? String(cls.package_fee) : '');
    setFormTutorFee(String(cls.tutor_fee ?? 0));
    setFormTutorFeeMode(cls.tutor_fee_mode ?? 'FIXED_PER_SESSION');
    setFormTutorFeePerStudent(cls.tutor_fee_per_student ? String(cls.tutor_fee_per_student) : '');
    setFormStatus(cls.status);
    setShowModal(true);
  };

  const toggleScheduleDay = (day: ScheduleDay) => {
    setFormSchedules(prev => {
      const exists = prev.find(s => s.day === day);
      if (exists) return prev.filter(s => s.day !== day);
      return [...prev, { day, start_time: '14:00', end_time: '15:30' }];
    });
  };

  const handleFormSubmit = () => {
    if (!formTutorId) {
      toast.error(t('classes.toast.selectTutor'));
      return;
    }
    if (formSchedules.length === 0) {
      toast.error(t('classes.toast.selectScheduleDay'));
      return;
    }

    // Check for tutor schedule conflicts
    const otherClasses = tutorClasses.filter(c => c.id !== editingClass?.id);
    for (const schedule of formSchedules) {
      for (const cls of otherClasses) {
        for (const s of cls.schedules) {
          if (
            s.day === schedule.day &&
            schedule.start_time < s.end_time &&
            s.start_time < schedule.end_time
          ) {
            toast.error(t('classes.toast.scheduleConflict', {
              day: schedule.day.slice(0, 3),
              time: `${schedule.start_time}-${schedule.end_time}`,
              className: cls.name,
              conflictTime: `${s.start_time}-${s.end_time}`,
            }));
            return;
          }
        }
      }
    }

    const payload: CreateClassDto = {
      name: formName,
      subject_id: formSubjectId,
      tutor_id: formTutorId,
      capacity: Number(formCapacity),
      fee: Number(formFee),
      schedules: formSchedules.map(s => ({ day: s.day, start_time: s.start_time, end_time: s.end_time })),
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

  const estimateSessionCount = (schedules: { day: string }[], duration: number): number => {
    const dayMap: Record<string, number> = {
      Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
      Thursday: 4, Friday: 5, Saturday: 6,
    };
    const targetDays = new Set(schedules.map(s => dayMap[s.day]));
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

  return {
    t,
    i18n,
    page,
    setPage,
    showModal,
    setShowModal,
    editingClass,
    setEditingClass,
    searchQuery,
    setSearchQuery,
    filterSubject,
    setFilterSubject,
    showOnlyAvailable,
    setShowOnlyAvailable,
    activeActionMenu,
    setActiveActionMenu,
    deleteTarget,
    setDeleteTarget,
    deleteConfirmText,
    setDeleteConfirmText,
    selectedClassId,
    setSelectedClassId,
    showGenerateModal,
    setShowGenerateModal,
    generateDuration,
    setGenerateDuration,
    viewMode,
    setViewMode,
    generateSessions,
    formName,
    setFormName,
    formSubjectId,
    setFormSubjectId,
    formTutorId,
    setFormTutorId,
    formCapacity,
    setFormCapacity,
    formFee,
    setFormFee,
    formPackageFee,
    setFormPackageFee,
    formTutorFee,
    setFormTutorFee,
    formTutorFeeMode,
    setFormTutorFeeMode,
    formTutorFeePerStudent,
    setFormTutorFeePerStudent,
    formSchedules,
    setFormSchedules,
    formRoom,
    setFormRoom,
    formStatus,
    setFormStatus,
    isLoading,
    subjectsList,
    subjectTutors,
    billingMode,
    createClass,
    updateClass,
    deleteClass,
    classDetail,
    tutorClasses,
    classes,
    meta,
    filteredClasses,
    filteredTimetableClasses,
    selectedClass,
    totalRevenue,
    openAddModal,
    openEditModal,
    toggleScheduleDay,
    handleFormSubmit,
    handleDeleteClass,
    confirmDeleteClass,
    estimateSessionCount,
    handleGenerateSessions,
    availableRooms,
    currentPage,
    totalPages,
  };
}
