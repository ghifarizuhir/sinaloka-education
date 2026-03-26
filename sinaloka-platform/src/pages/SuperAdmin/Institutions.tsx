import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  LogIn,
  Pencil,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  SearchInput,
  Skeleton,
  PageHeader,
} from '../../components/UI';
import { cn, formatDate } from '../../lib/utils';
import { useInstitutions } from '@/src/hooks/useInstitutions';
import { useAuth } from '@/src/hooks/useAuth';

export default function Institutions() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { enterInstitution } = useAuth();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useInstitutions({
    page,
    limit,
    ...(searchQuery ? { search: searchQuery } : {}),
  });

  const institutions = data?.data ?? [];
  const meta = data?.meta;

  const handleEnter = (id: string, name: string) => {
    enterInstitution(id, name);
    navigate('/dashboard');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('superAdmin.institutions')}
        subtitle={t('superAdmin.institutionsSubtitle')}
        actions={
          <Link to="/super/institutions/new">
            <Button><Plus size={16} />{t('superAdmin.createInstitution')}</Button>
          </Link>
        }
      />

      {/* Search */}
      <Card className="!p-0 overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
          <div className="flex-1">
            <SearchInput
              placeholder={t('superAdmin.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : institutions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">
              {t('common.noResults')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    {t('superAdmin.table.name')}
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    {t('superAdmin.table.admins')}
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    {t('plan.plan', 'Plan')}
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    {t('common.status')}
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    {t('superAdmin.table.created')}
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((inst) => (
                  <tr
                    key={inst.id}
                    className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <div>
                        <span className="font-medium dark:text-zinc-100">
                          {inst.name}
                        </span>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {inst.slug}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        {inst.users && inst.users.length > 0 ? (
                          inst.users.map((u) => (
                            <span
                              key={u.id}
                              className="text-sm text-zinc-600 dark:text-zinc-400"
                            >
                              {u.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-zinc-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                          inst.plan_type === 'STARTER' &&
                            'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
                          inst.plan_type === 'GROWTH' &&
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                          inst.plan_type === 'BUSINESS' &&
                            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        )}
                      >
                        {inst.plan_type ?? 'STARTER'}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge variant={inst.is_active ? 'success' : 'default'}>
                        {inst.is_active
                          ? t('common.active')
                          : t('common.inactive')}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-zinc-500">
                      {formatDate(inst.created_at, i18n.language)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Link to={`/super/institutions/${inst.id}`}>
                          <Button variant="outline" size="sm">
                            <Pencil size={14} />
                            {t('common.edit')}
                          </Button>
                        </Link>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEnter(inst.id, inst.name)}
                        >
                          <LogIn size={14} />
                          {t('superAdmin.enter')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/30">
          <span className="text-xs text-zinc-500">
            {t('common.page')}{' '}
            <span className="font-bold">{page}</span>{' '}
            {t('common.of')}{' '}
            <span className="font-bold">{meta?.totalPages ?? 1}</span>
            {' '}&bull;{' '}
            <span className="font-bold">{meta?.total ?? 0}</span>{' '}
            {t('common.total')}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!meta?.hasPreviousPage}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} />
              {t('common.prev')}
            </Button>
            <div className="flex items-center gap-1">
              {Array.from(
                { length: meta?.totalPages ?? 1 },
                (_, i) => i + 1
              )
                .filter((p) => Math.abs(p - page) <= 2)
                .map((p) => (
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
              onClick={() => setPage((p) => p + 1)}
            >
              {t('common.next')}
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
