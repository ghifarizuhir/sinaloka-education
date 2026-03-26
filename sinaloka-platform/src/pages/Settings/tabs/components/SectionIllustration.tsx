import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'lucide-react';

function HeroWireframe() {
  return (
    <div className="space-y-1">
      <div className="w-full h-16 rounded-md bg-teal-500/80 flex flex-col items-center justify-center gap-1">
        <div className="w-6 h-6 rounded-full bg-white/60" />
        <div className="w-16 h-1.5 rounded bg-white/60" />
        <div className="w-10 h-2 rounded bg-white/40 border border-white/50" />
      </div>
      <div className="w-full h-2 rounded bg-zinc-300 dark:bg-zinc-600 opacity-30" />
      <div className="w-4/5 h-2 rounded bg-zinc-300 dark:bg-zinc-600 opacity-30" />
      <div className="w-3/5 h-2 rounded bg-zinc-300 dark:bg-zinc-600 opacity-30" />
    </div>
  );
}

function AboutWireframe() {
  return (
    <div className="space-y-1">
      <div className="w-full h-2 rounded bg-zinc-300 dark:bg-zinc-600 opacity-30" />
      <div className="w-4/5 h-2 rounded bg-zinc-300 dark:bg-zinc-600 opacity-30" />
      <div className="border-2 border-teal-500/40 bg-teal-50 dark:bg-teal-900/20 p-2 rounded space-y-1">
        <div className="w-16 h-2 rounded bg-teal-400/60 mx-auto" />
        <div className="w-full h-1.5 rounded bg-teal-300/40" />
        <div className="w-full h-1.5 rounded bg-teal-300/40" />
        <div className="w-3/4 h-1.5 rounded bg-teal-300/40" />
      </div>
      <div className="w-full h-2 rounded bg-zinc-300 dark:bg-zinc-600 opacity-30" />
    </div>
  );
}

function FeaturesWireframe() {
  return (
    <div className="space-y-1">
      <div className="w-full h-2 rounded bg-zinc-300 dark:bg-zinc-600 opacity-30" />
      <div className="w-4/5 h-2 rounded bg-zinc-300 dark:bg-zinc-600 opacity-30" />
      <div className="grid grid-cols-2 gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-2 border-teal-500/40 rounded p-1 space-y-1"
          >
            <div className="w-4 h-4 rounded bg-teal-400/40" />
            <div className="w-full h-1.5 rounded bg-teal-300/40" />
            <div className="w-3/4 h-1.5 rounded bg-teal-300/30" />
          </div>
        ))}
      </div>
      <div className="w-full h-2 rounded bg-zinc-300 dark:bg-zinc-600 opacity-30" />
    </div>
  );
}

function GalleryWireframe() {
  return (
    <div className="space-y-1">
      <div className="w-full h-2 rounded bg-zinc-300 dark:bg-zinc-600 opacity-30" />
      <div className="w-4/5 h-2 rounded bg-zinc-300 dark:bg-zinc-600 opacity-30" />
      <div className="w-3/5 h-2 rounded bg-zinc-300 dark:bg-zinc-600 opacity-30" />
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square border-2 border-teal-500/40 rounded flex items-center justify-center"
          >
            <div className="w-3 h-3 rounded bg-teal-400/40" />
          </div>
        ))}
      </div>
      <div className="w-full h-2 rounded bg-zinc-300 dark:bg-zinc-600 opacity-30" />
    </div>
  );
}

function ContactWireframe() {
  return (
    <div className="space-y-1">
      <div className="w-full h-2 rounded bg-zinc-300 dark:bg-zinc-600 opacity-30" />
      <div className="w-4/5 h-2 rounded bg-zinc-300 dark:bg-zinc-600 opacity-30" />
      <div className="w-3/5 h-2 rounded bg-zinc-300 dark:bg-zinc-600 opacity-30" />
      <div className="w-4/5 h-2 rounded bg-zinc-300 dark:bg-zinc-600 opacity-30" />
      <div className="border-2 border-teal-500/40 bg-teal-50 dark:bg-teal-900/20 p-2 rounded space-y-1">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-teal-400/60 shrink-0" />
          <div className="w-16 h-1.5 rounded bg-teal-300/40" />
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-4 h-4 rounded-full bg-teal-400/40" />
          ))}
        </div>
      </div>
    </div>
  );
}

const wireframes: Record<string, FC> = {
  hero: HeroWireframe,
  about: AboutWireframe,
  features: FeaturesWireframe,
  gallery: GalleryWireframe,
  contact: ContactWireframe,
};

interface SectionIllustrationProps {
  sectionKey: 'hero' | 'about' | 'features' | 'gallery' | 'contact';
}

export function SectionIllustration({ sectionKey }: SectionIllustrationProps) {
  const { t } = useTranslation();
  const Wireframe = wireframes[sectionKey];

  return (
    <div className="mb-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 p-3">
      <div className="w-40 mx-auto mb-2">
        <Wireframe />
      </div>
      <div className="flex items-center gap-1">
        <Lightbulb size={12} className="text-amber-500 shrink-0" />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {t(`settings.landing.hints.${sectionKey}`)}
        </span>
      </div>
    </div>
  );
}
