import React from 'react';
import { Trans } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Modal, Button, Input, Label } from '../../components/UI';
import type { TFunction } from 'i18next';

interface DeleteModalsProps {
  deleteTarget: { id: string; name: string } | null;
  onDeleteClose: () => void;
  onDeleteConfirm: () => void;
  deleteIsPending: boolean;
  bulkDeleteConfirm: boolean;
  selectedCount: number;
  onBulkClose: () => void;
  onBulkConfirm: () => void;
  confirmText: string;
  onConfirmTextChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  t: TFunction;
}

export const DeleteModals: React.FC<DeleteModalsProps> = ({
  deleteTarget,
  onDeleteClose,
  onDeleteConfirm,
  deleteIsPending,
  bulkDeleteConfirm,
  selectedCount,
  onBulkClose,
  onBulkConfirm,
  confirmText,
  onConfirmTextChange,
  t,
}) => {
  return (
    <>
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={onDeleteClose}
        title={t('students.modal.deleteTitle')}
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
                  <Trash2 size={18} className="text-rose-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-rose-900 dark:text-rose-200">{t('students.delete.cannotUndo')}</p>
                  <p className="text-sm text-rose-700 dark:text-rose-300 mt-1"><Trans i18nKey="students.delete.permanentDelete" values={{ name: deleteTarget.name }} components={{ strong: <strong /> }} /></p>

                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delete-confirm" children={<Trans i18nKey="students.delete.typeDelete" components={{ strong: <strong /> }} />} />
              <Input
                id="delete-confirm"
                placeholder="delete"
                value={confirmText}
                onChange={onConfirmTextChange}
                autoFocus
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 justify-center"
                onClick={onDeleteClose}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1 justify-center bg-rose-600 hover:bg-rose-700 text-white"
                onClick={onDeleteConfirm}
                disabled={confirmText !== 'delete' || deleteIsPending}
              >
                {deleteIsPending ? t('common.deleting') : t('students.modal.deleteStudent')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={bulkDeleteConfirm}
        onClose={onBulkClose}
        title={t('students.modal.bulkDeleteTitle')}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-rose-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-rose-900 dark:text-rose-200">{t('students.delete.cannotUndo')}</p>
                <p className="text-sm text-rose-700 dark:text-rose-300 mt-1"><Trans i18nKey="students.delete.bulkPermanentDelete" values={{ count: selectedCount }} components={{ strong: <strong /> }} /></p>

              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-delete-confirm" children={<Trans i18nKey="students.delete.typeDelete" components={{ strong: <strong /> }} />} />
            <Input
              id="bulk-delete-confirm"
              placeholder="delete"
              value={confirmText}
              onChange={onConfirmTextChange}
              autoFocus
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 justify-center"
              onClick={onBulkClose}
            >
              {t('common.cancel')}
            </Button>
            <Button
              className="flex-1 justify-center bg-rose-600 hover:bg-rose-700 text-white"
              onClick={onBulkConfirm}
              disabled={confirmText !== 'delete' || deleteIsPending}
            >
              {deleteIsPending ? t('common.deleting') : t('students.modal.deleteBulk', { count: selectedCount })}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
