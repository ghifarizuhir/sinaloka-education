import { Check } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { TEMPLATE_LIST, type TemplateId } from '@/src/pages/public/templates/template-config';

interface TemplateSelectorProps {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
}

function BoldGeometricThumb() {
  return (
    <div className="space-y-1.5">
      <div className="w-full h-12 rounded-md bg-teal-500 flex flex-col items-center justify-center gap-0.5">
        <div className="w-4 h-4 rounded bg-white/40" />
        <div className="w-12 h-1 rounded bg-white/50" />
      </div>
      <div className="grid grid-cols-2 gap-1">
        <div className="h-6 rounded border-l-2 border-teal-500 bg-teal-50" />
        <div className="h-6 rounded border-l-2 border-teal-500 bg-teal-50" />
      </div>
      <div className="flex gap-1">
        <div className="h-2 w-8 rounded-full border border-teal-300 bg-teal-50" />
        <div className="h-2 w-6 rounded-full border border-teal-300 bg-teal-50" />
      </div>
    </div>
  );
}

function SoftFriendlyThumb() {
  return (
    <div className="space-y-1.5">
      <div className="w-full h-12 rounded-xl bg-gradient-to-b from-amber-200 to-orange-100 flex flex-col items-center justify-center gap-0.5">
        <div className="w-4 h-4 rounded-full bg-amber-400/60" />
        <div className="w-12 h-1 rounded bg-amber-600/30" />
      </div>
      <div className="grid grid-cols-2 gap-1">
        <div className="h-6 rounded-xl bg-white shadow-sm" />
        <div className="h-6 rounded-xl bg-white shadow-sm" />
      </div>
      <div className="flex gap-1">
        <div className="h-2 w-8 rounded-full bg-amber-100" />
        <div className="h-2 w-6 rounded-full bg-pink-100" />
      </div>
    </div>
  );
}

function CleanMinimalThumb() {
  return (
    <div className="space-y-1.5">
      <div className="w-full h-12 bg-slate-800 flex flex-col items-center justify-center gap-0.5 border-b border-slate-600">
        <div className="w-4 h-4 rounded-sm bg-white/20" />
        <div className="w-12 h-1 rounded bg-white/30" />
      </div>
      <div className="grid grid-cols-2 gap-1">
        <div className="h-6 rounded-sm bg-slate-100" />
        <div className="h-6 rounded-sm bg-slate-100" />
      </div>
      <div className="flex gap-1">
        <div className="h-2 w-8 rounded-sm bg-slate-200" />
        <div className="h-2 w-6 rounded-sm bg-slate-200" />
      </div>
    </div>
  );
}

const thumbnails: Record<TemplateId, React.FC> = {
  'bold-geometric': BoldGeometricThumb,
  'soft-friendly': SoftFriendlyThumb,
  'clean-minimal': CleanMinimalThumb,
};

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {TEMPLATE_LIST.map((tmpl) => {
        const isActive = value === tmpl.id;
        const Thumb = thumbnails[tmpl.id];
        return (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => onChange(tmpl.id)}
            className={cn(
              'relative text-left rounded-lg border-2 p-3 transition-all',
              isActive
                ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600',
            )}
          >
            {isActive && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check size={12} className="text-white" />
              </div>
            )}
            <div className="w-full mb-3 pointer-events-none">
              <Thumb />
            </div>
            <p className="text-sm font-medium dark:text-zinc-200">{tmpl.name}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{tmpl.description}</p>
          </button>
        );
      })}
    </div>
  );
}
