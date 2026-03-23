import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  useStudents,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  useImportStudents,
  useExportStudents
} from '@/src/hooks/useStudents';
import { useInviteParent } from '@/src/hooks/useParents';
import { useOverdueSummary } from '@/src/hooks/usePayments';
import { ALL_GRADES } from '../../lib/constants';
import type { Student } from '@/src/types/student';
import type { StudentPaginationMeta } from '@/src/types/common';

export function useStudentPage() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [activeFilters, setActiveFilters] = useState<{ grade?: string; status?: string }>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [visibleColumns, setVisibleColumns] = useState(['name', 'email', 'grade', 'status', 'parent']);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formGrade, setFormGrade] = useState('10th Grade');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formParentName, setFormParentName] = useState('');
  const [formParentPhone, setFormParentPhone] = useState('');
  const [formParentEmail, setFormParentEmail] = useState('');
  const [formCustomGrade, setFormCustomGrade] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const { data, isLoading } = useStudents({
    page,
    limit,
    search: debouncedSearch || undefined,
    grade: activeFilters.grade || undefined,
    status: activeFilters.status?.toUpperCase() as 'ACTIVE' | 'INACTIVE' | undefined,
  });
  const { data: overdueSummary } = useOverdueSummary();
  const flaggedStudentIds = new Set(overdueSummary?.flagged_students.map(s => s.student_id) ?? []);
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const importStudents = useImportStudents();
  const exportStudents = useExportStudents();
  const inviteParent = useInviteParent();

  const meta = data?.meta;

  const toggleSelectAll = () => {
    const students = data?.data ?? [];
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map(s => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    setSelectedIds([]);
  }, [debouncedSearch, activeFilters]);

  const updateFilters = (newFilters: { grade?: string; status?: string }) => {
    setActiveFilters(newFilters);
    setPage(1);
  };

  const removeFilter = (key: keyof typeof activeFilters) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setActiveFilters(newFilters);
    setPage(1);
  };

  const handleImportClick = () => {
    setShowImportModal(true);
  };

  const handleDownloadTemplate = () => {
    const headers = 'name,email,phone,grade,status,parent_name,parent_phone,parent_email';
    const example1 = 'Rina Pelajar,rina@example.com,08121234567,Kelas 10,ACTIVE,Budi Pelajar,08129876543,budi@example.com';
    const example2 = 'Dimas Pelajar,,08131234567,Kelas 11,ACTIVE,Siti Pelajar,08139876543,';
    const csv = [headers, example1, example2].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'students_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportClick = () => {
    const exportParams = {
      search: debouncedSearch || undefined,
      grade: activeFilters.grade || undefined,
      status: activeFilters.status?.toUpperCase() as 'ACTIVE' | 'INACTIVE' | undefined,
    };
    exportStudents.mutate(exportParams, {
      onSuccess: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(t('students.toast.exportSuccess'));
      },
      onError: () => toast.error(t('students.toast.exportError')),
    });
  };

  const handleDeleteStudent = (student: Student) => {
    setDeleteTarget({ id: student.id, name: student.name });
    setDeleteConfirmText('');
  };

  const confirmDeleteStudent = () => {
    if (!deleteTarget) return;
    deleteStudent.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t('students.toast.deleted'));
        setDeleteTarget(null);
        setDeleteConfirmText('');
      },
      onError: () => toast.error(t('students.toast.deleteError')),
    });
  };

  const handleBulkDelete = () => {
    setBulkDeleteConfirm(true);
    setDeleteConfirmText('');
  };

  const confirmBulkDelete = () => {
    Promise.all(
      selectedIds.map(id =>
        deleteStudent.mutateAsync(id).catch(() => null)
      )
    ).then(() => {
      toast.success(t('students.toast.bulkDeleted', { count: selectedIds.length }));
      setSelectedIds([]);
      setBulkDeleteConfirm(false);
      setDeleteConfirmText('');
    });
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormGrade('');
    setFormStatus('ACTIVE');
    setFormParentName('');
    setFormParentPhone('');
    setFormParentEmail('');
    setFormCustomGrade('');
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setFormName(student.name);
    setFormEmail(student.email ?? '');
    setFormPhone(student.phone ?? '');
    const isStandardGrade = ALL_GRADES.some(g => g.value === student.grade);
    if (!isStandardGrade && student.grade) {
      setFormGrade('__custom__');
      setFormCustomGrade(student.grade);
    } else {
      setFormGrade(student.grade);
      setFormCustomGrade('');
    }
    setFormStatus(student.status);
    setFormParentName(student.parent_name ?? '');
    setFormParentPhone(student.parent_phone ?? '');
    setFormParentEmail(student.parent_email ?? '');
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleFormSubmit = () => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = 'Nama lengkap wajib diisi';
    const resolvedGrade = formGrade === '__custom__' ? formCustomGrade : formGrade;
    if (!resolvedGrade.trim()) {
      errors.grade = formGrade === '__custom__' ? 'Kelas wajib diisi' : 'Kelas wajib dipilih';
    }
    if (!formParentName.trim()) errors.parent_name = 'Nama orang tua wajib diisi';
    if (formPhone) {
      const digitsOnly = formPhone.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 13) {
        errors.phone = 'Nomor telepon harus 10-13 digit';
      }
    }
    if (formEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)) {
      errors.email = 'Format email tidak valid';
    }
    if (formParentPhone) {
      const digitsOnly = formParentPhone.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 13) {
        errors.parent_phone = 'Nomor telepon harus 10-13 digit';
      }
    } else if (!formParentPhone.trim()) {
      errors.parent_phone = 'Telepon orang tua wajib diisi';
    }
    if (formParentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formParentEmail)) {
      errors.parent_email = 'Format email tidak valid';
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    const payload = {
      name: formName,
      email: formEmail || undefined,
      phone: formPhone || undefined,
      grade: resolvedGrade,
      status: formStatus,
      parent_name: formParentName,
      parent_phone: formParentPhone,
      parent_email: formParentEmail || undefined,
    };

    if (editingStudent) {
      updateStudent.mutate(
        { id: editingStudent.id, data: payload },
        {
          onSuccess: () => {
            toast.success(t('students.toast.updated'));
            setShowAddModal(false);
            setEditingStudent(null);
          },
          onError: () => toast.error(t('students.toast.updateError')),
        }
      );
    } else {
      createStudent.mutate(payload, {
        onSuccess: () => {
          toast.success(t('students.toast.created'));
          setShowAddModal(false);
        },
        onError: () => toast.error(t('students.toast.createError')),
      });
    }
  };

  const handleImportSubmit = (file: File) => {
    importStudents.mutate(file, {
      onSuccess: () => {
        toast.success(t('students.toast.importSuccess'));
        setShowImportModal(false);
      },
      onError: () => toast.error(t('students.toast.importError')),
    });
  };

  const statsTotal = meta?.total ?? 0;
  const statsActive = (meta as StudentPaginationMeta)?.active_count ?? 0;
  const statsInactive = (meta as StudentPaginationMeta)?.inactive_count ?? 0;

  return {
    t,
    i18n,
    page,
    setPage,
    limit,
    selectedIds,
    setSelectedIds,
    searchQuery,
    setSearchQuery,
    activeFilters,
    setActiveFilters,
    showAddModal,
    setShowAddModal,
    selectedStudent,
    setSelectedStudent,
    visibleColumns,
    setVisibleColumns,
    editingStudent,
    setEditingStudent,
    activeActionMenu,
    setActiveActionMenu,
    showImportModal,
    setShowImportModal,
    formName,
    setFormName,
    formEmail,
    setFormEmail,
    formPhone,
    setFormPhone,
    formGrade,
    setFormGrade,
    formStatus,
    setFormStatus,
    formParentName,
    setFormParentName,
    formParentPhone,
    setFormParentPhone,
    formParentEmail,
    setFormParentEmail,
    formCustomGrade,
    setFormCustomGrade,
    formErrors,
    setFormErrors,
    deleteTarget,
    setDeleteTarget,
    deleteConfirmText,
    setDeleteConfirmText,
    bulkDeleteConfirm,
    setBulkDeleteConfirm,
    data,
    isLoading,
    flaggedStudentIds,
    createStudent,
    updateStudent,
    deleteStudent,
    importStudents,
    exportStudents,
    inviteParent,
    filteredStudents: data?.data ?? [],
    meta,
    toggleSelectAll,
    toggleSelect,
    updateFilters,
    removeFilter,
    handleImportClick,
    handleDownloadTemplate,
    handleExportClick,
    handleDeleteStudent,
    confirmDeleteStudent,
    handleBulkDelete,
    confirmBulkDelete,
    openAddModal,
    handleEditClick,
    handleFormSubmit,
    handleImportSubmit,
    statsTotal,
    statsActive,
    statsInactive,
  };
}
