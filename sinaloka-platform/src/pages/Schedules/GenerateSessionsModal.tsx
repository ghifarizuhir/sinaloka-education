import React from 'react';
import { Info } from 'lucide-react';
import { Modal, Button, Label, Select, DatePicker } from '../../components/UI';
import type { TFunction } from 'i18next';

interface ClassOption {
  id: string;
  name: string;
}

interface GenerateSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  genClassId: string;
  onGenClassIdChange: (value: string) => void;
  genDateFrom: string;
  onGenDateFromChange: (value: string) => void;
  genDateTo: string;
  onGenDateToChange: (value: string) => void;
  classes: ClassOption[];
  onSubmit: () => void;
  isPending: boolean;
  t: TFunction;
}

export const GenerateSessionsModal: React.FC<GenerateSessionsModalProps> = ({
  isOpen,
  onClose,
  genClassId,
  onGenClassIdChange,
  genDateFrom,
  onGenDateFromChange,
  genDateTo,
  onGenDateToChange,
  classes,
  onSubmit,
  isPending,
  t,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('schedules.modal.generateTitle')}
    >
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl flex gap-3">
          <Info size={18} className="text-blue-600 shrink-0" />
          <p className="text-[10px] text-blue-700 dark:text-blue-400">
            {t('schedules.modal.generateInfo')}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>{t('schedules.form.selectClass')}</Label>
          <Select
            value={genClassId}
            onChange={onGenClassIdChange}
            className="w-full"
            options={[
              { value: '', label: t('schedules.form.selectClassPlaceholder') },
              ...classes.map(c => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t('schedules.form.dateFrom')}</Label>
            <DatePicker value={genDateFrom} onChange={onGenDateFromChange} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('schedules.form.dateTo')}</Label>
            <DatePicker value={genDateTo} onChange={onGenDateToChange} />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Button variant="outline" className="flex-1 justify-center" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            className="flex-1 justify-center"
            onClick={onSubmit}
            disabled={!genClassId || isPending}
          >
            {isPending ? t('schedules.form.generating') : t('schedules.modal.generateSessions')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
