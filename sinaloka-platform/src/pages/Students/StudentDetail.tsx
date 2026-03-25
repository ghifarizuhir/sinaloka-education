import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button, Badge, Avatar, PageHeader } from '../../components/UI';
import { cn } from '../../lib/utils';
import { useStudent } from '@/src/hooks/useStudents';
import { useInviteParent } from '@/src/hooks/useParents';
import type { Student } from '@/src/types/student';
import { StudentProfileTab } from './StudentProfileTab';
import { StudentAttendanceTab } from './StudentAttendanceTab';

const TABS = ['profile', 'attendance'] as const;
type Tab = (typeof TABS)[number];

export const StudentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const { data: student, isLoading } = useStudent(id ?? '');
  const inviteParent = useInviteParent();

  const handleInviteParent = async (s: Student) => {
    try {
      if (!s.parent_email) {
        toast.error(t('students.toast.inviteError'));
        return;
      }
      await inviteParent.mutateAsync({ email: s.parent_email, student_ids: [s.id] });
      toast.success(t('students.toast.inviteSent'));
    } catch {
      toast.error(t('students.toast.inviteError'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
        <div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-20 text-zinc-500">
        {t('students.notFound', 'Student not found')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 justify-center"
              onClick={() => navigate('/students')}
            >
              <ArrowLeft size={16} />
            </Button>
            <Avatar name={student.name} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <span>{student.name}</span>
                <Badge variant={student.status === 'ACTIVE' ? 'success' : 'default'}>
                  {student.status === 'ACTIVE' ? t('common.active') : t('common.inactive')}
                </Badge>
              </div>
              <p className="text-sm font-normal text-zinc-500">{student.grade}</p>
            </div>
          </div>
        }
      />

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              )}
            >
              {t(`students.detail.tabs.${tab}`, tab.charAt(0).toUpperCase() + tab.slice(1))}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <StudentProfileTab
          student={student}
          onInviteParent={handleInviteParent}
          inviteIsPending={inviteParent.isPending}
        />
      )}
      {activeTab === 'attendance' && (
        <StudentAttendanceTab studentId={student.id} />
      )}
    </div>
  );
};
