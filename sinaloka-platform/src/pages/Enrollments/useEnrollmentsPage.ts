import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useEnrollments, useCreateEnrollment, useUpdateEnrollment, useDeleteEnrollment, useImportEnrollments, useExportEnrollments, useBulkUpdateEnrollment, useBulkDeleteEnrollment, useEnrollmentStats } from '@/src/hooks/useEnrollments';
import { useStudents } from '@/src/hooks/useStudents';
import { useClasses } from '@/src/hooks/useClasses';
import { useOverdueSummary } from '@/src/hooks/usePayments';
import type { Enrollment, UpdateEnrollmentDto } from '@/src/types/enrollment';

type EnrollmentStatus = 'ACTIVE' | 'TRIAL' | 'WAITLISTED' | 'DROPPED';

export const useEnrollmentsPage = () => {
  const { t, i18n } = useTranslation();

  const STATUS_LABEL: Record<EnrollmentStatus, string> = {
    ACTIVE: t('enrollments.status.active'),
    TRIAL: t('enrollments.status.trial'),
    WAITLISTED: t('enrollments.status.waitlisted'),
    DROPPED: t('enrollments.status.dropped'),
  };

  const PAYMENT_LABEL: Record<string, string> = {
    NEW: t('enrollments.paymentStatus.new'),
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
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Modal state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [enrollmentType, setEnrollmentType] = useState<'ACTIVE' | 'TRIAL'>('ACTIVE');
  const [autoInvoice, setAutoInvoice] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');

  // Edit modal state
  const [editStatus, setEditStatus] = useState<EnrollmentStatus>('ACTIVE');

  const resetModalState = () => {
    setSelectedStudentIds([]);
    setSelectedClassId('');
    setEnrollmentType('ACTIVE');
    setStudentSearch('');
    setAutoInvoice(true);
  };

  const { data: overdueSummary } = useOverdueSummary();
  const flaggedStudentIds = new Set(overdueSummary?.flagged_students.map(s => s.student_id) ?? []);

  // Queries
  const statsQuery = useEnrollmentStats();
  const enrollmentsQuery = useEnrollments({
    page,
    limit,
    search: debouncedSearch || undefined,
    ...(filterStatus && { status: filterStatus }),
    ...(filterStudentId && { student_id: filterStudentId }),
    ...(filterClassId && { class_id: filterClassId }),
  });
  const studentsQuery = useStudents({ limit: 50, search: studentSearch || undefined });
  const classesQuery = useClasses({ limit: 200 });

  const enrollments: Enrollment[] = enrollmentsQuery.data?.data ?? [];
  const students = studentsQuery.data?.data ?? [];
  const classes = classesQuery.data?.data ?? [];

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Mutations
  const createEnrollment = useCreateEnrollment();
  const updateEnrollment = useUpdateEnrollment();
  const deleteEnrollment = useDeleteEnrollment();
  const importEnrollments = useImportEnrollments();
  const exportEnrollments = useExportEnrollments();
  const bulkUpdate = useBulkUpdateEnrollment();
  const bulkDelete = useBulkDeleteEnrollment();

  const handleSetFilterStatus = (value: EnrollmentStatus | '') => {
    setFilterStatus(value);
    setPage(1);
  };

  const filteredEnrollments = enrollments;

  const filteredStudents = students;

  const handleEnroll = async () => {
    if (selectedStudentIds.length === 0 || !selectedClassId) return;

    const results = await Promise.allSettled(
      selectedStudentIds.map(sid =>
        createEnrollment.mutateAsync({
          student_id: sid,
          class_id: selectedClassId,
          status: enrollmentType,
          ...(autoInvoice && { payment_status: 'PENDING' as const }),
        })
      )
    );

    const succeeded = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

    if (succeeded.length > 0) {
      toast.success(t('enrollments.toast.enrolled', { count: succeeded.length }));
    }

    if (failed.length > 0) {
      const messages = failed.map(r => {
        const err = r.reason;
        return err?.response?.data?.message ?? err?.message ?? t('enrollments.toast.enrollError');
      });
      const uniqueMessages = [...new Set(messages)];
      toast.error(uniqueMessages.join('. '));
    }

    setShowModal(false);
    resetModalState();
  };

  const handleStatusUpdate = (id: string, newStatus: UpdateEnrollmentDto['status']) => {
    if (!newStatus) return;
    updateEnrollment.mutate({ id, data: { status: newStatus } }, {
      onSuccess: () => {
        toast.success(t('enrollments.toast.statusUpdated', { status: STATUS_LABEL[newStatus] }));
        setShowEditModal(false);
      },
      onError: () => toast.error(t('enrollments.toast.statusError')),
    });
  };

  const handleDeleteEnrollment = () => {
    if (!deleteTarget) return;
    deleteEnrollment.mutate(deleteTarget, {
      onSuccess: () => {
        toast.success(t('enrollments.toast.deleted'));
        setDeleteTarget(null);
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

  return {
    t,
    i18n,
    STATUS_LABEL,
    PAYMENT_LABEL,
    page,
    setPage,
    meta: enrollmentsQuery.data?.meta,
    showModal,
    setShowModal: (open: boolean) => {
      setShowModal(open);
      if (!open) resetModalState();
    },
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus: handleSetFilterStatus,
    filterStudentId,
    filterClassId,
    selectedEnrollmentIds,
    setSelectedEnrollmentIds,
    selectedEnrollment,
    setSelectedEnrollment,
    showEditModal,
    setShowEditModal,
    importModal,
    setImportModal,
    selectedStudentIds,
    setSelectedStudentIds,
    selectedClassId,
    setSelectedClassId,
    enrollmentType,
    setEnrollmentType,
    autoInvoice,
    setAutoInvoice,
    studentSearch,
    setStudentSearch,
    editStatus,
    setEditStatus,
    flaggedStudentIds,
    enrollments,
    students,
    classes,
    filteredEnrollments,
    filteredStudents,
    studentsQuery,
    classesQuery,
    importFile,
    setImportFile,
    bulkDeleteConfirm,
    setBulkDeleteConfirm,
    deleteTarget,
    setDeleteTarget,
    createEnrollment,
    updateEnrollment,
    deleteEnrollment,
    importEnrollments,
    exportEnrollments,
    bulkUpdate,
    bulkDelete,
    isLoading,
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    handleEnroll,
    handleStatusUpdate,
    handleDeleteEnrollment,
    handleImportFileChange,
    handleImportSubmit,
    handleExportCsv,
    handleBulkStatusChange,
    handleBulkDelete,
    confirmBulkDelete,
  };
};

export type EnrollmentsPageState = ReturnType<typeof useEnrollmentsPage>;
