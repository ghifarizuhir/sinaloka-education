import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  MoreHorizontal,
  Calendar,
  ChevronRight,
  ChevronLeft,
  User,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Progress,
  Skeleton,
} from '../../components/UI';
import { cn, formatCurrency } from '../../lib/utils';
import { getSubjectColor } from './useClassesPage';
import type { Class } from '@/src/types/class';

interface ClassTableProps {
  t: (key: string, opts?: Record<string, unknown>) => string;
  i18n: { language: string };
  billingMode: string;
  isLoading: boolean;
  filteredClasses: Class[];
  activeActionMenu: string | null;
  setActiveActionMenu: (id: string | null) => void;
  setSelectedClassId: (id: string | null) => void;
  openEditModal: (cls: Class) => void;
  handleDeleteClass: (cls: Class) => void;
  currentPage: number;
  totalPages: number;
  meta: { total?: number; hasPreviousPage?: boolean; hasNextPage?: boolean; totalPages?: number } | undefined;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}

export const ClassTable = ({
  t,
  i18n,
  billingMode,
  isLoading,
  filteredClasses,
  activeActionMenu,
  setActiveActionMenu,
  setSelectedClassId,
  openEditModal,
  handleDeleteClass,
  currentPage,
  totalPages,
  meta,
  setPage,
}: ClassTableProps) => {
  return (
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
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('classes.table.className')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('classes.table.subject')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('classes.table.capacity')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('classes.table.tutorSchedule')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('classes.table.fee')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('classes.table.status')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredClasses.length > 0 ? (
                filteredClasses.map((cls) => (
                  <tr
                    key={cls.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group cursor-pointer"
                    onClick={() => {
                      setSelectedClassId(cls.id);
                      setActiveActionMenu(null);
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold dark:text-zinc-200">{cls.name}</span>
                        <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-tighter">
                          {t('classes.table.cap', { count: cls.capacity })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-1 rounded-md border border-transparent',
                        getSubjectColor(cls.subject.name)
                      )}>
                        {cls.subject.name.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 w-32">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-zinc-500">{cls.enrolled_count ?? 0}/{cls.capacity}</span>
                          <span className="text-zinc-400">{cls.capacity > 0 ? Math.round(((cls.enrolled_count ?? 0) / cls.capacity) * 100) : 0}%</span>
                        </div>
                        <Progress value={cls.enrolled_count ?? 0} max={cls.capacity} />
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
                            <Calendar size={10} /> {cls.schedules?.map(s => `${s.day.slice(0, 3)} ${s.start_time}-${s.end_time}`).join(', ')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold dark:text-zinc-200">{formatCurrency(cls.fee, i18n.language)}</span>
                        <span className="text-[10px] text-zinc-400 font-medium">{billingMode === 'PER_SESSION' ? t('classes.drawer.perSession') : t('classes.drawer.perMonth')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={cls.status === 'ACTIVE' ? 'success' : 'default'}>
                        {cls.status === 'ACTIVE' ? t('common.active') : t('common.archived')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          onClick={() => setActiveActionMenu(activeActionMenu === cls.id ? null : cls.id)}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        <AnimatePresence>
                          {activeActionMenu === cls.id && (
                            <>
                              <div className="fixed inset-0 z-[5]" onClick={() => setActiveActionMenu(null)} />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.1 }}
                                className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl z-10 p-1"
                              >
                                <button
                                  onClick={() => { openEditModal(cls); setActiveActionMenu(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                  {t('classes.menu.editClassDetails')}
                                </button>
                                <button
                                  onClick={() => handleDeleteClass(cls)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors text-red-500"
                                >
                                  {t('classes.menu.deleteClass')}
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
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
                      <h3 className="text-lg font-bold mb-1">{t('classes.noClassesFound')}</h3>
                      <p className="text-zinc-500 text-sm mb-6">{t('classes.noClassesHint')}</p>
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
          {t('classes.pagination.page')} <span className="font-bold">{currentPage}</span> {t('classes.pagination.of')} <span className="font-bold">{totalPages}</span>
          {' '}&bull; <span className="font-bold">{meta?.total ?? 0}</span> {t('classes.pagination.totalClasses')}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!meta?.hasPreviousPage}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft size={14} />
            {t('common.prev')}
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
            {t('common.next')}
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </Card>
  );
};
