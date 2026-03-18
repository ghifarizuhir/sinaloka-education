import React from 'react';
import { Mail, Phone, Calendar, UserPlus } from 'lucide-react';
import { Card, Button, Badge, Drawer, Avatar } from '../../components/UI';
import { formatDate } from '../../lib/utils';
import type { Student } from '@/src/types/student';
import type { TFunction } from 'i18next';

interface StudentDrawerProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onInviteParent: (student: Student) => void;
  inviteIsPending: boolean;
  t: TFunction;
  language: string;
}

export const StudentDrawer: React.FC<StudentDrawerProps> = ({
  student,
  isOpen,
  onClose,
  onInviteParent,
  inviteIsPending,
  t,
  language,
}) => {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={t('students.drawer.title')}
    >
      {student && (
        <div className="space-y-8">
          <div className="flex flex-col items-center text-center">
            <Avatar name={student.name} size="lg" className="mb-4 w-24 h-24 rounded-3xl text-3xl shadow-xl" />
            <h3 className="text-2xl font-bold dark:text-zinc-100">{student.name}</h3>
            <p className="text-zinc-500">{student.grade} {t('students.student')}</p>
            <div className="mt-4 flex gap-2">
              <Badge variant={student.status === 'ACTIVE' ? 'success' : 'default'}>
                {student.status === 'ACTIVE' ? t('common.active') : t('common.inactive')}
              </Badge>
              <Badge variant="outline">ID: {student.id.slice(0, 8)}</Badge>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('students.drawer.contactInfo')}</h4>
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
                  <span className="text-sm dark:text-zinc-200">{formatDate(student.enrolled_at ?? student.created_at, language)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('students.drawer.parentGuardian')}</h4>
            <Card className="p-4 border-dashed border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar name={student.parent_name ?? 'P'} size="md" />
                  <div>
                    <p className="text-sm font-bold dark:text-zinc-200">{student.parent_name ?? '—'}</p>
                    <p className="text-xs text-zinc-500">{t('students.drawer.primaryContact')}</p>
                    <span className="text-xs text-zinc-400">{student.parent_email ?? ''}</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0 justify-center">
                  <Phone size={14} />
                </Button>
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
        </div>
      )}
    </Drawer>
  );
};
