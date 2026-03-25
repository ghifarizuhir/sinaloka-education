import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  MoreVertical,
  Pencil,
  Trash2,
  Plus,
  Archive,
  Copy,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { Card, Badge, Button, DropdownMenu } from '../../components/ui';
import { cn } from '../../lib/utils';
import type { AcademicYear, Semester } from '@/src/types/academic-year';
import type { TFunction } from 'i18next';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function SemesterRow({
  semester,
  onEdit,
  onDelete,
  onArchive,
  onRollOver,
  t,
}: {
  key?: React.Key;
  semester: Semester;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onRollOver: () => void;
  t: TFunction;
}) {
  const classCount = semester._count?.classes ?? 0;
  const canDelete = classCount === 0;

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
          <Calendar size={14} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{semester.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(semester.start_date)} — {formatDate(semester.end_date)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Badge variant={semester.status === 'ACTIVE' ? 'success' : 'default'}>
          {semester.status === 'ACTIVE' ? t('common.active') : t('common.archived')}
        </Badge>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <BookOpen size={12} />
          {classCount}
        </span>

        <DropdownMenu
          trigger={<MoreVertical size={16} />}
          items={[
            { label: t('common.edit'), icon: Pencil, onClick: onEdit },
            {
              label: t('academicYears.rollOver'),
              icon: Copy,
              onClick: onRollOver,
            },
            { separator: true },
            {
              label: t('academicYears.archive'),
              icon: Archive,
              onClick: onArchive,
              disabled: semester.status === 'ARCHIVED',
            },
            {
              label: t('common.delete'),
              icon: Trash2,
              onClick: onDelete,
              variant: 'danger' as const,
              disabled: !canDelete,
            },
          ]}
        />
      </div>
    </div>
  );
}

export function AcademicYearCard({
  year,
  isExpanded,
  onToggle,
  onEditYear,
  onDeleteYear,
  onAddSemester,
  onEditSemester,
  onDeleteSemester,
  onArchiveSemester,
  onRollOver,
  t,
}: {
  key?: React.Key;
  year: AcademicYear;
  isExpanded: boolean;
  onToggle: () => void;
  onEditYear: () => void;
  onDeleteYear: () => void;
  onAddSemester: () => void;
  onEditSemester: (semester: Semester) => void;
  onDeleteSemester: (semester: Semester) => void;
  onArchiveSemester: (semester: Semester) => void;
  onRollOver: (semester: Semester) => void;
  t: TFunction;
}) {
  const canDeleteYear = year.semesters.length === 0;

  return (
    <Card className="overflow-hidden">
      {/* Year header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <motion.div
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={18} className="text-muted-foreground" />
          </motion.div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold truncate">{year.name}</h3>
              <Badge variant={year.status === 'ACTIVE' ? 'success' : 'default'}>
                {year.status === 'ACTIVE' ? t('common.active') : t('common.archived')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(year.start_date)} — {formatDate(year.end_date)}
              <span className="mx-1.5">&middot;</span>
              {t('academicYears.semesterCount', { count: year.semesters.length })}
            </p>
          </div>
        </div>

        <div
          className="shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu
            trigger={<MoreVertical size={16} />}
            items={[
              { label: t('common.edit'), icon: Pencil, onClick: onEditYear },
              { separator: true },
              {
                label: t('common.delete'),
                icon: Trash2,
                onClick: onDeleteYear,
                variant: 'danger' as const,
                disabled: !canDeleteYear,
              },
            ]}
          />
        </div>
      </div>

      {/* Semesters (expandable) */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-border">
              {year.semesters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t('academicYears.noSemesters')}
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {year.semesters.map((sem) => (
                    <SemesterRow
                      key={sem.id}
                      semester={sem}
                      onEdit={() => onEditSemester(sem)}
                      onDelete={() => onDeleteSemester(sem)}
                      onArchive={() => onArchiveSemester(sem)}
                      onRollOver={() => onRollOver(sem)}
                      t={t}
                    />
                  ))}
                </div>
              )}
              <div className="p-3 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAddSemester}
                  className="w-full"
                >
                  <Plus size={14} />
                  {t('academicYears.addSemester')}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
