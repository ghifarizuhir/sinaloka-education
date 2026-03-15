import React, { useState, useMemo } from 'react';
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
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  User,
  Layers
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Modal,
  Input,
  Label,
  SearchInput,
  Progress,
  Switch,
  Skeleton
} from '../components/UI';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import {
  useClasses,
  useCreateClass,
  useUpdateClass,
  useDeleteClass
} from '@/src/hooks/useClasses';
import { useTutors } from '@/src/hooks/useTutors';
import type { Class, CreateClassDto, ScheduleDay } from '@/src/types/class';

const SUBJECT_COLORS: Record<string, string> = {
  'Mathematics': 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800',
  'Science': 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800',
  'English': 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800',
  'History': 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800',
};

const DAYS_OF_WEEK: ScheduleDay[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const Classes = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSubject, setFormSubject] = useState('Mathematics');
  const [formTutorId, setFormTutorId] = useState('');
  const [formCapacity, setFormCapacity] = useState('25');
  const [formFee, setFormFee] = useState('500000');
  const [formScheduleDays, setFormScheduleDays] = useState<ScheduleDay[]>([]);
  const [formStartTime, setFormStartTime] = useState('14:00');
  const [formEndTime, setFormEndTime] = useState('15:30');
  const [formRoom, setFormRoom] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  const { data, isLoading } = useClasses({ page, limit });
  const { data: tutorsData } = useTutors({ limit: 100 });
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  const deleteClass = useDeleteClass();

  const classes = data?.data ?? [];
  const meta = data?.meta;
  const tutors = tutorsData?.data ?? [];

  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const tutorName = c.tutor?.name ?? '';
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tutorName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = !filterSubject || c.subject === filterSubject;
      // "available" means not archived and enrolled (enrollments not in class object; use capacity as proxy)
      const matchesAvailability = !showOnlyAvailable || c.status === 'ACTIVE';
      return matchesSearch && matchesSubject && matchesAvailability;
    });
  }, [classes, searchQuery, filterSubject, showOnlyAvailable]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  const totalRevenue = useMemo(() => {
    return classes.reduce((sum, c) => sum + c.fee, 0);
  }, [classes]);

  const openAddModal = () => {
    setEditingClass(null);
    setFormName('');
    setFormSubject('Mathematics');
    setFormTutorId(tutors[0]?.id ?? '');
    setFormCapacity('25');
    setFormFee('500000');
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
    setFormSubject(cls.subject);
    setFormTutorId(cls.tutor_id);
    setFormCapacity(String(cls.capacity));
    setFormFee(String(cls.fee));
    setFormScheduleDays(cls.schedule_days);
    setFormStartTime(cls.schedule_start_time);
    setFormEndTime(cls.schedule_end_time);
    setFormRoom(cls.room ?? '');
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
      toast.error('Please select a tutor');
      return;
    }
    if (formScheduleDays.length === 0) {
      toast.error('Please select at least one schedule day');
      return;
    }

    const payload: CreateClassDto = {
      name: formName,
      subject: formSubject,
      tutor_id: formTutorId,
      capacity: Number(formCapacity),
      fee: Number(formFee),
      schedule_days: formScheduleDays,
      schedule_start_time: formStartTime,
      schedule_end_time: formEndTime,
      room: formRoom || undefined,
      status: formStatus,
    };

    if (editingClass) {
      updateClass.mutate(
        { id: editingClass.id, data: payload },
        {
          onSuccess: () => {
            toast.success('Class updated successfully');
            setShowModal(false);
            setEditingClass(null);
          },
          onError: () => toast.error('Failed to update class'),
        }
      );
    } else {
      createClass.mutate(payload, {
        onSuccess: () => {
          toast.success('Class created successfully');
          setShowModal(false);
        },
        onError: () => toast.error('Failed to create class'),
      });
    }
  };

  const handleDeleteClass = (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    deleteClass.mutate(id, {
      onSuccess: () => toast.success('Class deleted'),
      onError: () => toast.error('Failed to delete class'),
    });
  };

  const currentPage = page;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Classes</h2>
          <p className="text-zinc-500 text-sm">Manage your course catalog and enrollment.</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus size={18} />
          Register New Class
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
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Monthly Fee</p>
              <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
              <Users size={24} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Classes</p>
              <p className="text-xl font-bold">{meta?.total ?? classes.length}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Courses</p>
              <p className="text-xl font-bold">{classes.filter(c => c.status === 'ACTIVE').length}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <SearchInput
          placeholder="Search class or tutor..."
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
            <option value="">All Subjects</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Science">Science</option>
            <option value="English">English</option>
            <option value="History">History</option>
          </select>

          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
            <span className="text-xs font-medium text-zinc-500">Active Only</span>
            <Switch checked={showOnlyAvailable} onChange={(val: boolean) => {
              setShowOnlyAvailable(val);
              setPage(1);
            }} />
          </div>
        </div>
      </div>

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
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Class Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Capacity</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Tutor & Schedule</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Fee</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredClasses.length > 0 ? (
                  filteredClasses.map((cls) => (
                    <tr key={cls.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold dark:text-zinc-200">{cls.name}</span>
                          <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-tighter">
                            Cap: {cls.capacity}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          'text-[10px] font-bold px-2 py-1 rounded-md border',
                          SUBJECT_COLORS[cls.subject] || 'bg-zinc-50 text-zinc-500 border-zinc-100'
                        )}>
                          {cls.subject.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 w-32">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-zinc-500">0/{cls.capacity}</span>
                            <span className="text-zinc-400">0%</span>
                          </div>
                          <Progress value={0} max={cls.capacity} />
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
                          <span className="text-sm font-bold dark:text-zinc-200">{formatCurrency(cls.fee)}</span>
                          <span className="text-[10px] text-zinc-400 font-medium">per session</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={cls.status === 'ACTIVE' ? 'success' : 'default'}>
                          {cls.status === 'ACTIVE' ? 'Active' : 'Archived'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative group/menu">
                          <button className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                            <MoreHorizontal size={18} />
                          </button>
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 p-1">
                            <button
                              onClick={() => openEditModal(cls)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                              Edit Class Details
                            </button>
                            <button
                              onClick={() => handleDeleteClass(cls.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors text-red-500"
                            >
                              Delete Class
                            </button>
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
                        <h3 className="text-lg font-bold mb-1">No classes found</h3>
                        <p className="text-zinc-500 text-sm mb-6">Try adjusting your search or filters to find what you're looking for.</p>
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
            Page <span className="font-bold">{currentPage}</span> of <span className="font-bold">{totalPages}</span>
            {' '}• <span className="font-bold">{meta?.total ?? 0}</span> total classes
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
              Next
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingClass(null); }}
        title={editingClass ? 'Edit Class' : 'Register New Class'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="class-name">Class Name</Label>
              <Input
                id="class-name"
                placeholder="e.g. Advanced Physics"
                value={formName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <select
                className="w-full h-10 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
              >
                <option>Mathematics</option>
                <option>Science</option>
                <option>English</option>
                <option>History</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tutor">Assign Tutor</Label>
              <select
                className="w-full h-10 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100"
                value={formTutorId}
                onChange={(e) => setFormTutorId(e.target.value)}
              >
                <option value="">Select a tutor...</option>
                {tutors.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                className="w-full h-10 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as 'ACTIVE' | 'ARCHIVED')}
              >
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Schedule Days</Label>
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
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={formStartTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-time">End Time</Label>
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
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                placeholder="25"
                value={formCapacity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormCapacity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fee">Fee per Session (Rp)</Label>
              <Input
                id="fee"
                type="number"
                placeholder="500000"
                value={formFee}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormFee(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="room">Room (optional)</Label>
            <Input
              id="room"
              placeholder="e.g. Room 101"
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
              Cancel
            </Button>
            <Button
              className="flex-1 justify-center"
              onClick={handleFormSubmit}
              disabled={createClass.isPending || updateClass.isPending || !formName}
            >
              {editingClass ? 'Update Class' : 'Create Class'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
