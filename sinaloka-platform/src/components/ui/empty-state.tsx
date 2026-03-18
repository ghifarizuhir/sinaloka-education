import React from 'react';

export const EmptyState = ({ icon: Icon, title, description, action }: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    {Icon && (
      <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
        <Icon size={32} className="text-zinc-300" />
      </div>
    )}
    <h3 className="text-lg font-bold mb-1 dark:text-zinc-100">{title}</h3>
    {description && <p className="text-zinc-500 text-sm mb-6">{description}</p>}
    {action}
  </div>
);
