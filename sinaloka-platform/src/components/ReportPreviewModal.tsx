import React, { useState, useEffect } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { Modal, Button, Label, Input, Skeleton } from './UI';
import { cn } from '../lib/utils';
import { useAttendanceReport, useFinanceReport, useStudentProgressReport } from '@/src/hooks/useReports';
import { useClasses } from '@/src/hooks/useClasses';
import { useStudents } from '@/src/hooks/useStudents';

type ReportType = 'attendance' | 'finance' | 'student_progress';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportPreviewModal({ isOpen, onClose }: ReportPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<ReportType>('finance');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [generateEnabled, setGenerateEnabled] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const { data: classesData } = useClasses({ limit: 100 });
  const { data: studentsData } = useStudents({ limit: 100 });

  const classes = classesData?.data ?? [];
  const students = studentsData?.data ?? [];

  // Report queries — only one is enabled at a time
  const attendanceReport = useAttendanceReport(
    { date_from: dateFrom, date_to: dateTo, class_id: selectedClassId || undefined },
    generateEnabled && activeTab === 'attendance' && !!dateFrom && !!dateTo
  );

  const financeReport = useFinanceReport(
    { date_from: dateFrom, date_to: dateTo },
    generateEnabled && activeTab === 'finance' && !!dateFrom && !!dateTo
  );

  const studentProgressReport = useStudentProgressReport(
    { student_id: selectedStudentId, date_from: dateFrom || undefined, date_to: dateTo || undefined },
    generateEnabled && activeTab === 'student_progress' && !!selectedStudentId
  );

  // Get the active blob data
  const activeBlob: Blob | null =
    activeTab === 'attendance' ? (attendanceReport.data ?? null) :
    activeTab === 'finance' ? (financeReport.data ?? null) :
    (studentProgressReport.data ?? null);

  const isActiveLoading =
    activeTab === 'attendance' ? attendanceReport.isFetching :
    activeTab === 'finance' ? financeReport.isFetching :
    studentProgressReport.isFetching;

  // Update blob URL when blob data changes
  useEffect(() => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
    if (activeBlob) {
      const url = URL.createObjectURL(activeBlob);
      setBlobUrl(url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBlob]);

  // Cleanup blob URL on unmount / close
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (tab: ReportType) => {
    setActiveTab(tab);
    setGenerateEnabled(false);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
  };

  const handleGenerate = () => {
    if (!dateFrom || !dateTo) {
      if (activeTab !== 'student_progress') return;
    }
    if (activeTab === 'student_progress' && !selectedStudentId) return;
    setGenerateEnabled(true);
  };

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${activeTab}-report-${dateFrom}-${dateTo}.pdf`;
    a.click();
  };

  const tabs: { id: ReportType; label: string }[] = [
    { id: 'attendance', label: 'Attendance' },
    { id: 'finance', label: 'Finance' },
    { id: 'student_progress', label: 'Student Progress' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Report" className="max-w-4xl">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-md transition-all",
                activeTab === tab.id
                  ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Date From {activeTab !== 'student_progress' && <span className="text-rose-500">*</span>}</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setGenerateEnabled(false); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Date To {activeTab !== 'student_progress' && <span className="text-rose-500">*</span>}</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setGenerateEnabled(false); }}
            />
          </div>

          {activeTab === 'attendance' && (
            <div className="space-y-1.5">
              <Label>Class (optional)</Label>
              <select
                value={selectedClassId}
                onChange={(e) => { setSelectedClassId(e.target.value); setGenerateEnabled(false); }}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:text-zinc-100"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'student_progress' && (
            <div className="space-y-1.5">
              <Label>Student <span className="text-rose-500">*</span></Label>
              <select
                value={selectedStudentId}
                onChange={(e) => { setSelectedStudentId(e.target.value); setGenerateEnabled(false); }}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:text-zinc-100"
              >
                <option value="">Select student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleGenerate}
            disabled={isActiveLoading}
            className="gap-2"
          >
            {isActiveLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText size={16} />
                Generate
              </>
            )}
          </Button>

          {blobUrl && (
            <Button variant="outline" onClick={handleDownload} className="gap-2">
              <Download size={16} />
              Download PDF
            </Button>
          )}
        </div>

        {/* PDF Preview */}
        {isActiveLoading && (
          <div className="space-y-2">
            <Skeleton className="h-[500px] w-full rounded-xl" />
          </div>
        )}

        {blobUrl && !isActiveLoading && (
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <iframe
              src={blobUrl}
              className="w-full h-[500px]"
              title="Report Preview"
            />
          </div>
        )}

        {!blobUrl && !isActiveLoading && (
          <div className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400">
            <FileText size={32} className="mb-3" />
            <p className="text-sm font-medium">Select filters and click Generate</p>
            <p className="text-xs mt-1">PDF preview will appear here</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
