import React, { useRef, useState, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MoreHorizontal,
  Trash2,
  UserPlus,
  Eye,
  Search,
  AlertTriangle
} from 'lucide-react';
import { Badge, Button, Checkbox, Avatar, EmptyState } from '../../components/UI';
import { cn } from '../../lib/utils';
import type { Student } from '@/src/types/student';
import type { TFunction } from 'i18next';

interface StudentTableProps {
  students: Student[];
  selectedIds: string[];
  flaggedStudentIds: Set<string>;
  visibleColumns: string[];
  activeActionMenu: string | null;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onRowClick: (student: Student) => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  onInviteParent: (student: Student) => void;
  onActionMenuToggle: (id: string | null) => void;
  onClearFilters: () => void;
  t: TFunction;
}

const ActionMenu: React.FC<{
  student: Student;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEdit: (s: Student) => void;
  onDelete: (s: Student) => void;
  onInviteParent: (s: Student) => void;
  t: TFunction;
}> = ({ student, isOpen, onToggle, onClose, onEdit, onDelete, onInviteParent, t }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  useLayoutEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        ref={buttonRef}
        onClick={onToggle}
        className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <MoreHorizontal size={16} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed w-36 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl z-20 p-1"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              <button
                onClick={() => { onEdit(student); onClose(); }}
                className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg flex items-center gap-2"
              >
                <Eye size={14} /> {t('students.bulk.viewEdit')}
              </button>
              {student.parent_email && (
                <button
                  onClick={() => { onInviteParent(student); onClose(); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg flex items-center gap-2"
                >
                  <UserPlus size={14} /> {t('students.bulk.inviteParent')}
                </button>
              )}
              <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
              <button
                onClick={() => { onDelete(student); onClose(); }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg flex items-center gap-2"
              >
                <Trash2 size={14} /> {t('common.delete')}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  selectedIds,
  flaggedStudentIds,
  visibleColumns,
  activeActionMenu,
  onToggleSelectAll,
  onToggleSelect,
  onRowClick,
  onEdit,
  onDelete,
  onInviteParent,
  onActionMenuToggle,
  onClearFilters,
  t,
}) => {
  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-360px)] scrollbar-thin">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 z-10">
            <th className="px-6 py-3 w-10">
              <Checkbox
                checked={selectedIds.length === students.length && students.length > 0}
                onChange={onToggleSelectAll}
              />
            </th>
            <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('students.table.name')}</th>
            {visibleColumns.includes('email') && <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('students.table.email')}</th>}
            {visibleColumns.includes('grade') && <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('students.table.grade')}</th>}
            {visibleColumns.includes('parent') && <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('students.table.parentGuardian')}</th>}
            {visibleColumns.includes('status') && <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('students.table.status')}</th>}
            <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {students.length > 0 ? (
            students.map((student) => (
              <tr
                key={student.id}
                className={cn(
                  'hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group cursor-pointer',
                  selectedIds.includes(student.id) && 'bg-indigo-50/30 dark:bg-indigo-900/10'
                )}
                onClick={() => onRowClick(student)}
              >
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(student.id)}
                    onChange={() => onToggleSelect(student.id)}
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={student.name} size="sm" />
                    <div>
                      <span className="text-sm font-medium dark:text-zinc-200 block">{student.name}</span>
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-tighter">ID: {student.id.slice(0, 8)}</span>
                    </div>
                    {flaggedStudentIds.has(student.id) && (
                      <AlertTriangle size={14} className="text-amber-500 shrink-0" title={t('payments.overdueAlert.warning')} />
                    )}
                  </div>
                </td>
                {visibleColumns.includes('email') && (
                  <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">{student.email ?? '—'}</td>
                )}
                {visibleColumns.includes('grade') && (
                  <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">{student.grade}</td>
                )}
                {visibleColumns.includes('parent') && (
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-zinc-600 dark:text-zinc-300">{student.parent_name ?? '—'}</span>
                      <span className="text-xs text-zinc-400">{student.parent_phone ?? ''}</span>
                    </div>
                  </td>
                )}
                {visibleColumns.includes('status') && (
                  <td className="px-6 py-4">
                    <Badge variant={student.status === 'ACTIVE' ? 'success' : 'default'}>
                      {student.status === 'ACTIVE' ? t('common.active') : t('common.inactive')}
                    </Badge>
                  </td>
                )}
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <ActionMenu
                    student={student}
                    isOpen={activeActionMenu === student.id}
                    onToggle={() => onActionMenuToggle(activeActionMenu === student.id ? null : student.id)}
                    onClose={() => onActionMenuToggle(null)}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onInviteParent={onInviteParent}
                    t={t}
                  />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7}>
                <EmptyState
                  icon={Search}
                  title={t('students.noStudentsFound')}
                  description={t('students.noStudentsHint')}
                  action={
                    <Button variant="outline" onClick={onClearFilters}>
                      {t('common.clearAllFilters')}
                    </Button>
                  }
                />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
