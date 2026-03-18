import React from 'react';

export const PageHeader = ({ title, subtitle, actions }: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
      {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-3">{actions}</div>}
  </div>
);
