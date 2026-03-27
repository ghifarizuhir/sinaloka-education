import type React from 'react';

export type TemplateId = 'bold-geometric' | 'soft-friendly' | 'clean-minimal';

export interface TemplateConfig {
  id: TemplateId;
  name: string;
  description: string;
  hero: {
    section: string;
    overlay: string;
    decorativeCircle: string;
    logoWrapper: string;
    title: string;
    tagline: string;
    ctaButton: string;
  };
  stats: {
    card: string;
    value: string;
    label: string;
  };
  features: {
    sectionTitle: string;
    card: string;
    cardStyle: (color: string) => React.CSSProperties;
    iconWrapper: string;
    iconWrapperStyle: (color: string) => React.CSSProperties;
    title: string;
    description: string;
  };
  subjects: {
    sectionBg: string;
    sectionTitle: string;
    pill: string;
    pillStyle: (color: string) => React.CSSProperties;
    pillHoverBg: (color: string) => string;
  };
  about: {
    sectionTitle: string;
    divider: string;
    text: string;
  };
  gallery: {
    sectionBg: string;
    sectionTitle: string;
    imageWrapper: string;
  };
  contact: {
    sectionTitle: string;
    contactCard: string;
    contactCardStyle: (color: string) => React.CSSProperties;
    contactCardHoverBg: (color: string) => string;
    socialButton: string;
  };
  footerCta: {
    section: string;
    decorativeCircle: string;
    title: string;
    subtitle: string;
    ctaButton: string;
  };
}

const boldGeometric: TemplateConfig = {
  id: 'bold-geometric',
  name: 'Bold Geometric',
  description: 'Tegas, modern, percaya diri',
  hero: {
    section: 'relative min-h-[50vh] flex items-center justify-center px-6 py-20 overflow-hidden',
    overlay: 'absolute inset-0 pointer-events-none',
    decorativeCircle: 'absolute rounded-full border-[3px] pointer-events-none',
    logoWrapper: 'w-16 h-16 rounded-xl shadow-2xl ring-2 ring-white/30 backdrop-blur',
    title: 'text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4',
    tagline: 'text-lg max-w-xl leading-relaxed mb-8',
    ctaButton: 'font-bold sm:min-w-[160px] justify-center px-8 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-shadow',
  },
  stats: {
    card: 'flex bg-white border border-gray-100 overflow-hidden rounded-xl',
    value: 'text-2xl sm:text-3xl font-bold text-gray-900',
    label: 'text-xs text-gray-500 uppercase tracking-wide font-semibold mt-1',
  },
  features: {
    sectionTitle: 'text-2xl font-bold text-gray-900 text-center mb-10',
    card: 'rounded-xl p-6',
    cardStyle: (color: string) => ({
      backgroundColor: `${color}0d`,
      borderLeft: `4px solid ${color}`,
    }),
    iconWrapper: 'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
    iconWrapperStyle: (color: string) => ({ backgroundColor: `${color}26` }),
    title: 'font-semibold text-gray-900 mb-1',
    description: 'text-sm text-gray-600 leading-relaxed',
  },
  subjects: {
    sectionBg: '#F9FAFB',
    sectionTitle: 'text-2xl font-bold text-gray-900 text-center mb-10',
    pill: 'px-4 py-2 rounded-full text-sm text-gray-700 font-medium bg-white transition-colors cursor-default',
    pillStyle: (color: string) => ({ border: `2px solid ${color}33` }),
    pillHoverBg: (color: string) => `${color}1a`,
  },
  about: {
    sectionTitle: 'text-2xl font-bold text-gray-900',
    divider: 'w-16 h-1 rounded-full',
    text: 'text-gray-600 leading-relaxed whitespace-pre-line',
  },
  gallery: {
    sectionBg: '#F9FAFB',
    sectionTitle: 'text-2xl font-bold text-gray-900 text-center mb-10',
    imageWrapper: 'relative rounded-xl overflow-hidden group cursor-default',
  },
  contact: {
    sectionTitle: 'text-2xl font-bold text-gray-900 text-center mb-10',
    contactCard: 'flex items-center gap-3 rounded-xl p-4 transition-colors',
    contactCardStyle: (color: string) => ({ backgroundColor: `${color}0d` }),
    contactCardHoverBg: (color: string) => `${color}1a`,
    socialButton: 'w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 transition-colors',
  },
  footerCta: {
    section: 'relative px-6 py-20 overflow-hidden',
    decorativeCircle: 'absolute rounded-full border-[3px] pointer-events-none',
    title: 'text-3xl font-bold text-white mb-3',
    subtitle: 'mb-8',
    ctaButton: 'font-bold sm:min-w-[180px] justify-center px-8 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-shadow',
  },
};

const softFriendly: TemplateConfig = {
  id: 'soft-friendly',
  name: 'Soft & Friendly',
  description: 'Hangat, approachable, ramah',
  hero: {
    section: 'relative min-h-[50vh] flex items-center justify-center px-6 py-20 overflow-hidden',
    overlay: 'absolute inset-0 pointer-events-none',
    decorativeCircle: 'absolute rounded-full border-[3px] pointer-events-none opacity-60',
    logoWrapper: 'w-16 h-16 rounded-full shadow-xl ring-2 ring-white/20',
    title: 'text-3xl sm:text-4xl font-semibold text-white tracking-tight mb-4',
    tagline: 'text-lg max-w-xl leading-relaxed mb-8',
    ctaButton: 'font-semibold sm:min-w-[160px] justify-center px-8 py-3.5 rounded-full shadow-md hover:shadow-lg transition-shadow',
  },
  stats: {
    card: 'flex bg-white overflow-hidden rounded-2xl shadow-md',
    value: 'text-2xl sm:text-3xl font-semibold text-gray-900',
    label: 'text-xs text-gray-500 uppercase tracking-wide font-medium mt-1',
  },
  features: {
    sectionTitle: 'text-2xl font-semibold text-gray-900 text-center mb-10',
    card: 'rounded-2xl p-6 shadow-md bg-white',
    cardStyle: () => ({}),
    iconWrapper: 'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
    iconWrapperStyle: (color: string) => ({ backgroundColor: `${color}1a` }),
    title: 'font-semibold text-gray-900 mb-1',
    description: 'text-sm text-gray-600 leading-relaxed',
  },
  subjects: {
    sectionBg: '#FFFBF5',
    sectionTitle: 'text-2xl font-semibold text-gray-900 text-center mb-10',
    pill: 'px-4 py-2 rounded-full text-sm text-gray-700 font-medium bg-white transition-colors cursor-default shadow-sm',
    pillStyle: () => ({}),
    pillHoverBg: (color: string) => `${color}1a`,
  },
  about: {
    sectionTitle: 'text-2xl font-semibold text-gray-900',
    divider: 'w-16 h-1 rounded-full',
    text: 'text-gray-600 leading-relaxed whitespace-pre-line',
  },
  gallery: {
    sectionBg: '#FFFBF5',
    sectionTitle: 'text-2xl font-semibold text-gray-900 text-center mb-10',
    imageWrapper: 'relative rounded-2xl overflow-hidden group cursor-default shadow-sm',
  },
  contact: {
    sectionTitle: 'text-2xl font-semibold text-gray-900 text-center mb-10',
    contactCard: 'flex items-center gap-3 rounded-2xl p-4 transition-colors shadow-sm bg-white',
    contactCardStyle: () => ({}),
    contactCardHoverBg: (color: string) => `${color}1a`,
    socialButton: 'w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 transition-colors shadow-sm',
  },
  footerCta: {
    section: 'relative px-6 py-20 overflow-hidden',
    decorativeCircle: 'absolute rounded-full border-[3px] pointer-events-none opacity-60',
    title: 'text-3xl font-semibold text-white mb-3',
    subtitle: 'mb-8',
    ctaButton: 'font-semibold sm:min-w-[180px] justify-center px-8 py-3.5 rounded-full shadow-md hover:shadow-lg transition-shadow',
  },
};

const cleanMinimal: TemplateConfig = {
  id: 'clean-minimal',
  name: 'Clean & Minimal',
  description: 'Elegan, profesional, tenang',
  hero: {
    section: 'relative min-h-[45vh] flex items-center justify-center px-6 py-16 overflow-hidden border-b border-white/10',
    overlay: 'absolute inset-0 pointer-events-none',
    decorativeCircle: 'hidden',
    logoWrapper: 'w-14 h-14 rounded shadow-lg ring-1 ring-white/10',
    title: 'text-3xl sm:text-4xl font-medium text-white tracking-tight mb-4',
    tagline: 'text-lg max-w-xl leading-relaxed mb-8',
    ctaButton: 'font-medium sm:min-w-[160px] justify-center px-8 py-3 rounded shadow-sm hover:shadow transition-shadow uppercase tracking-wide text-sm',
  },
  stats: {
    card: 'flex bg-white border border-gray-200 overflow-hidden rounded',
    value: 'text-2xl sm:text-3xl font-medium text-gray-900',
    label: 'text-xs text-gray-400 uppercase tracking-wider font-normal mt-1',
  },
  features: {
    sectionTitle: 'text-2xl font-medium text-gray-900 text-center mb-10',
    card: 'rounded p-6 bg-gray-50',
    cardStyle: () => ({}),
    iconWrapper: 'w-10 h-10 rounded flex items-center justify-center shrink-0 bg-gray-100',
    iconWrapperStyle: () => ({}),
    title: 'font-medium text-gray-900 mb-1',
    description: 'text-sm text-gray-500 leading-relaxed',
  },
  subjects: {
    sectionBg: '#FFFFFF',
    sectionTitle: 'text-2xl font-medium text-gray-900 text-center mb-10',
    pill: 'px-4 py-2 rounded text-sm text-gray-600 font-normal bg-gray-100 transition-colors cursor-default',
    pillStyle: () => ({}),
    pillHoverBg: () => '#e5e7eb',
  },
  about: {
    sectionTitle: 'text-2xl font-medium text-gray-900',
    divider: 'w-12 h-0.5 rounded-full',
    text: 'text-gray-500 leading-relaxed whitespace-pre-line',
  },
  gallery: {
    sectionBg: '#FFFFFF',
    sectionTitle: 'text-2xl font-medium text-gray-900 text-center mb-10',
    imageWrapper: 'relative rounded overflow-hidden group cursor-default',
  },
  contact: {
    sectionTitle: 'text-2xl font-medium text-gray-900 text-center mb-10',
    contactCard: 'flex items-center gap-3 rounded p-4 transition-colors bg-gray-50',
    contactCardStyle: () => ({}),
    contactCardHoverBg: () => '#e5e7eb',
    socialButton: 'w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 transition-colors',
  },
  footerCta: {
    section: 'relative px-6 py-16 overflow-hidden',
    decorativeCircle: 'hidden',
    title: 'text-2xl font-medium text-white mb-3',
    subtitle: 'mb-8',
    ctaButton: 'font-medium sm:min-w-[180px] justify-center px-8 py-3 rounded shadow-sm hover:shadow transition-shadow uppercase tracking-wide text-sm',
  },
};

const templates: Record<TemplateId, TemplateConfig> = {
  'bold-geometric': boldGeometric,
  'soft-friendly': softFriendly,
  'clean-minimal': cleanMinimal,
};

export const TEMPLATE_LIST = [boldGeometric, softFriendly, cleanMinimal] as const;

export function getTemplateConfig(id?: string | null): TemplateConfig {
  if (id && id in templates) {
    return templates[id as TemplateId];
  }
  return boldGeometric;
}
