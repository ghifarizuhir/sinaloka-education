import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  UserPlus,
  MoreHorizontal,
  Search,
  Filter,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  CreditCard,
  ArrowUpRight,
  X,
  Check,
  ChevronDown,
  Info,
  Calendar,
  User,
  BookOpen,
  Trash2,
  Eye,
  EyeOff,
  MessageSquare,
  Edit,
  GraduationCap,
  AlertTriangle
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Modal,
  Input,
  Label,
  SearchInput,
  Checkbox,
  Switch,
  Progress
} from '../components/UI';
import { cn, formatDate } from '../lib/utils';
import { toast } from 'sonner';
import { useEnrollments, useCreateEnrollment, useUpdateEnrollment, useDeleteEnrollment, useCheckConflict, useImportEnrollments, useExportEnrollments, useBulkUpdateEnrollment, useBulkDeleteEnrollment } from '@/src/hooks/useEnrollments';
import { useStudents } from '@/src/hooks/useStudents';
import { useClasses } from '@/src/hooks/useClasses';
import { useOverdueSummary } from '@/src/hooks/usePayments';
import type { Enrollment, UpdateEnrollmentDto } from '@/src/types/enrollment';

type EnrollmentStatus = 'ACTIVE' | 'TRIAL' | 'WAITLISTED' | 'DROPPED';

const getStatusBadge = (status: EnrollmentStatus) => {
  const styles: Record<EnrollmentStatus, string> = {
    ACTIVE: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    TRIAL: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    WAITLISTED: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400',
    DROPPED: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  };
  return styles[status] || styles.WAITLISTED;
};

const getPaymentBadge = (status: string) => {
  const styles: Record<string, string> = {
    PAID: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    PENDING: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    OVERDUE: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  };
  return styles[status] || 'text-zinc-400';
};

export const Enrollments = () => {
  const { t, i18n } = useTranslation();

  const STATUS_LABEL: Record<EnrollmentStatus, string> = {
    ACTIVE: t('enrollments.status.active'),
    TRIAL: t('enrollments.status.trial'),
    WAITLISTED: t('enrollments.status.waitlisted'),
    DROPPED: t('enrollments.status.dropped'),
  };

  const PAYMENT_LABEL: Record<string, string> = {
    PAID: t('enrollments.paymentStatus.paid'),
    PENDING: t('enrollments.paymentStatus.pending'),
    OVERDUE: t('enrollments.paymentStatus.overdue'),
  };

  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<EnrollmentStatus | ''>('');
  const [filterStudentId, setFilterStudentId] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<string[]>([]);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [page] = useState(1);

  // Modal state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [enrollmentType, setEnrollmentType] = useState<'ACTIVE' | 'TRIAL'>('ACTIVE');
  const [autoInvoice, setAutoInvoice] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');

  // Edit modal state
  const [editStatus, setEditStatus] = useState<EnrollmentStatus>('ACTIVE');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: overdueSummary } = useOverdueSummary();
  const flaggedStudentIds = new Set(overdueSummary?.flagged_students.map(s => s.student_id) ?? []);

  // Queries
  const enrollmentsQuery = useEnrollments({
    page,
    limit: 100,
    ...(filterStatus && { status: filterStatus }),
    ...(filterStudentId && { student_id: filterStudentId }),
    ...(filterClassId && { class_id: filterClassId }),
  });
  const studentsQuery = useStudents({ limit: 100 });
  const classesQuery = useClasses({ limit: 100 });

  const enrollments: Enrollment[] = enrollmentsQuery.data?.data ?? [];
  const students = studentsQuery.data?.data ?? [];
  const classes = classesQuery.data?.data ?? [];

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Mutations
  const createEnrollment = useCreateEnrollment();
  const updateEnrollment = useUpdateEnrollment();
  const deleteEnrollment = useDeleteEnrollment();
  const checkConflict = useCheckConflict();
  const importEnrollments = useImportEnrollments();
  const exportEnrollments = useExportEnrollments();
  const bulkUpdate = useBulkUpdateEnrollment();
  const bulkDelete = useBulkDeleteEnrollment();

  const filteredEnrollments = useMemo(() => {
    return enrollments.filter(e => {
      const studentName = e.student?.name ?? '';
      const className = e.class?.name ?? '';
      const matchesSearch = studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            className.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !filterStatus || e.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [enrollments, searchQuery, filterStatus]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students;
    return students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()));
  }, [students, studentSearch]);

  const handleEnroll = () => {
    if (selectedStudentIds.length === 0 || !selectedClassId) return;

    const promises = selectedStudentIds.map(sid =>
      createEnrollment.mutateAsync({
        student_id: sid,
        class_id: selectedClassId,
        status: enrollmentType,
        ...(autoInvoice && { payment_status: 'PENDING' as const }),
      })
    );

    Promise.all(promises)
      .then(() => {
        toast.success(t('enrollments.toast.enrolled', { count: selectedStudentIds.length }));
        setShowModal(false);
        setSelectedStudentIds([]);
        setSelectedClassId('');
      })
      .catch(() => toast.error(t('enrollments.toast.enrollError')));
  };

  const handleStatusUpdate = (id: string, newStatus: UpdateEnrollmentDto['status']) => {
    if (!newStatus) return;
    updateEnrollment.mutate({ id, data: { status: newStatus } }, {
      onSuccess: () => {
        toast.success(t('enrollments.toast.statusUpdated', { status: STATUS_LABEL[newStatus] }));
        setActiveActionMenu(null);
        setShowEditModal(false);
      },
      onError: () => toast.error(t('enrollments.toast.statusError')),
    });
  };

  const handleDeleteEnrollment = (id: string) => {
    if (!confirm(t('enrollments.confirm.deleteEnrollment'))) return;
    deleteEnrollment.mutate(id, {
      onSuccess: () => {
        toast.success(t('enrollments.toast.deleted'));
        setActiveActionMenu(null);
      },
      onError: () => toast.error(t('enrollments.toast.deleteError')),
    });
  };

  const isLoading = enrollmentsQuery.isLoading;

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImportFile(file);
  };

  const handleImportSubmit = () => {
    if (!importFile) return;
    importEnrollments.mutate(importFile, {
      onSuccess: (data: { created: number; skipped: number; errors: { row: number; message: string }[] }) => {
        if (data.errors.length === 0) {
          toast.success(t('enrollments.toast.importSuccess', { count: data.created }));
        } else {
          toast.warning(t('enrollments.toast.importPartial', { created: data.created, errors: data.errors.length }));
        }
        setImportModal(false);
        setImportFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      onError: () => {
        toast.error(t('enrollments.toast.importError'));
      },
    });
  };

  const handleExportCsv = () => {
    const params: Record<string, string> = {};
    if (filterStatus) params.status = filterStatus;
    if (filterStudentId) params.student_id = filterStudentId;
    if (filterClassId) params.class_id = filterClassId;
    exportEnrollments.mutate(params, {
      onSuccess: (data: Blob) => {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `enrollments_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t('enrollments.toast.exportSuccess'));
      },
      onError: () => toast.error(t('enrollments.toast.exportError')),
    });
  };

  const handleBulkStatusChange = (status: EnrollmentStatus) => {
    bulkUpdate.mutate({ ids: selectedEnrollmentIds, status }, {
      onSuccess: (data: { updated: number }) => {
        toast.success(t('enrollments.toast.bulkStatusUpdated', { count: data.updated, status: STATUS_LABEL[status] }));
        setSelectedEnrollmentIds([]);
      },
      onError: () => toast.error(t('enrollments.toast.bulkStatusError')),
    });
  };

  const handleBulkDelete = () => {
    setBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    bulkDelete.mutate(selectedEnrollmentIds, {
      onSuccess: (data: { deleted: number }) => {
        toast.success(t('enrollments.toast.bulkDeleted', { count: data.deleted }));
        setSelectedEnrollmentIds([]);
        setBulkDeleteConfirm(false);
      },
      onError: () => toast.error(t('enrollments.toast.bulkDeleteError')),
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t('enrollments.title')}</h2>
            <p className="text-zinc-500 text-sm">{t('enrollments.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportModal(true)}>
              <Upload size={16} />
              {t('enrollments.bulkImport')}
            </Button>
            <Button onClick={() => setShowModal(true)}>
              <UserPlus size={18} />
              {t('enrollments.newEnrollment')}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col justify-between h-24">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('enrollments.totalActive')}</span>
          <span className="text-2xl font-bold">{enrollments.filter(e => e.status === 'ACTIVE').length}</span>
        </Card>
        <Card className="p-4 flex flex-col justify-between h-24">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('enrollments.onTrial')}</span>
          <span className="text-2xl font-bold text-indigo-600">{enrollments.filter(e => e.status === 'TRIAL').length}</span>
        </Card>
        <Card className="p-4 flex flex-col justify-between h-24">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('enrollments.waitlisted')}</span>
          <span className="text-2xl font-bold text-zinc-500">{enrollments.filter(e => e.status === 'WAITLISTED').length}</span>
        </Card>
        <Card className="p-4 flex flex-col justify-between h-24">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('enrollments.overdueInvoices')}</span>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-red-500">{enrollments.filter(e => e.payment_status === 'OVERDUE').length}</span>
            <Badge variant="error">{t('common.actionRequired')}</Badge>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <SearchInput
          placeholder={t('enrollments.searchPlaceholder')}
          className="w-full sm:max-w-xs"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as EnrollmentStatus | '')}
          >
            <option value="">{t('common.allStatuses')}</option>
            <option value="ACTIVE">{t('enrollments.status.active')}</option>
            <option value="TRIAL">{t('enrollments.status.trial')}</option>
            <option value="WAITLISTED">{t('enrollments.status.waitlisted')}</option>
            <option value="DROPPED">{t('enrollments.status.dropped')}</option>
          </select>
          <Button variant="outline" size="sm" className="ml-auto" onClick={handleExportCsv} disabled={exportEnrollments.isPending}>
            <Download size={14} />
            {t('enrollments.exportCsv')}
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <Card className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden relative">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-4 w-10">
                    <Checkbox
                      checked={selectedEnrollmentIds.length === filteredEnrollments.length && filteredEnrollments.length > 0}
                      onChange={() => {
                        if (selectedEnrollmentIds.length === filteredEnrollments.length) setSelectedEnrollmentIds([]);
                        else setSelectedEnrollmentIds(filteredEnrollments.map(e => e.id));
                      }}
                    />
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('enrollments.table.student')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('enrollments.table.class')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('enrollments.table.enrollmentDate')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('enrollments.table.payment')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('enrollments.table.status')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredEnrollments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-400 text-sm">{t('enrollments.noEnrollmentsFound')}</td>
                  </tr>
                )}
                {filteredEnrollments.map((enroll) => (
                  <tr key={enroll.id} className={cn("hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group", flaggedStudentIds.has(enroll.student_id) && 'bg-amber-50/30 dark:bg-amber-900/10')}>
                    <td className="px-6 py-4">
                      <Checkbox
                        checked={selectedEnrollmentIds.includes(enroll.id)}
                        onChange={() => {
                          setSelectedEnrollmentIds(prev => prev.includes(enroll.id) ? prev.filter(id => id !== enroll.id) : [...prev, enroll.id]);
                        }}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 group/link cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                          {(enroll.student?.name ?? '?').charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium dark:text-zinc-200 group-hover/link:text-indigo-600 transition-colors">
                            {enroll.student?.name ?? '—'}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">ID: {enroll.student_id.slice(0, 8)}</span>
                        </div>
                        <ArrowUpRight size={12} className="text-zinc-300 opacity-0 group-hover/link:opacity-100 transition-all" />
                        {flaggedStudentIds.has(enroll.student_id) && (
                          <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col group/link cursor-pointer">
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-zinc-600 dark:text-zinc-300 font-medium group-hover/link:text-indigo-600 transition-colors">
                            {enroll.class?.name ?? '—'}
                          </span>
                          <ArrowUpRight size={12} className="text-zinc-300 opacity-0 group-hover/link:opacity-100 transition-all" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {enroll.enrolled_at ? formatDate(enroll.enrolled_at.split('T')[0], i18n.language) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", getPaymentBadge(enroll.payment_status))}>
                          {PAYMENT_LABEL[enroll.payment_status] ?? enroll.payment_status}
                        </span>
                        {enroll.payment_status === 'OVERDUE' && (
                          <button className="p-1 text-zinc-400 hover:text-indigo-600 transition-colors" title={t('enrollments.menu.sendReminder')}>
                            <CreditCard size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getStatusBadge(enroll.status)}>
                        {STATUS_LABEL[enroll.status] ?? enroll.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative">
                        <button
                          onClick={() => setActiveActionMenu(activeActionMenu === enroll.id ? null : enroll.id)}
                          className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <MoreHorizontal size={18} />
                        </button>

                        <AnimatePresence>
                          {activeActionMenu === enroll.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActiveActionMenu(null)}
                              />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl z-20 p-1"
                              >
                                <button
                                  onClick={() => { setSelectedEnrollment(enroll); setEditStatus(enroll.status); setShowEditModal(true); setActiveActionMenu(null); }}
                                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg flex items-center gap-2"
                                >
                                  <Edit size={14} /> {t('enrollments.menu.editEnrollment')}
                                </button>

                                <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                                <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('enrollments.menu.updateStatus')}</div>

                                {enroll.status !== 'ACTIVE' && (
                                  <button
                                    onClick={() => handleStatusUpdate(enroll.id, 'ACTIVE')}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg flex items-center gap-2"
                                  >
                                    <CheckCircle2 size={14} /> {t('enrollments.menu.setActive')}
                                  </button>
                                )}

                                {enroll.status === 'TRIAL' && (
                                  <button
                                    onClick={() => handleStatusUpdate(enroll.id, 'ACTIVE')}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg flex items-center gap-2"
                                  >
                                    <GraduationCap size={14} /> {t('enrollments.menu.convertToFull')}
                                  </button>
                                )}

                                {enroll.status !== 'DROPPED' && (
                                  <button
                                    onClick={() => handleStatusUpdate(enroll.id, 'DROPPED')}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg flex items-center gap-2"
                                  >
                                    <UserPlus size={14} className="rotate-45" /> {t('enrollments.menu.drop')}
                                  </button>
                                )}

                                <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

                                <button
                                  onClick={() => handleDeleteEnrollment(enroll.id)}
                                  className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg flex items-center gap-2"
                                >
                                  <Trash2 size={14} /> {t('enrollments.menu.deleteRecord')}
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* New Enrollment Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={t('enrollments.modal.newTitle')}
        className="max-w-4xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">{t('enrollments.form.step1')}</Label>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                  <Search size={14} className="text-zinc-400" />
                  <input
                    placeholder={t('enrollments.form.searchStudents')}
                    className="bg-transparent text-xs focus:outline-none w-full"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2 space-y-1 scrollbar-thin">
                  {studentsQuery.isLoading ? (
                    <div className="p-4 text-center text-xs text-zinc-400">{t('enrollments.form.loadingStudents')}</div>
                  ) : filteredStudents.map(student => (
                    <div
                      key={student.id}
                      onClick={() => setSelectedStudentIds(prev => prev.includes(student.id) ? prev.filter(id => id !== student.id) : [...prev, student.id])}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
                        selectedStudentIds.includes(student.id) ? "bg-indigo-50 dark:bg-indigo-900/20" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold">
                          {student.name.charAt(0)}
                        </div>
                        <span className="text-xs font-medium dark:text-zinc-200">{student.name}</span>
                      </div>
                      {selectedStudentIds.includes(student.id) && <Check size={14} className="text-indigo-600" />}
                    </div>
                  ))}
                </div>
              </div>
              {selectedStudentIds.length > 0 && (
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                  {t('enrollments.form.studentsSelected', { count: selectedStudentIds.length })}
                </p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">{t('enrollments.form.step2')}</Label>
              <div className="max-h-[220px] overflow-y-auto pr-2 space-y-2 scrollbar-thin">
                {classesQuery.isLoading ? (
                  <div className="p-4 text-center text-xs text-zinc-400">{t('enrollments.form.loadingClasses')}</div>
                ) : classes.map(cls => (
                  <div
                    key={cls.id}
                    onClick={() => setSelectedClassId(cls.id)}
                    className={cn(
                      "p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden",
                      selectedClassId === cls.id
                        ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10"
                        : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-300"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold dark:text-zinc-200">{cls.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] text-zinc-500 font-medium">
                      <span>{cls.subject ?? ''}</span>
                      {cls.tutor_id && <span className="flex items-center gap-1"><User size={10} /> {t('enrollments.form.tutorAssigned')}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px]">{t('enrollments.form.type')}</Label>
                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                  <button
                    onClick={() => setEnrollmentType('ACTIVE')}
                    className={cn(
                      "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                      enrollmentType === 'ACTIVE' ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
                    )}
                  >
                    {t('enrollments.status.active')}
                  </button>
                  <button
                    onClick={() => setEnrollmentType('TRIAL')}
                    className={cn(
                      "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                      enrollmentType === 'TRIAL' ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
                    )}
                  >
                    {t('enrollments.status.trial')}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                  <DollarSign size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold dark:text-zinc-200">{t('enrollments.form.autoInvoice')}</p>
                </div>
              </div>
              <Switch checked={autoInvoice} onChange={setAutoInvoice} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-8 border-t border-zinc-100 dark:border-zinc-800 mt-6">
          <Button variant="outline" className="flex-1 justify-center" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
          <Button
            className="flex-1 justify-center"
            onClick={handleEnroll}
            disabled={createEnrollment.isPending || selectedStudentIds.length === 0 || !selectedClassId}
          >
            {createEnrollment.isPending ? t('common.processing') : t('enrollments.form.enrollStudents', { count: selectedStudentIds.length || '' })}
          </Button>
        </div>
      </Modal>

      {/* Edit Enrollment Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t('enrollments.modal.editTitle')}
      >
        {selectedEnrollment && (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold">
                  {(selectedEnrollment.student?.name ?? '?').charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold dark:text-zinc-100">{selectedEnrollment.student?.name ?? '—'}</p>
                  <p className="text-xs text-zinc-500">{selectedEnrollment.class?.name ?? '—'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('enrollments.form.enrollmentStatus')}</Label>
              <select
                className="w-full h-10 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as EnrollmentStatus)}
              >
                <option value="ACTIVE">{t('enrollments.status.active')}</option>
                <option value="TRIAL">{t('enrollments.status.trial')}</option>
                <option value="WAITLISTED">{t('enrollments.status.waitlisted')}</option>
                <option value="DROPPED">{t('enrollments.status.dropped')}</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => setShowEditModal(false)}>{t('common.cancel')}</Button>
              <Button
                className="flex-1 justify-center"
                onClick={() => handleStatusUpdate(selectedEnrollment.id, editStatus)}
                disabled={updateEnrollment.isPending}
              >
                {updateEnrollment.isPending ? t('common.saving') : t('common.saveChanges')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={importModal}
        onClose={() => { setImportModal(false); setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
        title={t('enrollments.modal.importTitle')}
      >
        <div className="space-y-6">
          <div
            className={cn(
              "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 transition-colors cursor-pointer",
              importFile
                ? "border-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10"
                : "border-zinc-200 dark:border-zinc-800 hover:border-indigo-400"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
              <Upload size={32} />
            </div>
            <div>
              {importFile ? (
                <>
                  <p className="text-sm font-bold text-emerald-600">{importFile.name}</p>
                  <p className="text-xs text-zinc-500">{t('enrollments.import.clickToUpload')}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold dark:text-zinc-200">{t('enrollments.import.clickToUpload')}</p>
                  <p className="text-xs text-zinc-500">{t('enrollments.import.csvMapDesc')}</p>
                </>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportFileChange} />
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl space-y-2">
            <p className="text-xs font-bold flex items-center gap-2">
              <Info size={14} className="text-indigo-600" />
              {t('enrollments.import.csvFormatGuide')}
            </p>
            <div className="text-[10px] font-mono text-zinc-500 bg-white dark:bg-zinc-950 p-2 rounded border border-zinc-100 dark:border-zinc-800">
              student_id, class_id, status<br />
              550e8400-e29b-41d4-a716-446655440000, 6ba7b810-9dad-11d1-80b4-00c04fd430c8, ACTIVE<br />
              7c9e6679-7425-40de-944b-e07fc1f90ae7, 6ba7b810-9dad-11d1-80b4-00c04fd430c8, TRIAL
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">{t('enrollments.import.uuidNote')}</p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="flex-1 justify-center" onClick={() => { setImportModal(false); setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>{t('common.cancel')}</Button>
            <Button
              className="flex-1 justify-center"
              onClick={handleImportSubmit}
              disabled={!importFile || importEnrollments.isPending}
            >
              {importEnrollments.isPending ? t('common.processing') : t('enrollments.import.processImport')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Actions Floating Bar */}
      <AnimatePresence>
        {selectedEnrollmentIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 border border-white/10 dark:border-black/10">
              <div className="flex items-center gap-2 border-r border-white/20 dark:border-black/20 pr-6">
                <span className="text-sm font-bold">{selectedEnrollmentIds.length}</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider">{t('common.selected')}</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="h-8 px-2 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 dark:border-black/20 text-xs font-medium focus:outline-none"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) handleBulkStatusChange(e.target.value as EnrollmentStatus);
                    e.target.value = '';
                  }}
                >
                  <option value="" disabled>{t('enrollments.bulk.changeStatus')}</option>
                  <option value="ACTIVE">{t('enrollments.status.active')}</option>
                  <option value="TRIAL">{t('enrollments.status.trial')}</option>
                  <option value="WAITLISTED">{t('enrollments.status.waitlisted')}</option>
                  <option value="DROPPED">{t('enrollments.status.dropped')}</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                  onClick={handleBulkDelete}
                >
                  <Trash2 size={14} />
                  {t('common.delete')}
                </Button>
              </div>
              <button
                onClick={() => setSelectedEnrollmentIds([])}
                className="p-1 hover:bg-white/10 dark:hover:bg-black/5 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        title={t('enrollments.bulk.confirmDeleteTitle')}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-rose-900 dark:text-rose-200">{t('enrollments.bulk.confirmDeleteMessage', { count: selectedEnrollmentIds.length })}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 justify-center"
              onClick={() => setBulkDeleteConfirm(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              className="flex-1 justify-center bg-rose-600 hover:bg-rose-700 text-white"
              onClick={confirmBulkDelete}
              disabled={bulkDelete.isPending}
            >
              {bulkDelete.isPending ? t('common.deleting') : t('enrollments.bulk.confirmDelete', { count: selectedEnrollmentIds.length })}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
