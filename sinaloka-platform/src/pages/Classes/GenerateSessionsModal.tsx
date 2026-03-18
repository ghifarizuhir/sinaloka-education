import React from 'react';
import {
  Calendar,
} from 'lucide-react';
import {
  Button,
  Modal,
  Input,
  Label,
} from '../../components/UI';
import { format, addDays } from 'date-fns';

interface GenerateSessionsModalProps {
  t: (key: string, opts?: Record<string, unknown>) => string;
  showGenerateModal: boolean;
  setShowGenerateModal: (show: boolean) => void;
  generateDuration: number;
  setGenerateDuration: (val: number) => void;
  classDetail: {
    data: any;
  };
  generateSessions: { isPending: boolean };
  estimateSessionCount: (schedules: { day: string }[], duration: number) => number;
  handleGenerateSessions: () => void;
}

export const GenerateSessionsModal = ({
  t,
  showGenerateModal,
  setShowGenerateModal,
  generateDuration,
  setGenerateDuration,
  classDetail,
  generateSessions,
  estimateSessionCount,
  handleGenerateSessions,
}: GenerateSessionsModalProps) => {
  return (
    <Modal
      isOpen={showGenerateModal}
      onClose={() => { setShowGenerateModal(false); setGenerateDuration(30); }}
      title={t('classes.generateModal.title')}
    >
      {classDetail.data && (
        <div className="space-y-5">
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 space-y-2">
            <p className="text-sm font-bold">{classDetail.data.name}</p>
            <div className="flex flex-wrap gap-1.5">
              {classDetail.data.schedules?.map((schedule: { day: string; start_time: string; end_time: string }) => (
                <span key={schedule.day} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-full">
                  {schedule.day.slice(0, 3)} {schedule.start_time}-{schedule.end_time}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('classes.generateModal.duration')}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={365}
                value={generateDuration}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenerateDuration(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                className="w-24"
              />
              <span className="text-sm text-zinc-500">{t('classes.generateModal.days')}</span>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 space-y-2">
            <p className="text-xs text-zinc-500">
              {t('classes.generateModal.dateRange', {
                from: format(new Date(), 'dd MMM yyyy'),
                to: format(addDays(new Date(), generateDuration - 1), 'dd MMM yyyy'),
              })}
            </p>
            <p className="text-lg font-bold">
              ~{estimateSessionCount(classDetail.data.schedules ?? [], generateDuration)}{' '}
              <span className="text-sm font-normal text-zinc-500">{t('classes.generateModal.estimatedSessions')}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="flex-1 justify-center"
              onClick={() => { setShowGenerateModal(false); setGenerateDuration(30); }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              className="flex-1 justify-center"
              onClick={handleGenerateSessions}
              disabled={generateSessions.isPending}
            >
              <Calendar size={16} />
              {generateSessions.isPending ? t('common.processing') : t('classes.generateModal.confirm')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
