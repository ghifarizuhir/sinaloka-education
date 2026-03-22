import React from 'react';
import { cn } from '../../lib/utils';
import { Card } from './card';

export const StatCard = ({ label, value, icon: Icon, iconBg, iconColor, className, testId }: {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  iconBg?: string;
  iconColor?: string;
  className?: string;
  testId?: string;
}) => (
  <Card className={cn("p-4", className)} data-testid={testId}>
    {Icon && (
      <div className="flex items-center justify-between mb-3">
        <div className={cn("p-2 rounded-xl", iconBg)}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
    )}
    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
    <p className="text-xl font-bold tracking-tight text-foreground mt-1">{String(value)}</p>
  </Card>
);
