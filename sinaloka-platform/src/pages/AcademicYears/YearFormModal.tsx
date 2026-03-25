import React from 'react';
import { Modal, Input, Label, Button, DatePicker } from '../../components/ui';
import { Spinner } from '../../components/ui/spinner';
import type { TFunction } from 'i18next';

export function YearFormModal({
  isOpen,
  onClose,
  editing,
  name,
  setName,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onSubmit,
  isSubmitting,
  t,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: boolean;
  name: string;
  setName: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  t: TFunction;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? t('academicYears.editYear') : t('academicYears.addYear')}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="year-name">{t('academicYears.name')}</Label>
          <Input
            id="year-name"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder={t('academicYears.yearNamePlaceholder')}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="year-start">{t('academicYears.startDate')}</Label>
            <DatePicker value={startDate} onChange={setStartDate} />
          </div>
          <div>
            <Label htmlFor="year-end">{t('academicYears.endDate')}</Label>
            <DatePicker value={endDate} onChange={setEndDate} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting && <Spinner size="sm" />}
            {editing ? t('common.save') : t('academicYears.add')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
