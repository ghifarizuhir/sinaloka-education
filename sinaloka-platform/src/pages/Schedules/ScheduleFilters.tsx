import React from 'react';
import { Input, Select } from '../../components/UI';
import type { SessionStatus } from '@/src/types/session';
import type { TFunction } from 'i18next';

interface ClassOption {
  id: string;
  name: string;
}

interface ScheduleFiltersProps {
  filterDateFrom: string;
  onFilterDateFromChange: (value: string) => void;
  filterDateTo: string;
  onFilterDateToChange: (value: string) => void;
  filterClassId: string;
  onFilterClassIdChange: (value: string) => void;
  filterStatus: SessionStatus | '';
  onFilterStatusChange: (value: SessionStatus | '') => void;
  classes: ClassOption[];
  t: TFunction;
}

export const ScheduleFilters: React.FC<ScheduleFiltersProps> = ({
  filterDateFrom,
  onFilterDateFromChange,
  filterDateTo,
  onFilterDateToChange,
  filterClassId,
  onFilterClassIdChange,
  filterStatus,
  onFilterStatusChange,
  classes,
  t,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        type="date"
        value={filterDateFrom}
        onChange={(e) => onFilterDateFromChange(e.target.value)}
        className="h-9 text-xs w-36"
        placeholder={t('schedules.form.dateFrom')}
      />
      <Input
        type="date"
        value={filterDateTo}
        onChange={(e) => onFilterDateToChange(e.target.value)}
        className="h-9 text-xs w-36"
        placeholder={t('schedules.form.dateTo')}
      />
      <Select
        value={filterClassId}
        onChange={onFilterClassIdChange}
        className="h-9 text-xs"
        options={[
          { value: '', label: t('schedules.filter.allClasses') },
          ...classes.map(c => ({ value: c.id, label: c.name })),
        ]}
      />
      <Select
        value={filterStatus}
        onChange={(val) => onFilterStatusChange(val as SessionStatus | '')}
        className="h-9 text-xs"
        options={[
          { value: '', label: t('schedules.filter.allStatuses') },
          { value: 'SCHEDULED', label: t('schedules.filter.scheduled') },
          { value: 'COMPLETED', label: t('schedules.filter.completed') },
          { value: 'CANCELLED', label: t('schedules.filter.cancelled') },
          { value: 'RESCHEDULE_REQUESTED', label: t('schedules.filter.rescheduleRequested') },
        ]}
      />
    </div>
  );
};
