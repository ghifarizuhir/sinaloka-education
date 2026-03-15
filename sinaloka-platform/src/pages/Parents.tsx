import React, { useState, useMemo } from 'react';
import {
  Plus,
  MoreHorizontal,
  Search,
  Grid,
  List,
  Mail,
  Users,
  X,
  XCircle,
  Check,
} from 'lucide-react';
import {
  Card,
  Button,
  Input,
  Label,
  Modal,
  Badge,
  SearchInput,
  Skeleton,
} from '../components/UI';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useParents, useInviteParent, useDeleteParent } from '@/src/hooks/useParents';
import { useStudents } from '@/src/hooks/useStudents';

const InviteParentForm = ({
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  onSubmit: (data: { email: string; student_ids: string[] }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) => {
  const [email, setEmail] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const { data: studentsData, isLoading: studentsLoading } = useStudents({ limit: 200 });

  const students = studentsData?.data ?? [];

  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(
      (s: any) =>
        s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ email, student_ids: selectedStudentIds });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="parent-email">Email Address</Label>
        <Input
          id="parent-email"
          name="email"
          type="email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          required
          placeholder="parent@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label>Link Students (optional)</Label>
        <Input
          placeholder="Search students..."
          value={studentSearch}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStudentSearch(e.target.value)}
        />
        <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-800">
          {studentsLoading ? (
            <div className="p-4 text-center text-sm text-zinc-500">Loading students...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-4 text-center text-sm text-zinc-500">No students found</div>
          ) : (
            filteredStudents.map((student: any) => {
              const selected = selectedStudentIds.includes(student.id);
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => toggleStudent(student.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                    selected
                      ? 'bg-zinc-50 dark:bg-zinc-800'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors',
                      selected
                        ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100'
                        : 'border-zinc-300 dark:border-zinc-700'
                    )}
                  >
                    {selected && <Check size={12} className="text-white dark:text-zinc-900" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium dark:text-zinc-200 truncate">{student.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{student.email}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
        {selectedStudentIds.length > 0 && (
          <p className="text-xs text-zinc-500">
            {selectedStudentIds.length} student{selectedStudentIds.length > 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Send Invitation'}
        </Button>
      </div>
    </form>
  );
};

export const Parents = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);

  const { data, isLoading } = useParents({ page, limit, search: searchQuery || undefined });
  const inviteParent = useInviteParent();
  const deleteParent = useDeleteParent();

  const parents = data?.data ?? [];

  const filteredParents = useMemo(() => {
    return parents.filter((p: any) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)
      );
    });
  }, [parents, searchQuery]);

  const handleInviteParent = (formData: { email: string; student_ids: string[] }) => {
    inviteParent.mutate(formData, {
      onSuccess: () => {
        toast.success('Invitation sent successfully');
        setShowInviteForm(false);
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Failed to send invitation');
      },
    });
  };

  const handleDeleteParent = (id: string) => {
    if (!confirm('Are you sure you want to delete this parent?')) return;
    deleteParent.mutate(id, {
      onSuccess: () => toast.success('Parent deleted'),
      onError: () => toast.error('Failed to delete parent'),
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Parents</h2>
          <p className="text-zinc-500 text-sm">
            Manage parent accounts and link them to students.
          </p>
        </div>
        <Button onClick={() => setShowInviteForm(true)}>
          <Plus size={18} />
          Invite Parent
        </Button>
      </div>

      {/* Filter & Sort Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <SearchInput
          placeholder="Search parents..."
          className="w-full sm:max-w-xs"
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
        />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-md transition-all',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500'
              )}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded-md transition-all',
                viewMode === 'list'
                  ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500'
              )}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      {searchQuery && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-zinc-400 uppercase mr-2">Filters:</span>
          <Badge variant="outline" className="flex items-center gap-1 normal-case font-medium">
            "{searchQuery}"
            <X size={12} className="cursor-pointer" onClick={() => setSearchQuery('')} />
          </Badge>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-indigo-600 hover:underline font-medium"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredParents.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredParents.map((parent: any) => (
              <Card
                key={parent.id}
                className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4">
                  <div className="relative group/menu">
                    <button className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      <MoreHorizontal size={18} />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 p-1">
                      <button
                        onClick={() => handleDeleteParent(parent.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors text-rose-600"
                      >
                        <XCircle size={14} /> Delete Parent
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 font-bold text-2xl shadow-lg">
                    {parent.name
                      ? parent.name.split(' ').pop()?.charAt(0)
                      : parent.email?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <h4 className="font-bold text-lg dark:text-zinc-100 truncate">
                      {parent.name || 'Pending'}
                    </h4>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                      {parent.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-4 border-t border-zinc-50 dark:border-zinc-800">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 mb-1">
                      Linked Children
                    </p>
                    <p className="text-sm font-bold dark:text-zinc-300 flex items-center gap-1">
                      <Users size={12} className="text-zinc-400" /> {parent.children_count}
                    </p>
                  </div>
                  {parent.children?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {parent.children.slice(0, 3).map((child: any) => (
                        <Badge key={child.id} variant="outline" className="text-xs">
                          {child.name}
                        </Badge>
                      ))}
                      {parent.children.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{parent.children.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Parent
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Children
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredParents.map((parent: any) => (
                  <tr
                    key={parent.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 font-bold text-sm">
                          {parent.name
                            ? parent.name.split(' ').pop()?.charAt(0)
                            : parent.email?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <p className="text-sm font-bold dark:text-zinc-200">
                          {parent.name || 'Pending'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {parent.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      <div className="flex items-center gap-1">
                        <Users size={14} className="text-zinc-400" />
                        {parent.children_count}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative group/menu inline-block">
                        <button className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                          <MoreHorizontal size={18} />
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 p-1">
                          <button
                            onClick={() => handleDeleteParent(parent.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors text-rose-600"
                          >
                            <XCircle size={14} /> Delete Parent
                          </button>
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
          <h3 className="text-lg font-bold mb-1">No parents found</h3>
          <p className="text-zinc-500 text-sm mb-6">
            Try adjusting your search or invite a new parent.
          </p>
          <Button variant="outline" onClick={() => setSearchQuery('')}>
            Clear all filters
          </Button>
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteForm}
        onClose={() => setShowInviteForm(false)}
        title="Invite New Parent"
      >
        <InviteParentForm
          onSubmit={handleInviteParent}
          onCancel={() => setShowInviteForm(false)}
          isSubmitting={inviteParent.isPending}
        />
      </Modal>
    </div>
  );
};
