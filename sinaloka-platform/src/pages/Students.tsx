import React, { useState, useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Filter,
  MoreHorizontal,
  Download,
  Upload,
  Trash2,
  UserMinus,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Search,
  X,
  CheckCircle2,
  Info,
  FileDown,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Checkbox,
  Drawer,
  Modal,
  SearchInput,
  Input,
  Label,
  Skeleton
} from '../components/UI';
import { cn, formatDate } from '../lib/utils';
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
import type { Student } from '@/src/types/student';

export const Students = () => {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<{ grade?: string; status?: string }>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [visibleColumns, setVisibleColumns] = useState(['name', 'email', 'grade', 'status', 'parent']);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formGrade, setFormGrade] = useState('10th Grade');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formParentName, setFormParentName] = useState('');
  const [formParentPhone, setFormParentPhone] = useState('');
  const [formParentEmail, setFormParentEmail] = useState('');

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const { data, isLoading } = useStudents({ page, limit });
  const { data: overdueSummary } = useOverdueSummary();
  const flaggedStudentIds = new Set(overdueSummary?.flagged_students.map(s => s.student_id) ?? []);
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const importStudents = useImportStudents();
  const exportStudents = useExportStudents();
  const inviteParent = useInviteParent();

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Client-side search/filter on current page data
  const filteredStudents = useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter(s => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.email?.toLowerCase() ?? '').includes(searchQuery.toLowerCase());
      const matchesGrade = !activeFilters.grade || s.grade === activeFilters.grade;
      const matchesStatus =
        !activeFilters.status ||
        s.status === activeFilters.status.toUpperCase();
      return matchesSearch && matchesGrade && matchesStatus;
    });
  }, [data?.data, searchQuery, activeFilters]);

  const meta = data?.meta;

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map(s => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const removeFilter = (key: keyof typeof activeFilters) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setActiveFilters(newFilters);
  };

  const handleImportClick = () => {
    setShowImportModal(true);
    setImportFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    e.target.value = '';
  };

  const handleImportSubmit = () => {
    if (!importFile) return;
    importStudents.mutate(importFile, {
      onSuccess: () => {
        toast.success(t('students.toast.importSuccess'));
        setShowImportModal(false);
        setImportFile(null);
      },
      onError: () => toast.error(t('students.toast.importError')),
    });
  };

  const handleDownloadTemplate = () => {
    const headers = 'name,email,phone,grade,status,parent_name,parent_phone,parent_email';
    const example1 = 'Rina Pelajar,rina@example.com,08121234567,10th Grade,ACTIVE,Budi Pelajar,08129876543,budi@example.com';
    const example2 = 'Dimas Pelajar,,08131234567,11th Grade,ACTIVE,Siti Pelajar,08139876543,';
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
    exportStudents.mutate(undefined, {
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
    setFormGrade('10th Grade');
    setFormStatus('ACTIVE');
    setFormParentName('');
    setFormParentPhone('');
    setFormParentEmail('');
    setShowAddModal(true);
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setFormName(student.name);
    setFormEmail(student.email ?? '');
    setFormPhone(student.phone ?? '');
    setFormGrade(student.grade);
    setFormStatus(student.status);
    setFormParentName(student.parent_name ?? '');
    setFormParentPhone(student.parent_phone ?? '');
    setFormParentEmail(student.parent_email ?? '');
    setShowAddModal(true);
  };

  const handleFormSubmit = () => {
    const payload = {
      name: formName,
      email: formEmail || undefined,
      phone: formPhone || undefined,
      grade: formGrade,
      status: formStatus,
      parent_name: formParentName || undefined,
      parent_phone: formParentPhone || undefined,
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

  const statsTotal = meta?.total ?? data?.data.length ?? 0;
  const statsActive = data?.data.filter(s => s.status === 'ACTIVE').length ?? 0;
  const statsInactive = data?.data.filter(s => s.status === 'INACTIVE').length ?? 0;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('students.title')}</h2>
          <p className="text-zinc-500 text-sm">{t('students.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleImportClick} disabled={importStudents.isPending}>
            <Upload size={16} />
            {importStudents.isPending ? t('students.importing') : t('common.import')}
          </Button>
          <Button variant="outline" className="hidden sm:flex" onClick={handleExportClick} disabled={exportStudents.isPending}>
            <Download size={16} />
            {t('common.export')}
          </Button>
          <Button onClick={openAddModal}>
            <Plus size={18} />
            {t('students.addStudent')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 flex flex-col justify-between h-24">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('students.totalStudents')}</span>
            <span className="text-2xl font-bold">{statsTotal}</span>
          </Card>
          <Card className="p-4 flex flex-col justify-between h-24">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('students.activeStudents')}</span>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-emerald-600">{statsActive}</span>
              {statsTotal > 0 && (
                <Badge variant="success">{((statsActive / statsTotal) * 100).toFixed(0)}%</Badge>
              )}
            </div>
          </Card>
          <Card className="p-4 flex flex-col justify-between h-24">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('students.inactive')}</span>
            <span className="text-2xl font-bold text-zinc-500">{statsInactive}</span>
          </Card>
          <Card className="p-4 flex flex-col justify-between h-24">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('students.totalAllPages')}</span>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-indigo-600">{meta?.total ?? 0}</span>
              <span className="text-[10px] text-zinc-400">{t('common.allRecords')}</span>
            </div>
          </Card>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <SearchInput
            placeholder={t('students.searchPlaceholder')}
            className="w-full sm:max-w-xs"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          />
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            <select
              className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
              onChange={(e) => setActiveFilters(prev => ({ ...prev, grade: e.target.value || undefined }))}
              value={activeFilters.grade || ''}
            >
              <option value="">{t('students.filter.allGrades')}</option>
              <option value="10th Grade">{t('students.filter.10thGrade')}</option>
              <option value="11th Grade">{t('students.filter.11thGrade')}</option>
              <option value="12th Grade">{t('students.filter.12thGrade')}</option>
            </select>
            <select
              className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
              onChange={(e) => setActiveFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
              value={activeFilters.status || ''}
            >
              <option value="">{t('students.filter.allStatus')}</option>
              <option value="ACTIVE">{t('common.active')}</option>
              <option value="INACTIVE">{t('common.inactive')}</option>
            </select>

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setVisibleColumns(prev =>
                    prev.includes('email')
                      ? prev.filter(c => c !== 'email')
                      : [...prev, 'email']
                  )
                }
              >
                {visibleColumns.includes('email') ? <Eye size={14} /> : <EyeOff size={14} />}
                {t('students.table.email')}
              </Button>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(activeFilters.grade || activeFilters.status || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase mr-2">{t('students.activeFilters')}</span>
            {searchQuery && (
              <Badge variant="outline" className="flex items-center gap-1 normal-case font-medium">
                {t('students.filter.search', { query: searchQuery })}
                <X size={12} className="cursor-pointer" onClick={() => setSearchQuery('')} />
              </Badge>
            )}
            {activeFilters.grade && (
              <Badge variant="outline" className="flex items-center gap-1 normal-case font-medium">
                {t('students.filter.grade', { grade: activeFilters.grade })}
                <X size={12} className="cursor-pointer" onClick={() => removeFilter('grade')} />
              </Badge>
            )}
            {activeFilters.status && (
              <Badge variant="outline" className="flex items-center gap-1 normal-case font-medium">
                {t('students.filter.status', { status: activeFilters.status })}
                <X size={12} className="cursor-pointer" onClick={() => removeFilter('status')} />
              </Badge>
            )}
            <button
              onClick={() => { setActiveFilters({}); setSearchQuery(''); }}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              {t('common.clearAll')}
            </button>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <Card className="p-0 overflow-hidden relative pb-0 mb-4">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-360px)] scrollbar-thin">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 z-10">
                  <th className="px-6 py-3 w-10">
                    <Checkbox
                      checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('students.table.name')}</th>
                  {visibleColumns.includes('email') && <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('students.table.email')}</th>}
                  {visibleColumns.includes('grade') && <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('students.table.grade')}</th>}
                  {visibleColumns.includes('parent') && <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('students.table.parentGuardian')}</th>}
                  {visibleColumns.includes('status') && <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('students.table.status')}</th>}
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className={cn(
                        'hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group cursor-pointer',
                        selectedIds.includes(student.id) && 'bg-indigo-50/30 dark:bg-indigo-900/10'
                      )}
                      onClick={() => setSelectedStudent(student)}
                    >
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(student.id)}
                          onChange={() => toggleSelect(student.id)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-400">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <span className="text-sm font-medium dark:text-zinc-200 block">{student.name}</span>
                            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-tighter">ID: {student.id.slice(0, 8)}</span>
                          </div>
                          {flaggedStudentIds.has(student.id) && (
                            <AlertTriangle size={14} className="text-amber-500 shrink-0" title={t('payments.overdueAlert.warning')} />
                          )}
                        </div>
                      </td>
                      {visibleColumns.includes('email') && (
                        <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">{student.email ?? '—'}</td>
                      )}
                      {visibleColumns.includes('grade') && (
                        <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">{student.grade}</td>
                      )}
                      {visibleColumns.includes('parent') && (
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm text-zinc-600 dark:text-zinc-300">{student.parent_name ?? '—'}</span>
                            <span className="text-xs text-zinc-400">{student.parent_phone ?? ''}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.includes('status') && (
                        <td className="px-6 py-4">
                          <Badge variant={student.status === 'ACTIVE' ? 'success' : 'default'}>
                            {student.status === 'ACTIVE' ? t('common.active') : t('common.inactive')}
                          </Badge>
                        </td>
                      )}
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 relative">
                          <div className="relative">
                            <button
                              onClick={() => setActiveActionMenu(activeActionMenu === student.id ? null : student.id)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              <MoreHorizontal size={16} />
                            </button>

                            <AnimatePresence>
                              {activeActionMenu === student.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setActiveActionMenu(null)}
                                  />
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className="absolute right-0 top-full mt-2 w-36 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl z-20 p-1"
                                  >
                                    <button
                                      onClick={() => { handleEditClick(student); setActiveActionMenu(null); }}
                                      className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg flex items-center gap-2"
                                    >
                                      <Eye size={14} /> {t('students.bulk.viewEdit')}
                                    </button>
                                    {student.parent_email && (
                                      <button
                                        onClick={() => {
                                          inviteParent.mutate(
                                            { email: student.parent_email!, student_ids: [student.id] },
                                            {
                                              onSuccess: () => {
                                                toast.success(t('students.toast.inviteSent', { email: student.parent_email }));
                                                setActiveActionMenu(null);
                                              },
                                              onError: (err: any) => toast.error(err?.response?.data?.message || t('students.toast.inviteError')),
                                            }
                                          );
                                          setActiveActionMenu(null);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg flex items-center gap-2"
                                      >
                                        <UserPlus size={14} /> {t('students.bulk.inviteParent')}
                                      </button>
                                    )}
                                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                                    <button
                                      onClick={() => { handleDeleteStudent(student); setActiveActionMenu(null); }}
                                      className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg flex items-center gap-2"
                                    >
                                      <Trash2 size={14} /> {t('common.delete')}
                                    </button>
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
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
                        <h3 className="text-lg font-bold mb-1">{t('students.noStudentsFound')}</h3>
                        <p className="text-zinc-500 text-sm mb-6">{t('students.noStudentsHint')}</p>
                        <Button variant="outline" onClick={() => { setActiveFilters({}); setSearchQuery(''); }}>
                          {t('common.clearAllFilters')}
                        </Button>
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
            {t('common.page')} <span className="font-bold">{page}</span> {t('common.of')} <span className="font-bold">{meta?.totalPages ?? 1}</span>
            {' '}• <span className="font-bold">{meta?.total ?? 0}</span> {t('students.totalStudentsLabel')}
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
              {Array.from({ length: meta?.totalPages ?? 1 }, (_, i) => i + 1)
                .filter(p => Math.abs(p - page) <= 2)
                .map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-bold transition-all',
                      page === p
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

      {/* Bulk Actions Floating Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 border border-white/10 dark:border-black/10">
              <div className="flex items-center gap-2 border-r border-white/20 dark:border-black/20 pr-6">
                <span className="text-sm font-bold">{selectedIds.length}</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider">{t('common.selected')}</span>
              </div>
              <div className="flex items-center gap-2">
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
                onClick={() => setSelectedIds([])}
                className="p-1 hover:bg-white/10 dark:hover:bg-black/5 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student Detail Drawer */}
      <Drawer
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title={t('students.drawer.title')}
      >
        {selectedStudent && (
          <div className="space-y-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-3xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 text-3xl font-bold mb-4 shadow-xl">
                {selectedStudent.name.charAt(0)}
              </div>
              <h3 className="text-2xl font-bold dark:text-zinc-100">{selectedStudent.name}</h3>
              <p className="text-zinc-500">{selectedStudent.grade} {t('students.student')}</p>
              <div className="mt-4 flex gap-2">
                <Badge variant={selectedStudent.status === 'ACTIVE' ? 'success' : 'default'}>
                  {selectedStudent.status === 'ACTIVE' ? t('common.active') : t('common.inactive')}
                </Badge>
                <Badge variant="outline">ID: {selectedStudent.id.slice(0, 8)}</Badge>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('students.drawer.contactInfo')}</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <Mail size={18} className="text-zinc-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">{t('students.drawer.email')}</span>
                    <span className="text-sm dark:text-zinc-200">{selectedStudent.email ?? '—'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <Phone size={18} className="text-zinc-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">{t('students.drawer.phone')}</span>
                    <span className="text-sm dark:text-zinc-200">{selectedStudent.phone ?? '—'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <Calendar size={18} className="text-zinc-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">{t('students.drawer.enrolledDate')}</span>
                    <span className="text-sm dark:text-zinc-200">{formatDate(selectedStudent.enrolled_at ?? selectedStudent.created_at, i18n.language)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('students.drawer.parentGuardian')}</h4>
              <Card className="p-4 border-dashed border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold">
                      {(selectedStudent.parent_name ?? 'P').charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold dark:text-zinc-200">{selectedStudent.parent_name ?? '—'}</p>
                      <p className="text-xs text-zinc-500">{t('students.drawer.primaryContact')}</p>
                      <span className="text-xs text-zinc-400">{selectedStudent.parent_email ?? ''}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 justify-center">
                    <Phone size={14} />
                  </Button>
                </div>
                {selectedStudent.parent_email ? (
                  <Button
                    className="w-full justify-center gap-2"
                    variant="secondary"
                    onClick={() => {
                      inviteParent.mutate(
                        { email: selectedStudent.parent_email!, student_ids: [selectedStudent.id] },
                        {
                          onSuccess: () => toast.success(t('students.toast.inviteSent', { email: selectedStudent.parent_email })),
                          onError: (err: any) => toast.error(err?.response?.data?.message || t('students.toast.inviteError')),
                        }
                      );
                    }}
                    disabled={inviteParent.isPending}
                  >
                    <UserPlus size={16} />
                    {inviteParent.isPending ? t('students.drawer.sending') : t('students.drawer.inviteParent')}
                  </Button>
                ) : (
                  <p className="text-xs text-zinc-500 text-center">{t('students.drawer.noParentEmail')}</p>
                )}
              </Card>
            </div>
          </div>
        )}
      </Drawer>

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingStudent(null); }}
        title={editingStudent ? t('students.modal.editTitle') : t('students.modal.addTitle')}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-name">{t('students.form.fullName')}</Label>
            <Input
              id="new-name"
              placeholder={t('students.form.namePlaceholder')}
              value={formName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-email">{t('students.form.emailAddress')}</Label>
              <Input
                id="new-email"
                type="email"
                placeholder={t('students.form.emailPlaceholder')}
                value={formEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-phone">{t('students.form.phoneNumber')}</Label>
              <Input
                id="new-phone"
                placeholder={t('students.form.phonePlaceholder')}
                value={formPhone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t('students.form.grade')}</Label>
              <select
                className="w-full h-10 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100"
                value={formGrade}
                onChange={(e) => setFormGrade(e.target.value)}
              >
                <option value="10th Grade">{t('students.filter.10thGrade')}</option>
                <option value="11th Grade">{t('students.filter.11thGrade')}</option>
                <option value="12th Grade">{t('students.filter.12thGrade')}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('students.form.status')}</Label>
              <select
                className="w-full h-10 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
              >
                <option value="ACTIVE">{t('common.active')}</option>
                <option value="INACTIVE">{t('common.inactive')}</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-parent-name">{t('students.form.parentName')}</Label>
            <Input
              id="new-parent-name"
              placeholder={t('students.form.parentNamePlaceholder')}
              value={formParentName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormParentName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-parent-phone">{t('students.form.parentPhone')}</Label>
            <Input
              id="new-parent-phone"
              placeholder={t('students.form.parentPhonePlaceholder')}
              value={formParentPhone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormParentPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-parent-email">{t('students.form.parentEmail')}</Label>
            <Input
              id="new-parent-email"
              type="email"
              placeholder={t('students.form.parentEmailPlaceholder')}
              value={formParentEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormParentEmail(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 mt-8">
            <Button
              variant="outline"
              className="flex-1 justify-center"
              onClick={() => { setShowAddModal(false); setEditingStudent(null); }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              className="flex-1 justify-center"
              onClick={handleFormSubmit}
              disabled={createStudent.isPending || updateStudent.isPending || !formName}
            >
              {editingStudent ? t('students.modal.updateStudent') : t('students.modal.createStudent')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteConfirmText(''); }}
        title={t('students.modal.deleteTitle')}
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
                  <Trash2 size={18} className="text-rose-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-rose-900 dark:text-rose-200">{t('students.delete.cannotUndo')}</p>
                  <p className="text-sm text-rose-700 dark:text-rose-300 mt-1"><Trans i18nKey="students.delete.permanentDelete" values={{ name: deleteTarget.name }} components={{ strong: <strong /> }} /></p>

                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delete-confirm" children={<Trans i18nKey="students.delete.typeDelete" components={{ strong: <strong /> }} />} />
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
                onClick={confirmDeleteStudent}
                disabled={deleteConfirmText !== 'delete' || deleteStudent.isPending}
              >
                {deleteStudent.isPending ? t('common.deleting') : t('students.modal.deleteStudent')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={bulkDeleteConfirm}
        onClose={() => { setBulkDeleteConfirm(false); setDeleteConfirmText(''); }}
        title={t('students.modal.bulkDeleteTitle')}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-rose-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-rose-900 dark:text-rose-200">{t('students.delete.cannotUndo')}</p>
                <p className="text-sm text-rose-700 dark:text-rose-300 mt-1"><Trans i18nKey="students.delete.bulkPermanentDelete" values={{ count: selectedIds.length }} components={{ strong: <strong /> }} /></p>

              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-delete-confirm" children={<Trans i18nKey="students.delete.typeDelete" components={{ strong: <strong /> }} />} />
            <Input
              id="bulk-delete-confirm"
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
              onClick={() => { setBulkDeleteConfirm(false); setDeleteConfirmText(''); }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              className="flex-1 justify-center bg-rose-600 hover:bg-rose-700 text-white"
              onClick={confirmBulkDelete}
              disabled={deleteConfirmText !== 'delete' || deleteStudent.isPending}
            >
              {deleteStudent.isPending ? t('common.deleting') : t('students.modal.deleteBulk', { count: selectedIds.length })}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import Students Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => { setShowImportModal(false); setImportFile(null); }}
        title={t('students.modal.importTitle')}
      >
        <div className="space-y-5">
          {/* Instructions */}
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">{t('students.import.howToImport')}</p>
                <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                  <li>{t('students.import.step1')}</li>
                  <li>{t('students.import.step2')}</li>
                  <li>{t('students.import.step3')}</li>
                  <li>{t('students.import.step4')}</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Download Template */}
          <button
            onClick={handleDownloadTemplate}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <FileDown size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium dark:text-zinc-200">{t('students.import.downloadTemplate')}</p>
              <p className="text-xs text-zinc-500">{t('students.import.templateDesc')}</p>
            </div>
          </button>

          {/* CSV Format Preview */}
          <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl space-y-2">
            <p className="text-xs font-bold flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <FileSpreadsheet size={14} className="text-indigo-600" />
              {t('students.import.csvFormat')}
            </p>
            <div className="text-[11px] font-mono text-zinc-500 bg-white dark:bg-zinc-950 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 overflow-x-auto">
              <span className="text-indigo-600 font-semibold">name</span>,<span className="text-indigo-600 font-semibold">email</span>,<span className="text-indigo-600 font-semibold">phone</span>,<span className="text-indigo-600 font-semibold">grade</span>,<span className="text-indigo-600 font-semibold">status</span>,<span className="text-indigo-600 font-semibold">parent_name</span>,<span className="text-indigo-600 font-semibold">parent_phone</span>,<span className="text-indigo-600 font-semibold">parent_email</span><br />
              Rina Pelajar,rina@example.com,0812...,10th Grade,ACTIVE,Budi,0812...,budi@example.com<br />
              Dimas Pelajar,,0813...,11th Grade,ACTIVE,Siti,0813...,
            </div>
            <p className="text-[10px] text-zinc-400"><Trans i18nKey="students.import.fieldsRequired" components={{ strong: <strong /> }} /></p>
          </div>

          {/* Upload Area */}
          <div
            className={cn(
              'border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3 transition-colors cursor-pointer',
              importFile
                ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-indigo-400'
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv"
              onChange={handleFileChange}
            />
            {importFile ? (
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 size={24} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{importFile.name}</p>
                  <p className="text-xs text-zinc-500">{(importFile.size / 1024).toFixed(1)} KB — {t('students.import.clickToChange')}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Upload size={24} className="text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm font-bold dark:text-zinc-200">{t('students.import.clickToUpload')}</p>
                  <p className="text-xs text-zinc-500">{t('students.import.onlyCsv')}</p>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1 justify-center"
              onClick={() => { setShowImportModal(false); setImportFile(null); }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              className="flex-1 justify-center"
              onClick={handleImportSubmit}
              disabled={!importFile || importStudents.isPending}
            >
              <Upload size={16} />
              {importStudents.isPending ? t('students.importing') : t('students.import.importStudents')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
