import {
  AlertTriangle,
} from 'lucide-react';
import {
  Modal,
  Button,
} from '../../components/UI';
import type { TFunction } from 'i18next';

interface BulkDeleteModalProps {
  bulkDeleteConfirm: boolean;
  setBulkDeleteConfirm: (show: boolean) => void;
  selectedEnrollmentIds: string[];
  confirmBulkDelete: () => void;
  bulkDeleteIsPending: boolean;
  t: TFunction;
}

export const BulkDeleteModal = ({
  bulkDeleteConfirm,
  setBulkDeleteConfirm,
  selectedEnrollmentIds,
  confirmBulkDelete,
  bulkDeleteIsPending,
  t,
}: BulkDeleteModalProps) => {
  return (
    <Modal
      isOpen={bulkDeleteConfirm}
      onClose={() => setBulkDeleteConfirm(false)}
      title={t('enrollments.bulk.confirmDeleteTitle')}
    >
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-rose-900 dark:text-rose-200">{t('enrollments.bulk.confirmDeleteMessage', { count: selectedEnrollmentIds.length })}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 justify-center"
            onClick={() => setBulkDeleteConfirm(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            className="flex-1 justify-center bg-rose-600 hover:bg-rose-700 text-white"
            onClick={confirmBulkDelete}
            disabled={bulkDeleteIsPending}
          >
            {bulkDeleteIsPending ? t('common.deleting') : t('enrollments.bulk.confirmDelete', { count: selectedEnrollmentIds.length })}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
