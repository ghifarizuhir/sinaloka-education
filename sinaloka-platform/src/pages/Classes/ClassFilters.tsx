import React from 'react';
import {
  Search,
  Calendar,
  Table2
} from 'lucide-react';
import {
  SearchInput,
  Select,
  Switch,
  Skeleton
} from '../../components/UI';
import { cn } from '../../lib/utils';

interface ClassFiltersProps {
  t: (key: string) => string;
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  filterSubject: string;
  onFilterSubjectChange: (val: string) => void;
  showOnlyAvailable: boolean;
  onShowOnlyAvailableChange: (val: boolean) => void;
  viewMode: 'table' | 'timetable';
  onViewModeChange: (mode: 'table' | 'timetable') => void;
  subjectsList: { id: string; name: string }[] | undefined;
}

export const ClassFilters = ({
  t,
  searchQuery,
  onSearchChange,
  filterSubject,
  onFilterSubjectChange,
  showOnlyAvailable,
  onShowOnlyAvailableChange,
  viewMode,
  onViewModeChange,
  subjectsList,
}: ClassFiltersProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <SearchInput
        placeholder={t('classes.searchPlaceholder')}
        className="w-full sm:max-w-xs"
        value={searchQuery}
        onChange={onSearchChange}
      />
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <Select
          value={filterSubject}
          onChange={onFilterSubjectChange}
          options={[
            { value: '', label: t('common.allSubjects') },
            ...(subjectsList ?? []).map(s => ({ value: s.name, label: s.name })),
          ]}
        />

        <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
          <span className="text-xs font-medium text-zinc-500">{t('classes.activeOnly')}</span>
          <Switch checked={showOnlyAvailable} onChange={onShowOnlyAvailableChange} />
        </div>

        {/* View Mode Toggle */}
        <div className="h-8 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-1" />
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
          <button
            onClick={() => onViewModeChange('table')}
            className={cn('p-1.5 rounded-md transition-all', viewMode === 'table' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-500')}
            title={t('classes.view.table')}
          >
            <Table2 size={16} />
          </button>
          <button
            onClick={() => onViewModeChange('timetable')}
            className={cn('p-1.5 rounded-md transition-all', viewMode === 'timetable' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-500')}
            title={t('classes.view.timetable')}
          >
            <Calendar size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
