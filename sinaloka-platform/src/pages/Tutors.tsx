import React, { useState, useMemo } from 'react';
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
  Slider,
  Skeleton
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
import type { Tutor } from '@/src/types/tutor';

const TutorForm = ({ initialData, onSubmit, onCancel, isEditing }: {
  initialData?: Tutor | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isEditing: boolean;
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name ?? '',
    email: initialData?.email ?? '',
    password: '',
    subjects: (initialData?.subjects ?? []).join(', '),
    experience_years: initialData?.experience_years ?? 0,
    rating: initialData?.rating ?? 4.5,
    is_verified: initialData?.is_verified ?? false,
    bank_name: initialData?.bank_name ?? '',
    bank_account_number: initialData?.bank_account_number ?? '',
    bank_account_holder: initialData?.bank_account_holder ?? '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subjectsArr = formData.subjects
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    onSubmit({
      name: formData.name,
      email: formData.email,
      subjects: subjectsArr,
      experience_years: Number(formData.experience_years),
      ...(isEditing ? { rating: Number(formData.rating), is_verified: formData.is_verified } : {}),
      bank_name: formData.bank_name || undefined,
      bank_account_number: formData.bank_account_number || undefined,
      bank_account_holder: formData.bank_account_holder || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} required placeholder="Dr. John Doe" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="john@academy.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subjects">Subjects (comma-separated)</Label>
          <Input id="subjects" name="subjects" value={formData.subjects} onChange={handleChange} required placeholder="e.g. Math, Physics" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {isEditing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Rating ({Number(formData.rating).toFixed(1)})</Label>
              <div className="flex text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill={i < Math.floor(formData.rating) ? 'currentColor' : 'none'} />
                ))}
              </div>
            </div>
            <Slider
              value={formData.rating}
              min={0}
              max={5}
              step={0.1}
              onChange={(val: number) => setFormData(prev => ({ ...prev, rating: val }))}
            />
          </div>
        )}
        <div className="space-y-3">
          <Label htmlFor="experience_years">Years of Experience ({formData.experience_years})</Label>
          <Slider
            value={formData.experience_years}
            min={0}
            max={30}
            onChange={(val: number) => setFormData(prev => ({ ...prev, experience_years: val }))}
          />
        </div>
      </div>

      {isEditing && (
        <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col">
            <span className="text-sm font-bold dark:text-zinc-200">Verified Status</span>
            <span className="text-xs text-zinc-500">Mark this tutor as verified</span>
          </div>
          <Switch
            checked={formData.is_verified}
            onChange={(checked: boolean) => setFormData(prev => ({ ...prev, is_verified: checked }))}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bank_name">Bank Name</Label>
          <Input id="bank_name" name="bank_name" value={formData.bank_name} onChange={handleChange} placeholder="BCA" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bank_account_number">Account Number</Label>
          <Input id="bank_account_number" name="bank_account_number" value={formData.bank_account_number} onChange={handleChange} placeholder="1234567890" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bank_account_holder">Account Holder</Label>
          <Input id="bank_account_holder" name="bank_account_holder" value={formData.bank_account_holder} onChange={handleChange} placeholder="John Doe" />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{isEditing ? 'Save Changes' : 'Send Invitation'}</Button>
      </div>
    </form>
  );
};

export const Tutors = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'experience_years' | 'name'>('rating');
  const [filterSubject, setFilterSubject] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTutor, setEditingTutor] = useState<Tutor | null>(null);

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
        const subs = t.subjects ?? [];
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
  const subjects = Array.from(new Set(tutors.flatMap(t => t.subjects ?? [])));

  const handleAddTutor = (data: any) => {
    inviteTutor.mutate(
      { email: data.email, name: data.name, subjects: data.subjects, experience_years: data.experience_years },
      {
        onSuccess: (result: any) => {
          if (result.email_sent) {
            toast.success('Invitation sent successfully');
          } else {
            toast.success('Tutor created but email failed. Use "Resend Invite" to retry.');
          }
          setShowForm(false);
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Failed to send invitation');
        },
      }
    );
  };

  const handleResendInvite = (tutorId: string) => {
    resendInvite.mutate(tutorId, {
      onSuccess: (result: any) => {
        if (result.email_sent) toast.success('Invitation resent');
        else toast.success('Token refreshed but email failed. Try again.');
      },
      onError: () => toast.error('Failed to resend invitation'),
    });
  };

  const handleCancelInvite = (tutorId: string) => {
    if (!confirm('Cancel this invitation? The tutor record will be deleted.')) return;
    cancelInvite.mutate(tutorId, {
      onSuccess: () => toast.success('Invitation cancelled'),
      onError: () => toast.error('Failed to cancel invitation'),
    });
  };

  const handleEditTutor = (formData: any) => {
    if (!editingTutor) return;
    updateTutor.mutate(
      { id: editingTutor.id, data: formData },
      {
        onSuccess: () => {
          toast.success('Tutor updated successfully');
          setShowForm(false);
          setEditingTutor(null);
        },
        onError: () => toast.error('Failed to update tutor'),
      }
    );
  };

  const handleDeleteTutor = (id: string) => {
    if (!confirm('Are you sure you want to delete this tutor?')) return;
    deleteTutor.mutate(id, {
      onSuccess: () => toast.success('Tutor deleted'),
      onError: () => toast.error('Failed to delete tutor'),
    });
  };

  const getAvailabilityBadge = (tutor: Tutor) => {
    const isActive = (tutor as any).user?.is_active !== false;
    if (!isActive) {
      return <Badge variant="warning" className="flex items-center gap-1"><Clock size={10} /> Pending Invite</Badge>;
    }
    if (!tutor.is_verified) {
      return <Badge variant="default" className="flex items-center gap-1"><XCircle size={10} /> Unverified</Badge>;
    }
    return <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 size={10} /> Verified</Badge>;
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tutors</h2>
          <p className="text-zinc-500 text-sm">Manage your academic staff and their performance.</p>
        </div>
        <Button onClick={() => { setEditingTutor(null); setShowForm(true); }}>
          <Plus size={18} />
          Add Tutor
        </Button>
      </div>

      {/* Filter & Sort Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <SearchInput
          placeholder="Search tutors..."
          className="w-full sm:max-w-xs"
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
        />
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <select
            className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
          >
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="rating">Sort by Rating</option>
            <option value="experience_years">Sort by Experience</option>
            <option value="name">Sort by Name</option>
          </select>
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
          <span className="text-xs font-bold text-zinc-400 uppercase mr-2">Filters:</span>
          {searchQuery && (
            <Badge variant="outline" className="flex items-center gap-1 normal-case font-medium">
              "{searchQuery}"
              <X size={12} className="cursor-pointer" onClick={() => setSearchQuery('')} />
            </Badge>
          )}
          {filterSubject && (
            <Badge variant="outline" className="flex items-center gap-1 normal-case font-medium">
              Subject: {filterSubject}
              <X size={12} className="cursor-pointer" onClick={() => setFilterSubject('')} />
            </Badge>
          )}
          <button
            onClick={() => { setSearchQuery(''); setFilterSubject(''); }}
            className="text-xs text-indigo-600 hover:underline font-medium"
          >
            Clear all
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
                  <div className="relative group/menu">
                    <button className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      <MoreHorizontal size={18} />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 p-1">
                      {(tutor as any).user?.is_active === false ? (
                        <>
                          <button
                            onClick={() => handleResendInvite(tutor.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          >
                            <Mail size={14} /> Resend Invite
                          </button>
                          <button
                            onClick={() => handleCancelInvite(tutor.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors text-rose-600"
                          >
                            <XCircle size={14} /> Cancel Invite
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditingTutor(tutor); setShowForm(true); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          >
                            <FileText size={14} /> Edit Profile
                          </button>
                          <button
                            onClick={() => handleDeleteTutor(tutor.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors text-rose-600"
                          >
                            <XCircle size={14} /> Delete Tutor
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 font-bold text-2xl shadow-lg">
                    {tutor.name.split(' ').pop()?.charAt(0)}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-lg dark:text-zinc-100">{tutor.name}</h4>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {(tutor.subjects ?? []).slice(0, 2).join(', ')} Specialist
                    </p>
                    <div className="mt-1">{getAvailabilityBadge(tutor)}</div>
                  </div>
                </div>

                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-6 h-10">
                  {tutor.email}
                </p>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-zinc-50 dark:border-zinc-800">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 mb-1">Experience</p>
                    <p className="text-sm font-bold dark:text-zinc-300">{tutor.experience_years}y</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 mb-1">Rating</p>
                    <p className="text-sm font-bold dark:text-zinc-300 flex items-center gap-1">
                      <Star size={12} className="text-amber-400 fill-amber-400" /> {(tutor.rating ?? 0).toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 mb-1">Subjects</p>
                    <p className="text-sm font-bold dark:text-zinc-300 flex items-center gap-1">
                      <Users size={12} className="text-zinc-400" /> {(tutor.subjects ?? []).length}
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
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Tutor</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Subjects</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Experience</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredTutors.map((tutor) => (
                  <tr key={tutor.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 font-bold text-sm">
                          {tutor.name.split(' ').pop()?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold dark:text-zinc-200">{tutor.name}</p>
                          <p className="text-xs text-zinc-500">{tutor.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {(tutor.subjects ?? []).join(', ')}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">{tutor.experience_years} years</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm font-bold text-amber-500">
                        <Star size={14} fill="currentColor" /> {(tutor.rating ?? 0).toFixed(1)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getAvailabilityBadge(tutor)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative group/menu inline-block">
                        <button className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                          <MoreHorizontal size={18} />
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 p-1">
                          {(tutor as any).user?.is_active === false ? (
                            <>
                              <button
                                onClick={() => handleResendInvite(tutor.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                              >
                                <Mail size={14} /> Resend Invite
                              </button>
                              <button
                                onClick={() => handleCancelInvite(tutor.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors text-rose-600"
                              >
                                <XCircle size={14} /> Cancel Invite
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => { setEditingTutor(tutor); setShowForm(true); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                              >
                                <FileText size={14} /> Edit Profile
                              </button>
                              <button
                                onClick={() => handleDeleteTutor(tutor.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors text-rose-600"
                              >
                                <XCircle size={14} /> Delete Tutor
                              </button>
                            </>
                          )}
                        </div>
                      </div>
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
          <h3 className="text-lg font-bold mb-1">No tutors found</h3>
          <p className="text-zinc-500 text-sm mb-6">Try adjusting your search or filters to find what you're looking for.</p>
          <Button variant="outline" onClick={() => { setSearchQuery(''); setFilterSubject(''); }}>
            Clear all filters
          </Button>
        </div>
      )}

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingTutor(null); }}
        title={editingTutor ? 'Edit Tutor Details' : 'Invite New Tutor'}
      >
        <TutorForm
          initialData={editingTutor}
          isEditing={!!editingTutor}
          onSubmit={editingTutor ? handleEditTutor : handleAddTutor}
          onCancel={() => { setShowForm(false); setEditingTutor(null); }}
        />
      </Modal>
    </div>
  );
};
