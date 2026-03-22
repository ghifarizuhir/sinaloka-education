import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal, Button, Label, Input, Select } from '../../components/UI';
import { TIME_SLOTS } from './useSchedulesPage';
import { useUpdateSession } from '@/src/hooks/useSessions';

interface EditSessionProps {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface EditSessionModalProps {
  session: EditSessionProps | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditSessionModal: React.FC<EditSessionModalProps> = ({ session, isOpen, onClose }) => {
  const { t } = useTranslation();
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState('SCHEDULED');

  const { mutateAsync, isPending } = useUpdateSession();

  const STATUS_OPTIONS = [
    { value: 'SCHEDULED', label: t('schedules.status.scheduled', { defaultValue: 'Scheduled' }) },
    { value: 'CANCELLED', label: t('schedules.status.cancelled', { defaultValue: 'Cancelled' }) },
  ];

  useEffect(() => {
    if (session) {
      setDate(session.date);
      setStartTime(session.start_time);
      setEndTime(session.end_time);
      setStatus(session.status);
    }
  }, [session?.id]);

  const handleSubmit = async () => {
    if (!session) return;
    try {
      await mutateAsync({
        id: session.id,
        data: { date, start_time: startTime, end_time: endTime, status },
      });
      toast.success(t('schedules.toast.sessionUpdated', { defaultValue: 'Session updated' }));
      onClose();
    } catch {
      toast.error(t('schedules.toast.sessionUpdateError', { defaultValue: 'Failed to update session' }));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('schedules.editSession', { defaultValue: 'Edit Session' })}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t('schedules.form.date', { defaultValue: 'Date' })}</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t('schedules.form.startTime', { defaultValue: 'Start Time' })}</Label>
            <Select
              value={startTime}
              onChange={setStartTime}
              className="w-full"
              options={TIME_SLOTS.map((slot) => ({ value: slot, label: slot }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('schedules.form.endTime', { defaultValue: 'End Time' })}</Label>
            <Select
              value={endTime}
              onChange={setEndTime}
              className="w-full"
              options={TIME_SLOTS.map((slot) => ({ value: slot, label: slot }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t('schedules.form.status', { defaultValue: 'Status' })}</Label>
          <Select
            value={status}
            onChange={setStatus}
            className="w-full"
            options={STATUS_OPTIONS}
          />
        </div>

        <div className="flex items-center gap-3 mt-8">
          <Button variant="outline" className="flex-1 justify-center" onClick={onClose}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            className="flex-1 justify-center"
            onClick={handleSubmit}
            disabled={!date || !startTime || !endTime || isPending}
          >
            {isPending ? t('common.saving', { defaultValue: 'Saving...' }) : t('common.saveChanges', { defaultValue: 'Save Changes' })}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
