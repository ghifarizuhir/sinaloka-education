import React, { useEffect, useState } from 'react';
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

const STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const EditSessionModal: React.FC<EditSessionModalProps> = ({ session, isOpen, onClose }) => {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState('SCHEDULED');

  const { mutateAsync, isPending } = useUpdateSession();

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
      toast.success('Session updated successfully.');
      onClose();
    } catch {
      toast.error('Failed to update session. Please try again.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Session">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Start Time</Label>
            <Select
              value={startTime}
              onChange={setStartTime}
              className="w-full"
              options={TIME_SLOTS.map((slot) => ({ value: slot, label: slot }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>End Time</Label>
            <Select
              value={endTime}
              onChange={setEndTime}
              className="w-full"
              options={TIME_SLOTS.map((slot) => ({ value: slot, label: slot }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={status}
            onChange={setStatus}
            className="w-full"
            options={STATUS_OPTIONS}
          />
        </div>

        <div className="flex items-center gap-3 mt-8">
          <Button variant="outline" className="flex-1 justify-center" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 justify-center"
            onClick={handleSubmit}
            disabled={!date || !startTime || !endTime || isPending}
          >
            {isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
