import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Check, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';

export const Card = ({ children, className, ...props }: { children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-6 shadow-sm transition-colors", className)} {...props}>
    {children}
  </div>
);

export const Button = ({ children, variant = 'primary', className, size = 'md', ...props }: any) => {
  const variants = {
    primary: "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200",
    secondary: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700",
    outline: "bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-900 dark:hover:border-zinc-100 hover:text-zinc-900 dark:hover:text-zinc-100"
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };
  
  return (
    <button 
      className={cn(
        "rounded-lg font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed", 
        variants[variant as keyof typeof variants],
        sizes[size as keyof typeof sizes],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      "flex h-10 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
);

export function PasswordInput(props: Omit<React.ComponentProps<'input'>, 'type'>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? 'text' : 'password'} className={cn(props.className, 'pr-10')} />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        onClick={() => setShow(!show)}
        aria-label={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export const SearchInput = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
    <input
      className={cn(
        "flex h-10 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-10 pr-3 py-2 text-sm ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
);

export const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-zinc-300",
      className
    )}
    {...props}
  />
);

export const Badge = ({ children, variant = 'default', className, ...props }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'error' | 'outline', className?: string } & React.HTMLAttributes<HTMLSpanElement>) => {
  const variants = {
    default: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
    success: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
    error: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    outline: "border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
  };

  return (
    <span className={cn("text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full", variants[variant], className)} {...props}>
      {children}
    </span>
  );
};

export const Progress = ({ value, max = 100, className }: { value: number, max?: number, className?: string }) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  return (
    <div className={cn("h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden", className)}>
      <div 
        className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export const Checkbox = ({ checked, onChange, disabled, className }: { checked: boolean, onChange: (checked: boolean) => void, disabled?: boolean, className?: string }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={cn(
      "w-4 h-4 rounded border flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed",
      checked 
        ? "bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900" 
        : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800",
      className
    )}
  >
    {checked && <Check size={12} strokeWidth={3} />}
  </button>
);

export const Switch = ({ checked, onChange, disabled, className }: { checked: boolean, onChange: (checked: boolean) => void, disabled?: boolean, className?: string }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn(
      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 focus-visible:ring-offset-2 ring-offset-white dark:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed",
      checked ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-800",
      className
    )}
  >
    <span
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-white dark:bg-zinc-950 shadow-lg ring-0 transition-transform",
        checked ? "translate-x-4" : "translate-x-1"
      )}
    />
  </button>
);

export const Slider = ({ value, min = 0, max = 100, step = 1, onChange, className }: { value: number, min?: number, max?: number, step?: number, onChange: (val: number) => void, className?: string }) => (
  <input
    type="range"
    min={min}
    max={max}
    step={step}
    value={value}
    onChange={(e) => onChange(parseFloat(e.target.value))}
    className={cn("w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100", className)}
  />
);

export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-lg", className)} {...props} />
);

function useOverlayClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
}

export function Modal({ isOpen, onClose, title, children, className }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, className?: string }) {
  useOverlayClose(isOpen, onClose);
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            className={cn("relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden", className)}
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-xl font-bold dark:text-zinc-100">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, description, confirmLabel, cancelLabel, variant = 'danger', isLoading }: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  isLoading?: boolean;
}) {
  useOverlayClose(isOpen, onClose);
  return (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          role="alertdialog"
          aria-modal="true"
          className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-bold dark:text-zinc-100">{title}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                {cancelLabel ?? 'Cancel'}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2",
                  variant === 'danger'
                    ? "bg-rose-600 text-white hover:bg-rose-700"
                    : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                )}
              >
                {isLoading && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
  );
}

export function Drawer({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  useOverlayClose(isOpen, onClose);
  return (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
        />
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-md bg-white dark:bg-zinc-900 h-full shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-xl font-bold dark:text-zinc-100">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
  );
}

// ── MultiSelect ──
export const MultiSelect = ({ options, selected, onChange, placeholder = 'Search...' }: {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(
    o => !selected.includes(o.id) && o.label.toLowerCase().includes(query.toLowerCase())
  );

  const selectedOptions = options.filter(o => selected.includes(o.id));

  return (
    <div ref={ref} className="relative">
      <div
        className="flex flex-wrap gap-1.5 p-2 min-h-[42px] max-h-32 overflow-auto border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 cursor-text"
        onClick={() => setIsOpen(true)}
      >
        {selectedOptions.map(o => (
          <span key={o.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            {o.label}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(selected.filter(id => id !== o.id)); }}
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') setIsOpen(false); }}
          placeholder={selected.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] text-sm bg-transparent border-none outline-none placeholder:text-zinc-400 dark:text-zinc-100"
        />
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-zinc-400">No options found</div>
          ) : filtered.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => { onChange([...selected, o.id]); setQuery(''); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors dark:text-zinc-300"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Select ──
function isOptionGroup(opt: any): opt is { label: string; options: { value: string; label: string; disabled?: boolean }[] } {
  return 'options' in opt;
}

export const Select = ({ value, onChange, options, placeholder, className, ...rest }: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  options: ({ value: string; label: string; disabled?: boolean } | { label: string; options: { value: string; label: string; disabled?: boolean }[] })[];
  placeholder?: string;
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={cn(
      "h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 focus-visible:ring-offset-2 dark:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...rest}
  >
    {placeholder && <option value="" disabled>{placeholder}</option>}
    {options.map((opt, i) =>
      isOptionGroup(opt) ? (
        <optgroup key={i} label={opt.label}>
          {opt.options.map(o => (
            <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
          ))}
        </optgroup>
      ) : (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
      )
    )}
  </select>
);

// ── DropdownMenu ──
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
        className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
              "absolute top-full mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl z-10 p-1",
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >
            {items.map((item, i) => {
              if ('separator' in item) {
                return <div key={i} className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />;
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
                      ? "hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800",
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

// ── Tabs ──
export const Tabs = ({ value, onChange, items, className }: {
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string; disabled?: boolean }[];
  className?: string;
}) => (
  <div className={cn("flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg", className)}>
    {items.map(item => (
      <button
        key={item.value}
        type="button"
        disabled={item.disabled}
        onClick={() => !item.disabled && onChange(item.value)}
        className={cn(
          "px-3 py-1.5 text-xs font-bold rounded-md transition-all",
          value === item.value
            ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100"
            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
          item.disabled && "opacity-40 cursor-not-allowed"
        )}
      >
        {item.label}
      </button>
    ))}
  </div>
);

// ── PageHeader ──
export const PageHeader = ({ title, subtitle, actions }: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <h2 className="text-2xl font-bold tracking-tight dark:text-zinc-100">{title}</h2>
      {subtitle && <p className="text-zinc-500 text-sm">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-3">{actions}</div>}
  </div>
);

// ── Separator ──
export const Separator = ({ className }: { className?: string }) => (
  <div className={cn("h-px bg-zinc-100 dark:bg-zinc-800", className)} />
);

// ── Spinner ──
export const Spinner = ({ size = 'md', className }: { size?: 'sm' | 'md'; className?: string }) => (
  <svg className={cn("animate-spin", size === 'sm' ? 'h-4 w-4' : 'h-5 w-5', className)} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ── Avatar ──
export const Avatar = ({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) => {
  const initial = name.split(' ').pop()?.charAt(0)?.toUpperCase() ?? '?';
  const sizes = {
    sm: 'w-8 h-8 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
    md: 'w-10 h-10 rounded-xl text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900',
    lg: 'w-16 h-16 rounded-2xl text-2xl shadow-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900',
  };
  return (
    <div className={cn("flex items-center justify-center font-bold", sizes[size], className)}>
      {initial}
    </div>
  );
};

// ── EmptyState ──
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

// ── StatCard ──
export const StatCard = ({ label, value, icon: Icon, iconBg, iconColor, className }: {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  iconBg?: string;
  iconColor?: string;
  className?: string;
}) => (
  <Card className={cn("p-4", className)}>
    {Icon && (
      <div className="flex items-center justify-between mb-3">
        <div className={cn("p-2 rounded-xl", iconBg)}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
    )}
    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
    <p className="text-xl font-bold tracking-tight dark:text-zinc-100 mt-1">{String(value)}</p>
  </Card>
);

// ── DataTable ──
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

// ── Pagination ──
export const Pagination = ({ currentPage, totalPages, total, itemsPerPage, onPageChange, className }: {
  currentPage: number;
  totalPages: number;
  total: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}) => {
  const { t } = useTranslation();
  const from = Math.min((currentPage - 1) * itemsPerPage + 1, total);
  const to = Math.min(currentPage * itemsPerPage, total);
  const maxButtons = 5;
  const startPage = Math.max(1, Math.min(currentPage - Math.floor(maxButtons / 2), totalPages - maxButtons + 1));
  const pages = Array.from({ length: Math.min(maxButtons, totalPages) }, (_, i) => startPage + i);

  if (totalPages <= 1 && total <= itemsPerPage) return null;

  return (
    <div className={cn("p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/30", className)}>
      <p className="text-xs text-zinc-500">
        {t('common.showing')} <span className="font-bold text-zinc-900 dark:text-zinc-100">{from}</span> {t('common.to')} <span className="font-bold text-zinc-900 dark:text-zinc-100">{to}</span> {t('common.of')} <span className="font-bold text-zinc-900 dark:text-zinc-100">{total}</span> {t('common.results')}
      </p>
      <div className="flex items-center gap-2">
        <button disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} className="p-1.5 disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-1">
          {pages.map(page => (
            <button key={page} onClick={() => onPageChange(page)} className={cn("w-8 h-8 text-xs font-bold rounded-lg transition-all", currentPage === page ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500")}>
              {page}
            </button>
          ))}
        </div>
        <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => onPageChange(currentPage + 1)} className="p-1.5 disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
