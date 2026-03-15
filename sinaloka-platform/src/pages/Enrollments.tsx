import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  GraduationCap
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
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useEnrollments, useCreateEnrollment, useUpdateEnrollment, useDeleteEnrollment, useCheckConflict } from '@/src/hooks/useEnrollments';
import { useStudents } from '@/src/hooks/useStudents';
import { useClasses } from '@/src/hooks/useClasses';
import type { Enrollment, UpdateEnrollmentDto } from '@/src/types/enrollment';

type EnrollmentStatus = 'ACTIVE' | 'TRIAL' | 'WAITLISTED' | 'DROPPED';

const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  ACTIVE: 'Active',
  TRIAL: 'Trial',
  WAITLISTED: 'Waitlisted',
  DROPPED: 'Dropped',
};

const PAYMENT_LABEL: Record<string, string> = {
  PAID: 'Paid',
  PENDING: 'Pending',
  OVERDUE: 'Overdue',
};

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

  // Mutations
  const createEnrollment = useCreateEnrollment();
  const updateEnrollment = useUpdateEnrollment();
  const deleteEnrollment = useDeleteEnrollment();
  const checkConflict = useCheckConflict();

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
        toast.success(`${selectedStudentIds.length} student(s) enrolled successfully`);
        setShowModal(false);
        setSelectedStudentIds([]);
        setSelectedClassId('');
      })
      .catch(() => toast.error('Failed to enroll some students'));
  };

  const handleStatusUpdate = (id: string, newStatus: UpdateEnrollmentDto['status']) => {
    if (!newStatus) return;
    updateEnrollment.mutate({ id, data: { status: newStatus } }, {
      onSuccess: () => {
        toast.success(`Status updated to ${STATUS_LABEL[newStatus]}`);
        setActiveActionMenu(null);
        setShowEditModal(false);
      },
      onError: () => toast.error('Failed to update status'),
    });
  };

  const handleDeleteEnrollment = (id: string) => {
    if (!confirm('Are you sure you want to delete this enrollment?')) return;
    deleteEnrollment.mutate(id, {
      onSuccess: () => {
        toast.success('Enrollment deleted');
        setActiveActionMenu(null);
      },
      onError: () => toast.error('Failed to delete enrollment'),
    });
  };

  const isLoading = enrollmentsQuery.isLoading;

  return (
    <div className="space-y-6 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Enrollments</h2>
            <p className="text-zinc-500 text-sm">Manage student course lifecycle and financial status.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportModal(true)}>
              <Upload size={16} />
              Bulk Import
            </Button>
            <Button onClick={() => setShowModal(true)}>
              <UserPlus size={18} />
              New Enrollment
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col justify-between h-24">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Active</span>
          <span className="text-2xl font-bold">{enrollments.filter(e => e.status === 'ACTIVE').length}</span>
        </Card>
        <Card className="p-4 flex flex-col justify-between h-24">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">On Trial</span>
          <span className="text-2xl font-bold text-indigo-600">{enrollments.filter(e => e.status === 'TRIAL').length}</span>
        </Card>
        <Card className="p-4 flex flex-col justify-between h-24">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Waitlisted</span>
          <span className="text-2xl font-bold text-zinc-500">{enrollments.filter(e => e.status === 'WAITLISTED').length}</span>
        </Card>
        <Card className="p-4 flex flex-col justify-between h-24">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Overdue Invoices</span>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-red-500">{enrollments.filter(e => e.payment_status === 'OVERDUE').length}</span>
            <Badge variant="error">Action Required</Badge>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <SearchInput
          placeholder="Search student or class..."
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
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trial</option>
            <option value="WAITLISTED">Waitlisted</option>
            <option value="DROPPED">Dropped</option>
          </select>
          <Button variant="outline" size="sm" className="ml-auto">
            <Download size={14} />
            Export CSV
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
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Class</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Enrollment Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredEnrollments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-400 text-sm">No enrollments found.</td>
                  </tr>
                )}
                {filteredEnrollments.map((enroll) => (
                  <tr key={enroll.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group">
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
                      {enroll.enrolled_at ? enroll.enrolled_at.split('T')[0] : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", getPaymentBadge(enroll.payment_status))}>
                          {PAYMENT_LABEL[enroll.payment_status] ?? enroll.payment_status}
                        </span>
                        {enroll.payment_status === 'OVERDUE' && (
                          <button className="p-1 text-zinc-400 hover:text-indigo-600 transition-colors" title="Send Reminder">
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
                                  <Edit size={14} /> Edit Enrollment
                                </button>

                                <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                                <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Update Status</div>

                                {enroll.status !== 'ACTIVE' && (
                                  <button
                                    onClick={() => handleStatusUpdate(enroll.id, 'ACTIVE')}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg flex items-center gap-2"
                                  >
                                    <CheckCircle2 size={14} /> Set Active
                                  </button>
                                )}

                                {enroll.status === 'TRIAL' && (
                                  <button
                                    onClick={() => handleStatusUpdate(enroll.id, 'ACTIVE')}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg flex items-center gap-2"
                                  >
                                    <GraduationCap size={14} /> Convert to Full
                                  </button>
                                )}

                                {enroll.status !== 'DROPPED' && (
                                  <button
                                    onClick={() => handleStatusUpdate(enroll.id, 'DROPPED')}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg flex items-center gap-2"
                                  >
                                    <UserPlus size={14} className="rotate-45" /> Drop
                                  </button>
                                )}

                                <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

                                <button
                                  onClick={() => handleDeleteEnrollment(enroll.id)}
                                  className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg flex items-center gap-2"
                                >
                                  <Trash2 size={14} /> Delete Record
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
        title="New Student Enrollment"
        className="max-w-4xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">Step 1: Select Students</Label>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                  <Search size={14} className="text-zinc-400" />
                  <input
                    placeholder="Search students..."
                    className="bg-transparent text-xs focus:outline-none w-full"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                  {studentsQuery.isLoading ? (
                    <div className="p-4 text-center text-xs text-zinc-400">Loading students...</div>
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
                  {selectedStudentIds.length} students selected
                </p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">Step 2: Select Class & Terms</Label>
              <div className="max-h-[220px] overflow-y-auto pr-2 space-y-2">
                {classesQuery.isLoading ? (
                  <div className="p-4 text-center text-xs text-zinc-400">Loading classes...</div>
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
                      {cls.tutor_id && <span className="flex items-center gap-1"><User size={10} /> Tutor assigned</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px]">Type</Label>
                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                  <button
                    onClick={() => setEnrollmentType('ACTIVE')}
                    className={cn(
                      "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                      enrollmentType === 'ACTIVE' ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
                    )}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setEnrollmentType('TRIAL')}
                    className={cn(
                      "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                      enrollmentType === 'TRIAL' ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
                    )}
                  >
                    Trial
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
                  <p className="text-[10px] font-bold dark:text-zinc-200">Auto Invoice</p>
                </div>
              </div>
              <Switch checked={autoInvoice} onChange={setAutoInvoice} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-8 border-t border-zinc-100 dark:border-zinc-800 mt-6">
          <Button variant="outline" className="flex-1 justify-center" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button
            className="flex-1 justify-center"
            onClick={handleEnroll}
            disabled={createEnrollment.isPending || selectedStudentIds.length === 0 || !selectedClassId}
          >
            {createEnrollment.isPending ? "Processing..." : `Enroll ${selectedStudentIds.length || ''} Students`}
          </Button>
        </div>
      </Modal>

      {/* Edit Enrollment Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Enrollment"
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
              <Label>Enrollment Status</Label>
              <select
                className="w-full h-10 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as EnrollmentStatus)}
              >
                <option value="ACTIVE">Active</option>
                <option value="TRIAL">Trial</option>
                <option value="WAITLISTED">Waitlisted</option>
                <option value="DROPPED">Dropped</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button
                className="flex-1 justify-center"
                onClick={() => handleStatusUpdate(selectedEnrollment.id, editStatus)}
                disabled={updateEnrollment.isPending}
              >
                {updateEnrollment.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        title="Bulk Enrollment Import"
      >
        <div className="space-y-6">
          <div
            className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-indigo-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
              <Upload size={32} />
            </div>
            <div>
              <p className="text-sm font-bold dark:text-zinc-200">Click to upload CSV</p>
              <p className="text-xs text-zinc-500">Map Student_ID to Class_ID in one go</p>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" />
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl space-y-2">
            <p className="text-xs font-bold flex items-center gap-2">
              <Info size={14} className="text-indigo-600" />
              CSV Format Guide
            </p>
            <div className="text-[10px] font-mono text-zinc-500 bg-white dark:bg-zinc-950 p-2 rounded border border-zinc-100 dark:border-zinc-800">
              student_id, class_id, enrollment_type<br />
              S101, C005, ACTIVE<br />
              S102, C005, TRIAL
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="flex-1 justify-center" onClick={() => setImportModal(false)}>Cancel</Button>
            <Button className="flex-1 justify-center" onClick={() => setImportModal(false)}>Process Import</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
