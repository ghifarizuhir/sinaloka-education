import React from 'react';
import { Mail, Phone, Calendar, UserPlus } from 'lucide-react';
import { Card, Button, Badge, Avatar } from '../../components/UI';
import { formatDate } from '../../lib/utils';
import type { Student } from '@/src/types/student';
import { useTranslation } from 'react-i18next';

interface StudentProfileTabProps {
  student: Student;
  onInviteParent: (student: Student) => void;
  inviteIsPending: boolean;
}

export const StudentProfileTab: React.FC<StudentProfileTabProps> = ({
  student,
  onInviteParent,
  inviteIsPending,
}) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Contact Info */}
      <Card className="p-6">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">
          {t('students.drawer.contactInfo')}
        </h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
            <Mail size={18} className="text-zinc-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">{t('students.drawer.email')}</span>
              <span className="text-sm dark:text-zinc-200">{student.email ?? '—'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
            <Phone size={18} className="text-zinc-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">{t('students.drawer.phone')}</span>
              <span className="text-sm dark:text-zinc-200">{student.phone ?? '—'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
            <Calendar size={18} className="text-zinc-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">{t('students.drawer.enrolledDate')}</span>
              <span className="text-sm dark:text-zinc-200">
                {formatDate(student.enrolled_at ?? student.created_at, i18n.language)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Parent / Guardian */}
      <Card className="p-6">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">
          {t('students.drawer.parentGuardian')}
        </h4>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar name={student.parent_name ?? 'P'} size="md" />
            <div>
              <p className="text-sm font-bold dark:text-zinc-200">{student.parent_name ?? '—'}</p>
              <p className="text-xs text-zinc-500">{t('students.drawer.primaryContact')}</p>
              <span className="text-xs text-zinc-400">{student.parent_email ?? ''}</span>
            </div>
          </div>
          {student.parent_phone && (
            <Button size="sm" variant="outline" className="h-8 w-8 p-0 justify-center">
              <Phone size={14} />
            </Button>
          )}
        </div>
        {student.parent_email ? (
          <Button
            className="w-full justify-center gap-2"
            variant="secondary"
            onClick={() => onInviteParent(student)}
            disabled={inviteIsPending}
          >
            <UserPlus size={16} />
            {inviteIsPending ? t('students.drawer.sending') : t('students.drawer.inviteParent')}
          </Button>
        ) : (
          <p className="text-xs text-zinc-500 text-center">{t('students.drawer.noParentEmail')}</p>
        )}
      </Card>
    </div>
  );
};
