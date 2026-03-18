import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function DropdownMenu({ trigger, items, align = 'right' }: {
  trigger: React.ReactNode;
  items: (
    | { label: string; icon?: React.ComponentType<{ size?: number }>; onClick: () => void; variant?: 'default' | 'danger'; className?: string; disabled?: boolean }
    | { separator: true }
    | { content: React.ReactNode }
  )[];
  align?: 'left' | 'right';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsOpen(prev => !prev); }}
        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent"
      >
        {trigger}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute top-full mt-1 w-48 bg-popover border border-border rounded-xl shadow-xl z-10 p-1",
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >
            {items.map((item, i) => {
              if ('separator' in item) {
                return <div key={i} className="h-px bg-border my-1" />;
              }
              if ('content' in item) {
                return <div key={i}>{item.content}</div>;
              }
              const Icon = item.icon;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => { if (!item.disabled) { item.onClick(); setIsOpen(false); } }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                    item.disabled && "opacity-50 cursor-not-allowed",
                    item.variant === 'danger'
                      ? "hover:bg-destructive/10 text-destructive"
                      : "hover:bg-accent",
                    item.className
                  )}
                >
                  {Icon && <Icon size={14} />}
                  {item.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
