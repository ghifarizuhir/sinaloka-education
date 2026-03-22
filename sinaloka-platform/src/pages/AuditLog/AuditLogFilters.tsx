import { X } from 'lucide-react';

const ACTION_OPTIONS = [
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
];

const RESOURCE_TYPE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'tutor', label: 'Tutor' },
  { value: 'parent', label: 'Parent' },
  { value: 'class', label: 'Class' },
  { value: 'session', label: 'Session' },
  { value: 'payment', label: 'Payment' },
  { value: 'enrollment', label: 'Enrollment' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'expense', label: 'Expense' },
  { value: 'subject', label: 'Subject' },
  { value: 'registration', label: 'Registration' },
  { value: 'settlement', label: 'Settlement' },
  { value: 'whatsapp_template', label: 'WhatsApp Template' },
];

interface AuditLogFiltersProps {
  filters: {
    action?: string;
    resource_type?: string;
    date_from?: string;
    date_to?: string;
  };
  onFilterChange: (key: string, value: string | undefined) => void;
  onReset: () => void;
}

export function AuditLogFilters({ filters, onFilterChange, onReset }: AuditLogFiltersProps) {
  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={filters.action ?? ''}
        onChange={(e) => onFilterChange('action', e.target.value || undefined)}
        className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
      >
        <option value="">All Actions</option>
        {ACTION_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <select
        value={filters.resource_type ?? ''}
        onChange={(e) => onFilterChange('resource_type', e.target.value || undefined)}
        className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
      >
        <option value="">All Resources</option>
        {RESOURCE_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <input
        type="date"
        value={filters.date_from ?? ''}
        onChange={(e) => onFilterChange('date_from', e.target.value || undefined)}
        className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
      />

      <input
        type="date"
        value={filters.date_to ?? ''}
        onChange={(e) => onFilterChange('date_to', e.target.value || undefined)}
        className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
      />

      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
          Reset
        </button>
      )}
    </div>
  );
}
