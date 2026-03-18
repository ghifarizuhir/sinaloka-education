import React from 'react';
import { Modal, Button, Label, Input, Select } from '../../components/UI';
import { TIME_SLOTS } from './useSchedulesPage';
import type { TFunction } from 'i18next';

interface ClassOption {
  id: string;
  name: string;
}

interface ScheduleSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClassId: string;
  onSelectedClassIdChange: (value: string) => void;
  selectedDate: string;
  onSelectedDateChange: (value: string) => void;
  startTime: string;
  onStartTimeChange: (value: string) => void;
  endTime: string;
  onEndTimeChange: (value: string) => void;
  classes: ClassOption[];
  onSubmit: () => void;
  isPending: boolean;
  t: TFunction;
}

export const ScheduleSessionModal: React.FC<ScheduleSessionModalProps> = ({
  isOpen,
  onClose,
  selectedClassId,
  onSelectedClassIdChange,
  selectedDate,
  onSelectedDateChange,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  classes,
  onSubmit,
  isPending,
  t,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('schedules.modal.scheduleTitle')}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t('schedules.form.selectClass')}</Label>
          <Select
            value={selectedClassId}
            onChange={onSelectedClassIdChange}
            className="w-full"
            options={[
              { value: '', label: t('schedules.form.selectClassPlaceholder') },
              ...classes.map(c => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t('schedules.form.date')}</Label>
            <Input type="date" value={selectedDate} onChange={(e) => onSelectedDateChange(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t('schedules.form.startTime')}</Label>
            <Select
              value={startTime}
              onChange={onStartTimeChange}
              className="w-full"
              options={TIME_SLOTS.map(slot => ({ value: slot, label: slot }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('schedules.form.endTime')}</Label>
            <Select
              value={endTime}
              onChange={onEndTimeChange}
              className="w-full"
              options={TIME_SLOTS.map(slot => ({ value: slot, label: slot }))}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-8">
          <Button variant="outline" className="flex-1 justify-center" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            className="flex-1 justify-center"
            onClick={onSubmit}
            disabled={!selectedClassId || isPending}
          >
            {isPending ? t('schedules.form.scheduling') : t('schedules.scheduleSession')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
