import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { AuditLogDiffView } from './AuditLogDiffView';

// Adapt the import path for AuditLogEntry based on the actual service file location
import type { AuditLogEntry } from '@/src/services/audit-log.service';

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  ADMIN: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  TUTOR: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PARENT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface AuditLogTableProps {
  data: AuditLogEntry[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  showInstitution?: boolean;
  isLoading?: boolean;
}

export function AuditLogTable({
  data,
  expandedId,
  onToggleExpand,
  showInstitution = false,
  isLoading,
}: AuditLogTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
        No audit logs found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700 text-left text-zinc-500 dark:text-zinc-400">
            <th className="pb-3 pl-4 pr-2 w-8"></th>
            <th className="pb-3 px-3 font-medium">Timestamp</th>
            <th className="pb-3 px-3 font-medium">User</th>
            <th className="pb-3 px-3 font-medium">Action</th>
            <th className="pb-3 px-3 font-medium">Resource</th>
            <th className="pb-3 px-3 font-medium">Summary</th>
            {showInstitution && <th className="pb-3 px-3 font-medium">Institution</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {data.map((entry) => (
            <React.Fragment key={entry.id}>
              <tr
                onClick={() => onToggleExpand(entry.id)}
                className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <td className="py-3 pl-4 pr-2">
                  {expandedId === entry.id ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  )}
                </td>
                <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                  {formatDate(entry.created_at)}
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-900 dark:text-zinc-100">{entry.user.name}</span>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', ROLE_STYLES[entry.user_role] ?? '')}>
                      {entry.user_role}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span className={cn('text-xs px-2 py-1 rounded font-medium', ACTION_STYLES[entry.action] ?? '')}>
                    {entry.action}
                  </span>
                </td>
                <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300">
                  {entry.resource_type}
                </td>
                <td className="py-3 px-3 text-zinc-700 dark:text-zinc-200 max-w-xs truncate">
                  {entry.summary}
                </td>
                {showInstitution && (
                  <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300">
                    {entry.institution?.name ?? '—'}
                  </td>
                )}
              </tr>
              {expandedId === entry.id && (
                <tr>
                  <td colSpan={showInstitution ? 7 : 6} className="p-0">
                    <AuditLogDiffView changes={entry.changes} action={entry.action} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
