import React, { useState, useMemo } from 'react';
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
  MessageSquare,
  CheckCircle2
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
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import {
  useStudents,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  useImportStudents,
  useExportStudents
} from '@/src/hooks/useStudents';
import type { Student } from '@/src/types/student';

export const Students = () => {
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

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formGrade, setFormGrade] = useState('10th Grade');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formParentName, setFormParentName] = useState('');
  const [formParentPhone, setFormParentPhone] = useState('');

  const { data, isLoading } = useStudents({ page, limit });
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const importStudents = useImportStudents();
  const exportStudents = useExportStudents();

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
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importStudents.mutate(file, {
      onSuccess: () => toast.success('Students imported successfully'),
      onError: () => toast.error('Failed to import students'),
    });
    e.target.value = '';
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
        toast.success('Students exported');
      },
      onError: () => toast.error('Failed to export students'),
    });
  };

  const handleDeleteStudent = (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    deleteStudent.mutate(id, {
      onSuccess: () => toast.success('Student deleted'),
      onError: () => toast.error('Failed to delete student'),
    });
  };

  const handleBulkDelete = () => {
    if (!confirm(`Delete ${selectedIds.length} students?`)) return;
    Promise.all(
      selectedIds.map(id =>
        deleteStudent.mutateAsync(id).catch(() => null)
      )
    ).then(() => {
      toast.success(`${selectedIds.length} students deleted`);
      setSelectedIds([]);
    });
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setFormName('');
    setFormEmail('');
    setFormGrade('10th Grade');
    setFormStatus('ACTIVE');
    setFormParentName('');
    setFormParentPhone('');
    setShowAddModal(true);
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setFormName(student.name);
    setFormEmail(student.email ?? '');
    setFormGrade(student.grade);
    setFormStatus(student.status);
    setFormParentName(student.parent_name ?? '');
    setFormParentPhone(student.parent_phone ?? '');
    setShowAddModal(true);
  };

  const handleFormSubmit = () => {
    const payload = {
      name: formName,
      email: formEmail || undefined,
      grade: formGrade,
      status: formStatus,
      parent_name: formParentName || undefined,
      parent_phone: formParentPhone || undefined,
    };

    if (editingStudent) {
      updateStudent.mutate(
        { id: editingStudent.id, data: payload },
        {
          onSuccess: () => {
            toast.success('Student updated');
            setShowAddModal(false);
            setEditingStudent(null);
          },
          onError: () => toast.error('Failed to update student'),
        }
      );
    } else {
      createStudent.mutate(payload, {
        onSuccess: () => {
          toast.success('Student created');
          setShowAddModal(false);
        },
        onError: () => toast.error('Failed to create student'),
      });
    }
  };

  const statsTotal = meta?.total ?? data?.data.length ?? 0;
  const statsActive = data?.data.filter(s => s.status === 'ACTIVE').length ?? 0;
  const statsInactive = data?.data.filter(s => s.status === 'INACTIVE').length ?? 0;

  return (
    <div className="space-y-6 pb-20">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Students</h2>
          <p className="text-zinc-500 text-sm">Manage and track your student directory.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleImportClick} disabled={importStudents.isPending}>
            <Upload size={16} />
            {importStudents.isPending ? 'Importing...' : 'Import'}
          </Button>
          <Button variant="outline" className="hidden sm:flex" onClick={handleExportClick} disabled={exportStudents.isPending}>
            <Download size={16} />
            Export
          </Button>
          <Button onClick={openAddModal}>
            <Plus size={18} />
            Add Student
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
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Students</span>
            <span className="text-2xl font-bold">{statsTotal}</span>
          </Card>
          <Card className="p-4 flex flex-col justify-between h-24">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Students</span>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-emerald-600">{statsActive}</span>
              {statsTotal > 0 && (
                <Badge variant="success">{((statsActive / statsTotal) * 100).toFixed(0)}%</Badge>
              )}
            </div>
          </Card>
          <Card className="p-4 flex flex-col justify-between h-24">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Inactive</span>
            <span className="text-2xl font-bold text-zinc-500">{statsInactive}</span>
          </Card>
          <Card className="p-4 flex flex-col justify-between h-24">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total (All Pages)</span>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-indigo-600">{meta?.total ?? 0}</span>
              <span className="text-[10px] text-zinc-400">All Records</span>
            </div>
          </Card>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <SearchInput
            placeholder="Search by name or email..."
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
              <option value="">All Grades</option>
              <option value="10th Grade">10th Grade</option>
              <option value="11th Grade">11th Grade</option>
              <option value="12th Grade">12th Grade</option>
            </select>
            <select
              className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
              onChange={(e) => setActiveFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
              value={activeFilters.status || ''}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
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
                Email
              </Button>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(activeFilters.grade || activeFilters.status || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase mr-2">Active Filters:</span>
            {searchQuery && (
              <Badge variant="outline" className="flex items-center gap-1 normal-case font-medium">
                Search: {searchQuery}
                <X size={12} className="cursor-pointer" onClick={() => setSearchQuery('')} />
              </Badge>
            )}
            {activeFilters.grade && (
              <Badge variant="outline" className="flex items-center gap-1 normal-case font-medium">
                Grade: {activeFilters.grade}
                <X size={12} className="cursor-pointer" onClick={() => removeFilter('grade')} />
              </Badge>
            )}
            {activeFilters.status && (
              <Badge variant="outline" className="flex items-center gap-1 normal-case font-medium">
                Status: {activeFilters.status}
                <X size={12} className="cursor-pointer" onClick={() => removeFilter('status')} />
              </Badge>
            )}
            <button
              onClick={() => { setActiveFilters({}); setSearchQuery(''); }}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <Card className="p-0 overflow-hidden relative">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-3 w-10">
                    <Checkbox
                      checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Name</th>
                  {visibleColumns.includes('email') && <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Email</th>}
                  {visibleColumns.includes('grade') && <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Grade</th>}
                  {visibleColumns.includes('parent') && <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Parent/Guardian</th>}
                  {visibleColumns.includes('status') && <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>}
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
                            {student.status === 'ACTIVE' ? 'Active' : 'Inactive'}
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
                                      <Eye size={14} /> View / Edit
                                    </button>
                                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                                    <button
                                      onClick={() => { handleDeleteStudent(student.id); setActiveActionMenu(null); }}
                                      className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg flex items-center gap-2"
                                    >
                                      <Trash2 size={14} /> Delete
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
                        <h3 className="text-lg font-bold mb-1">No students found</h3>
                        <p className="text-zinc-500 text-sm mb-6">Try adjusting your search or filters to find what you're looking for.</p>
                        <Button variant="outline" onClick={() => { setActiveFilters({}); setSearchQuery(''); }}>
                          Clear all filters
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
            Page <span className="font-bold">{page}</span> of <span className="font-bold">{meta?.totalPages ?? 1}</span>
            {' '}• <span className="font-bold">{meta?.total ?? 0}</span> total students
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!meta?.hasPreviousPage}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} />
              Prev
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
              Next
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
                <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider">Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                  onClick={handleBulkDelete}
                >
                  <Trash2 size={14} />
                  Delete
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
        title="Student Profile"
      >
        {selectedStudent && (
          <div className="space-y-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-3xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 text-3xl font-bold mb-4 shadow-xl">
                {selectedStudent.name.charAt(0)}
              </div>
              <h3 className="text-2xl font-bold dark:text-zinc-100">{selectedStudent.name}</h3>
              <p className="text-zinc-500">{selectedStudent.grade} Student</p>
              <div className="mt-4 flex gap-2">
                <Badge variant={selectedStudent.status === 'ACTIVE' ? 'success' : 'default'}>
                  {selectedStudent.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant="outline">ID: {selectedStudent.id.slice(0, 8)}</Badge>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Contact Information</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <Mail size={18} className="text-zinc-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Email</span>
                    <span className="text-sm dark:text-zinc-200">{selectedStudent.email ?? '—'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <Phone size={18} className="text-zinc-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Phone</span>
                    <span className="text-sm dark:text-zinc-200">{selectedStudent.phone ?? '—'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <Calendar size={18} className="text-zinc-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Enrolled Date</span>
                    <span className="text-sm dark:text-zinc-200">{selectedStudent.enrolled_at ?? selectedStudent.created_at}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Parent/Guardian</h4>
              <Card className="p-4 border-dashed border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold">
                      {(selectedStudent.parent_name ?? 'P').charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold dark:text-zinc-200">{selectedStudent.parent_name ?? '—'}</p>
                      <p className="text-xs text-zinc-500">Primary Contact</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 justify-center">
                    <Phone size={14} />
                  </Button>
                </div>
                <Button className="w-full justify-center gap-2" variant="secondary">
                  <MessageSquare size={16} />
                  Message Parent
                </Button>
              </Card>
            </div>
          </div>
        )}
      </Drawer>

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingStudent(null); }}
        title={editingStudent ? 'Edit Student Profile' : 'Register New Student'}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-name">Full Name</Label>
            <Input
              id="new-name"
              placeholder="e.g. John Doe"
              value={formName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-email">Email Address</Label>
            <Input
              id="new-email"
              type="email"
              placeholder="john@example.com"
              value={formEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormEmail(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Grade</Label>
              <select
                className="w-full h-10 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100"
                value={formGrade}
                onChange={(e) => setFormGrade(e.target.value)}
              >
                <option>10th Grade</option>
                <option>11th Grade</option>
                <option>12th Grade</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                className="w-full h-10 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-parent-name">Parent/Guardian Name</Label>
            <Input
              id="new-parent-name"
              placeholder="e.g. Jane Doe"
              value={formParentName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormParentName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-parent-phone">Parent/Guardian Phone</Label>
            <Input
              id="new-parent-phone"
              placeholder="+62 812 3456 7890"
              value={formParentPhone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormParentPhone(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 mt-8">
            <Button
              variant="outline"
              className="flex-1 justify-center"
              onClick={() => { setShowAddModal(false); setEditingStudent(null); }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 justify-center"
              onClick={handleFormSubmit}
              disabled={createStudent.isPending || updateStudent.isPending || !formName}
            >
              {editingStudent ? 'Update Student' : 'Create Student'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
