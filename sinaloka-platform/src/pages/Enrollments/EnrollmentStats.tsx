import { Card, Badge } from '../../components/UI';
import type { Enrollment } from '@/src/types/enrollment';
import type { TFunction } from 'i18next';

interface EnrollmentStatsProps {
  enrollments: Enrollment[];
  t: TFunction;
}

export const EnrollmentStats = ({ enrollments, t }: EnrollmentStatsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-4 flex flex-col justify-between h-24">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('enrollments.totalActive')}</span>
        <span className="text-2xl font-bold">{enrollments.filter(e => e.status === 'ACTIVE').length}</span>
      </Card>
      <Card className="p-4 flex flex-col justify-between h-24">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('enrollments.onTrial')}</span>
        <span className="text-2xl font-bold text-indigo-600">{enrollments.filter(e => e.status === 'TRIAL').length}</span>
      </Card>
      <Card className="p-4 flex flex-col justify-between h-24">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('enrollments.waitlisted')}</span>
        <span className="text-2xl font-bold text-zinc-500">{enrollments.filter(e => e.status === 'WAITLISTED').length}</span>
      </Card>
      <Card className="p-4 flex flex-col justify-between h-24">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('enrollments.overdueInvoices')}</span>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold text-red-500">{enrollments.filter(e => e.payment_status === 'OVERDUE').length}</span>
          <Badge variant="error">{t('common.actionRequired')}</Badge>
        </div>
      </Card>
    </div>
  );
};
