import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';
import { useAuditLogPage } from './useAuditLogPage';
import { AuditLogFilters } from './AuditLogFilters';
import { AuditLogTable } from './AuditLogTable';

export function AuditLog() {
  const { user } = useAuth();
  const {
    data, meta, isLoading, isFetching, page, setPage,
    filters, updateFilter, resetFilters, expandedId, toggleExpanded,
  } = useAuditLogPage();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <ClipboardList className="w-7 h-7" />
          Audit Log
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Track all changes made across the platform.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <AuditLogFilters filters={filters} onFilterChange={updateFilter} onReset={resetFilters} />
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <AuditLogTable
          data={data}
          expandedId={expandedId}
          onToggleExpand={toggleExpanded}
          showInstitution={isSuperAdmin}
          isLoading={isLoading}
        />

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-700">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Page {meta.page} of {meta.totalPages} ({meta.total} entries)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= meta.totalPages}
                className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {isFetching && !isLoading && (
              <span className="text-xs text-zinc-400">Loading...</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
