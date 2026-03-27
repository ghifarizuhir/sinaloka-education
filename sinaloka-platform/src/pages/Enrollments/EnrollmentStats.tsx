import { Card, Badge } from '../../components/UI';
import type { TFunction } from 'i18next';

interface EnrollmentStatsProps {
  stats: { active: number; trial: number; waitlisted: number; overdue: number } | undefined;
  isLoading: boolean;
  t: TFunction;
}

export const EnrollmentStats = ({ stats, isLoading, t }: EnrollmentStatsProps) => {
  const skeleton = <div className="h-8 w-12 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-4 flex flex-col justify-between h-24">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('enrollments.totalActive')}</span>
        {isLoading ? skeleton : <span className="text-2xl font-bold">{stats?.active ?? 0}</span>}
      </Card>
      <Card className="p-4 flex flex-col justify-between h-24">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('enrollments.onTrial')}</span>
        {isLoading ? skeleton : <span className="text-2xl font-bold text-indigo-600">{stats?.trial ?? 0}</span>}
      </Card>
      <Card className="p-4 flex flex-col justify-between h-24">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('enrollments.waitlisted')}</span>
        {isLoading ? skeleton : <span className="text-2xl font-bold text-zinc-500">{stats?.waitlisted ?? 0}</span>}
      </Card>
      <Card className="p-4 flex flex-col justify-between h-24">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('enrollments.overdueInvoices')}</span>
        <div className="flex items-end justify-between">
          {isLoading ? skeleton : <span className="text-2xl font-bold text-red-500">{stats?.overdue ?? 0}</span>}
          <Badge variant="error">{t('common.actionRequired')}</Badge>
        </div>
      </Card>
    </div>
  );
};
