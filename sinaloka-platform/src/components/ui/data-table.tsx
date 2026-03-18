import React from 'react';
import { cn } from '../../lib/utils';

const DataTableRoot = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <table className={cn("w-full text-left border-collapse", className)}>{children}</table>
);

const DataTableHeader = ({ children }: { children: React.ReactNode }) => (
  <thead><tr className="bg-muted/50 border-b border-border">{children}</tr></thead>
);

const DataTableBody = ({ children }: { children: React.ReactNode }) => (
  <tbody className="divide-y divide-border">{children}</tbody>
);

const DataTableRow = ({ children, className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("hover:bg-muted/50 transition-colors", className)} {...props}>{children}</tr>
);

const DataTableCell = ({ children, header, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { header?: boolean }) => {
  if (header) return <th className={cn("px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider", className)} {...(props as any)}>{children}</th>;
  return <td className={cn("px-6 py-4", className)} {...props}>{children}</td>;
};

export const DataTable = Object.assign(DataTableRoot, {
  Header: DataTableHeader,
  Body: DataTableBody,
  Row: DataTableRow,
  Cell: DataTableCell,
});
