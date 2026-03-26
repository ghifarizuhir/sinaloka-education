import { useState, useRef, useEffect } from 'react';
import { icons, type LucideIcon } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const POPULAR_ICONS = [
  'Users', 'BookOpen', 'CheckCircle', 'GraduationCap', 'Target',
  'Trophy', 'Star', 'Clock', 'Heart', 'Lightbulb', 'MessageCircle',
  'BarChart', 'Shield', 'Zap', 'Globe', 'Headphones', 'Award',
  'Brain', 'Rocket', 'ThumbsUp', 'Smile', 'Calendar', 'Monitor',
  'Wifi',
] as const;

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const CurrentIcon = (icons as Record<string, LucideIcon>)[value];

  const filtered = search
    ? Object.keys(icons).filter((name) =>
        name.toLowerCase().includes(search.toLowerCase()),
      ).slice(0, 24)
    : POPULAR_ICONS as unknown as string[];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-10 h-10 flex items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700"
      >
        {CurrentIcon ? <CurrentIcon size={18} /> : <span className="text-xs text-zinc-400">?</span>}
      </button>
      {open && (
        <div className="absolute z-50 top-12 left-0 w-64 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search icons..."
            className="w-full px-2 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded mb-2"
            autoFocus
          />
          <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
            {filtered.map((name) => {
              const Icon = (icons as Record<string, LucideIcon>)[name];
              if (!Icon) return null;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => { onChange(name); setOpen(false); setSearch(''); }}
                  className={cn(
                    'w-9 h-9 flex items-center justify-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800',
                    value === name && 'bg-primary/10 text-primary',
                  )}
                  title={name}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
