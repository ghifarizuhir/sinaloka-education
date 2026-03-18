import React from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { Badge, Button, SearchInput, Select } from '../../components/UI';
import { GRADE_GROUPS } from '../../lib/constants';
import type { TFunction } from 'i18next';

interface StudentFiltersProps {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchClear: () => void;
  activeFilters: { grade?: string; status?: string };
  onFilterChange: React.Dispatch<React.SetStateAction<{ grade?: string; status?: string }>>;
  onRemoveFilter: (key: 'grade' | 'status') => void;
  onClearAll: () => void;
  visibleColumns: string[];
  onToggleColumn: React.Dispatch<React.SetStateAction<string[]>>;
  t: TFunction;
}

export const StudentFilters: React.FC<StudentFiltersProps> = ({
  searchQuery,
  onSearchChange,
  onSearchClear,
  activeFilters,
  onFilterChange,
  onRemoveFilter,
  onClearAll,
  visibleColumns,
  onToggleColumn,
  t,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <SearchInput
          placeholder={t('students.searchPlaceholder')}
          className="w-full sm:max-w-xs"
          value={searchQuery}
          onChange={onSearchChange}
        />
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <Select
            value={activeFilters.grade || ''}
            onChange={(val) => onFilterChange(prev => ({ ...prev, grade: val || undefined }))}
            options={[
              { value: '', label: t('students.filter.allGrades') },
              ...GRADE_GROUPS.map(group => ({
                label: group.label,
                options: group.options,
              })),
            ]}
          />
          <Select
            value={activeFilters.status || ''}
            onChange={(val) => onFilterChange(prev => ({ ...prev, status: val || undefined }))}
            options={[
              { value: '', label: t('students.filter.allStatus') },
              { value: 'ACTIVE', label: t('common.active') },
              { value: 'INACTIVE', label: t('common.inactive') },
            ]}
          />

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onToggleColumn(prev =>
                  prev.includes('email')
                    ? prev.filter(c => c !== 'email')
                    : [...prev, 'email']
                )
              }
            >
              {visibleColumns.includes('email') ? <Eye size={14} /> : <EyeOff size={14} />}
              {t('students.table.email')}
            </Button>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {(activeFilters.grade || activeFilters.status || searchQuery) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-zinc-400 uppercase mr-2">{t('students.activeFilters')}</span>
          {searchQuery && (
            <Badge variant="outline" className="flex items-center gap-1 normal-case font-medium">
              {t('students.filter.search', { query: searchQuery })}
              <X size={12} className="cursor-pointer" onClick={onSearchClear} />
            </Badge>
          )}
          {activeFilters.grade && (
            <Badge variant="outline" className="flex items-center gap-1 normal-case font-medium">
              {t('students.filter.grade', { grade: activeFilters.grade })}
              <X size={12} className="cursor-pointer" onClick={() => onRemoveFilter('grade')} />
            </Badge>
          )}
          {activeFilters.status && (
            <Badge variant="outline" className="flex items-center gap-1 normal-case font-medium">
              {t('students.filter.status', { status: activeFilters.status })}
              <X size={12} className="cursor-pointer" onClick={() => onRemoveFilter('status')} />
            </Badge>
          )}
          <button
            onClick={onClearAll}
            className="text-xs text-indigo-600 hover:underline font-medium"
          >
            {t('common.clearAll')}
          </button>
        </div>
      )}
    </div>
  );
};
