interface DiffEntry {
  before: unknown;
  after: unknown;
}

interface AuditLogDiffViewProps {
  changes: Record<string, DiffEntry> | null;
  action: string;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function AuditLogDiffView({ changes, action }: AuditLogDiffViewProps) {
  if (!changes || Object.keys(changes).length === 0) {
    return (
      <div className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
        No detailed changes recorded.
      </div>
    );
  }

  return (
    <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-zinc-500 dark:text-zinc-400">
            <th className="pb-2 pr-4 font-medium w-1/4">Field</th>
            {action !== 'CREATE' && (
              <th className="pb-2 pr-4 font-medium w-[37.5%]">Before</th>
            )}
            {action !== 'DELETE' && (
              <th className="pb-2 font-medium w-[37.5%]">After</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
          {Object.entries(changes).map(([field, diff]) => (
            <tr key={field}>
              <td className="py-2 pr-4 font-mono text-zinc-600 dark:text-zinc-300">
                {field}
              </td>
              {action !== 'CREATE' && (
                <td className="py-2 pr-4 text-red-600 dark:text-red-400">
                  {formatValue(diff.before)}
                </td>
              )}
              {action !== 'DELETE' && (
                <td className="py-2 text-green-600 dark:text-green-400">
                  {formatValue(diff.after)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
