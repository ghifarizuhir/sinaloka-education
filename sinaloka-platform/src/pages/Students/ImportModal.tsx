import React, { useState, useRef } from 'react';
import { Trans } from 'react-i18next';
import {
  Upload,
  Info,
  FileDown,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { Modal, Button } from '../../components/UI';
import { cn } from '../../lib/utils';
import type { TFunction } from 'i18next';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => void;
  onDownloadTemplate: () => void;
  isPending: boolean;
  t: TFunction;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  onDownloadTemplate,
  isPending,
  t,
}) => {
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    e.target.value = '';
  };

  const handleSubmit = () => {
    if (!importFile) return;
    onImport(importFile);
    setImportFile(null);
  };

  const handleClose = () => {
    onClose();
    setImportFile(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('students.modal.importTitle')}
    >
      <div className="space-y-5">
        {/* Instructions */}
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">{t('students.import.howToImport')}</p>
              <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>{t('students.import.step1')}</li>
                <li>{t('students.import.step2')}</li>
                <li>{t('students.import.step3')}</li>
                <li>{t('students.import.step4')}</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Download Template */}
        <button
          onClick={onDownloadTemplate}
          className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <FileDown size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium dark:text-zinc-200">{t('students.import.downloadTemplate')}</p>
            <p className="text-xs text-zinc-500">{t('students.import.templateDesc')}</p>
          </div>
        </button>

        {/* CSV Format Preview */}
        <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl space-y-2">
          <p className="text-xs font-bold flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <FileSpreadsheet size={14} className="text-indigo-600" />
            {t('students.import.csvFormat')}
          </p>
          <div className="text-[11px] font-mono text-zinc-500 bg-white dark:bg-zinc-950 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 overflow-x-auto">
            <span className="text-indigo-600 font-semibold">name</span>,<span className="text-indigo-600 font-semibold">email</span>,<span className="text-indigo-600 font-semibold">phone</span>,<span className="text-indigo-600 font-semibold">grade</span>,<span className="text-indigo-600 font-semibold">status</span>,<span className="text-indigo-600 font-semibold">parent_name</span>,<span className="text-indigo-600 font-semibold">parent_phone</span>,<span className="text-indigo-600 font-semibold">parent_email</span><br />
            Rina Pelajar,rina@example.com,0812...,10th Grade,ACTIVE,Budi,0812...,budi@example.com<br />
            Dimas Pelajar,,0813...,11th Grade,ACTIVE,Siti,0813...,
          </div>
          <p className="text-[10px] text-zinc-400"><Trans i18nKey="students.import.fieldsRequired" components={{ strong: <strong /> }} /></p>
        </div>

        {/* Upload Area */}
        <div
          className={cn(
            'border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3 transition-colors cursor-pointer',
            importFile
              ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10'
              : 'border-zinc-200 dark:border-zinc-800 hover:border-indigo-400'
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleFileChange}
          />
          {importFile ? (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{importFile.name}</p>
                <p className="text-xs text-zinc-500">{(importFile.size / 1024).toFixed(1)} KB — {t('students.import.clickToChange')}</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Upload size={24} className="text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-bold dark:text-zinc-200">{t('students.import.clickToUpload')}</p>
                <p className="text-xs text-zinc-500">{t('students.import.onlyCsv')}</p>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <Button
            variant="outline"
            className="flex-1 justify-center"
            onClick={handleClose}
          >
            {t('common.cancel')}
          </Button>
          <Button
            className="flex-1 justify-center"
            onClick={handleSubmit}
            disabled={!importFile || isPending}
          >
            <Upload size={16} />
            {isPending ? t('students.importing') : t('students.import.importStudents')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
