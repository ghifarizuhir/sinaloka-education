import { useEffect, useRef, useState, type ElementType } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Layout, FileText, Star, Image, Phone } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { LandingFeature, SocialLinks } from '@/src/types/landing';

export interface SectionItem {
  id: string;
  icon: ElementType;
  labelKey: string;
  isFilled: boolean;
}

interface SectionNavProps {
  tagline: string;
  about: string;
  features: LandingFeature[];
  gallery: { length: number };
  whatsapp: string;
  social: SocialLinks;
}

function buildSections(props: SectionNavProps): SectionItem[] {
  const { tagline, about, features, gallery, whatsapp, social } = props;
  return [
    { id: 'landing-status', icon: Globe, labelKey: 'settings.landing.title', isFilled: true },
    { id: 'landing-hero', icon: Layout, labelKey: 'settings.landing.tagline', isFilled: !!(tagline) },
    { id: 'landing-about', icon: FileText, labelKey: 'settings.landing.about', isFilled: !!(about) },
    { id: 'landing-features', icon: Star, labelKey: 'settings.landing.features', isFilled: features.length > 0 },
    { id: 'landing-gallery', icon: Image, labelKey: 'settings.landing.gallery', isFilled: gallery.length > 0 },
    { id: 'landing-contact', icon: Phone, labelKey: 'settings.landing.socialLinks', isFilled: !!(whatsapp) || Object.values(social).some(Boolean) },
  ];
}

export function SectionNav(props: SectionNavProps) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState('landing-status');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sections = buildSections(props);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 },
    );

    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];
    elements.forEach((el) => observerRef.current!.observe(el));

    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 100;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:block w-48 shrink-0">
        <div className="sticky top-28 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2 px-2 font-medium">
            Sections
          </p>
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeId === section.id;
            return (
              <button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left',
                  isActive
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
                )}
              >
                <Icon size={14} />
                <span className="truncate flex-1">{t(section.labelKey)}</span>
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    section.isFilled ? 'bg-emerald-500' : 'bg-amber-400',
                  )}
                />
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile horizontal pills */}
      <nav className="md:hidden sticky top-16 z-10 bg-white dark:bg-zinc-950 -mx-1 px-1 pb-2 pt-1 overflow-x-auto">
        <div className="flex gap-1.5">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeId === section.id;
            return (
              <button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                  isActive
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400',
                )}
              >
                <Icon size={12} />
                {t(section.labelKey)}
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    section.isFilled ? 'bg-emerald-500' : 'bg-amber-400',
                  )}
                />
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
