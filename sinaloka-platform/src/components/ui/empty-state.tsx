import React from 'react';

export const EmptyState = ({ icon: Icon, title, description, action }: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    {Icon && (
      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
        <Icon size={32} className="text-muted-foreground/50" />
      </div>
    )}
    <h3 className="text-lg font-bold mb-1 text-foreground">{title}</h3>
    {description && <p className="text-muted-foreground text-sm mb-6">{description}</p>}
    {action}
  </div>
);
