import React, { useRef } from 'react';
import {
  Upload,
  Info,
} from 'lucide-react';
import {
  Modal,
  Button,
} from '../../components/UI';
import { cn } from '../../lib/utils';
import type { TFunction } from 'i18next';

interface BulkImportModalProps {
  importModal: boolean;
  setImportModal: (show: boolean) => void;
  importFile: File | null;
  setImportFile: (file: File | null) => void;
  handleImportFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImportSubmit: () => void;
  importIsPending: boolean;
  t: TFunction;
}

export const BulkImportModal = ({
  importModal,
  setImportModal,
  importFile,
  setImportFile,
  handleImportFileChange,
  handleImportSubmit,
  importIsPending,
  t,
}: BulkImportModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setImportModal(false);
    setImportFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Modal
      isOpen={importModal}
      onClose={handleClose}
      title={t('enrollments.modal.importTitle')}
    >
      <div className="space-y-6">
        <div
          className={cn(
            "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 transition-colors cursor-pointer",
            importFile
              ? "border-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10"
              : "border-zinc-200 dark:border-zinc-800 hover:border-indigo-400"
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
            <Upload size={32} />
          </div>
          <div>
            {importFile ? (
              <>
                <p className="text-sm font-bold text-emerald-600">{importFile.name}</p>
                <p className="text-xs text-zinc-500">{t('enrollments.import.clickToUpload')}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold dark:text-zinc-200">{t('enrollments.import.clickToUpload')}</p>
                <p className="text-xs text-zinc-500">{t('enrollments.import.csvMapDesc')}</p>
              </>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportFileChange} />
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl space-y-2">
          <p className="text-xs font-bold flex items-center gap-2">
            <Info size={14} className="text-indigo-600" />
            {t('enrollments.import.csvFormatGuide')}
          </p>
          <div className="text-[10px] font-mono text-zinc-500 bg-white dark:bg-zinc-950 p-2 rounded border border-zinc-100 dark:border-zinc-800">
            student_id, class_id, status<br />
            550e8400-e29b-41d4-a716-446655440000, 6ba7b810-9dad-11d1-80b4-00c04fd430c8, ACTIVE<br />
            7c9e6679-7425-40de-944b-e07fc1f90ae7, 6ba7b810-9dad-11d1-80b4-00c04fd430c8, TRIAL
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">{t('enrollments.import.uuidNote')}</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex-1 justify-center" onClick={handleClose}>{t('common.cancel')}</Button>
          <Button
            className="flex-1 justify-center"
            onClick={handleImportSubmit}
            disabled={!importFile || importIsPending}
          >
            {importIsPending ? t('common.processing') : t('enrollments.import.processImport')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
