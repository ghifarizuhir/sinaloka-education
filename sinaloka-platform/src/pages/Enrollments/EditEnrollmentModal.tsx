import {
  Modal,
  Button,
  Label,
  Select,
} from '../../components/UI';
import type { Enrollment, UpdateEnrollmentDto } from '@/src/types/enrollment';
import type { TFunction } from 'i18next';

type EnrollmentStatus = 'ACTIVE' | 'TRIAL' | 'WAITLISTED' | 'DROPPED';

interface EditEnrollmentModalProps {
  showEditModal: boolean;
  setShowEditModal: (show: boolean) => void;
  selectedEnrollment: Enrollment | null;
  editStatus: EnrollmentStatus;
  setEditStatus: (status: EnrollmentStatus) => void;
  handleStatusUpdate: (id: string, newStatus: UpdateEnrollmentDto['status']) => void;
  updateIsPending: boolean;
  t: TFunction;
}

export const EditEnrollmentModal = ({
  showEditModal,
  setShowEditModal,
  selectedEnrollment,
  editStatus,
  setEditStatus,
  handleStatusUpdate,
  updateIsPending,
  t,
}: EditEnrollmentModalProps) => {
  return (
    <Modal
      isOpen={showEditModal}
      onClose={() => setShowEditModal(false)}
      title={t('enrollments.modal.editTitle')}
    >
      {selectedEnrollment && (
        <div className="space-y-4">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold">
                {(selectedEnrollment.student?.name ?? '?').charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold dark:text-zinc-100">{selectedEnrollment.student?.name ?? '\u2014'}</p>
                <p className="text-xs text-zinc-500">{selectedEnrollment.class?.name ?? '\u2014'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('enrollments.form.enrollmentStatus')}</Label>
            <Select
              value={editStatus}
              onChange={(v) => setEditStatus(v as EnrollmentStatus)}
              className="w-full"
              options={[
                { value: 'ACTIVE', label: t('enrollments.status.active') },
                { value: 'TRIAL', label: t('enrollments.status.trial') },
                { value: 'WAITLISTED', label: t('enrollments.status.waitlisted') },
                { value: 'DROPPED', label: t('enrollments.status.dropped') },
              ]}
            />
          </div>

          <div className="flex items-center gap-3 pt-6">
            <Button variant="outline" className="flex-1 justify-center" onClick={() => setShowEditModal(false)}>{t('common.cancel')}</Button>
            <Button
              className="flex-1 justify-center"
              onClick={() => handleStatusUpdate(selectedEnrollment.id, editStatus)}
              disabled={updateIsPending}
            >
              {updateIsPending ? t('common.saving') : t('common.saveChanges')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
