import React from 'react';
import { cn } from '../../lib/utils';

const DataTableRoot = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <table className={cn("w-full text-left border-collapse", className)}>{children}</table>
);

const DataTableHeader = ({ children }: { children: React.ReactNode }) => (
  <thead><tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">{children}</tr></thead>
);

const DataTableBody = ({ children }: { children: React.ReactNode }) => (
  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">{children}</tbody>
);

const DataTableRow = ({ children, className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors", className)} {...props}>{children}</tr>
);

const DataTableCell = ({ children, header, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { header?: boolean }) => {
  if (header) return <th className={cn("px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider", className)} {...(props as any)}>{children}</th>;
  return <td className={cn("px-6 py-4", className)} {...props}>{children}</td>;
};

export const DataTable = Object.assign(DataTableRoot, {
  Header: DataTableHeader,
  Body: DataTableBody,
  Row: DataTableRow,
  Cell: DataTableCell,
});
