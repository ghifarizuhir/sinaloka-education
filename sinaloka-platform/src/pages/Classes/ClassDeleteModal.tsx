import React from 'react';
import {
  Trash2,
} from 'lucide-react';
import {
  Button,
  Modal,
  Input,
  Label,
} from '../../components/UI';
import type { Class } from '@/src/types/class';

interface ClassDeleteModalProps {
  t: (key: string, opts?: Record<string, unknown>) => string;
  deleteTarget: Class | null;
  setDeleteTarget: (cls: Class | null) => void;
  deleteConfirmText: string;
  setDeleteConfirmText: (val: string) => void;
  confirmDeleteClass: () => void;
  deleteClass: { isPending: boolean };
}

export const ClassDeleteModal = ({
  t,
  deleteTarget,
  setDeleteTarget,
  deleteConfirmText,
  setDeleteConfirmText,
  confirmDeleteClass,
  deleteClass,
}: ClassDeleteModalProps) => {
  return (
    <Modal
      isOpen={!!deleteTarget}
      onClose={() => { setDeleteTarget(null); setDeleteConfirmText(''); }}
      title={t('classes.modal.deleteTitle')}
    >
      {deleteTarget && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-rose-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-rose-900 dark:text-rose-200">{t('classes.delete.cannotUndo')}</p>
                <p className="text-sm text-rose-700 dark:text-rose-300 mt-1" dangerouslySetInnerHTML={{ __html: t('classes.delete.permanentDelete', { name: deleteTarget.name }) }} />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="delete-confirm" dangerouslySetInnerHTML={{ __html: t('classes.delete.typeDelete') }} />
            <Input
              id="delete-confirm"
              placeholder="delete"
              value={deleteConfirmText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteConfirmText(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 justify-center"
              onClick={() => { setDeleteTarget(null); setDeleteConfirmText(''); }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              className="flex-1 justify-center bg-rose-600 hover:bg-rose-700 text-white"
              onClick={confirmDeleteClass}
              disabled={deleteConfirmText !== 'delete' || deleteClass.isPending}
            >
              {deleteClass.isPending ? t('common.deleting') : t('classes.modal.deleteClass')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
