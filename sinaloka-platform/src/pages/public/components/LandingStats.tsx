import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import type { TemplateConfig } from '../templates/template-config';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingStatsProps {
  stats: {
    active_students: number;
    active_tutors: number;
    total_subjects: number;
  };
  brandColor: string | null;
  template: TemplateConfig;
}

export function LandingStats({ stats, template }: LandingStatsProps) {
  const { t } = useTranslation();
  const tc = template.stats;

  const items = [
    { value: stats.active_students, label: t('landingPage.students') },
    { value: stats.active_tutors, label: t('landingPage.tutors') },
    { value: stats.total_subjects, label: t('landingPage.subjectsCount') },
  ];

  return (
    <motion.section
      {...fadeInUp}
      transition={{ duration: 0.5 }}
      className="-mt-8 relative z-10 mx-6 sm:mx-auto max-w-md"
    >
      <div
        className={tc.card}
        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.06)', borderRadius: '0.75rem' }}
      >
        {items.map((item, i) => (
          <div
            key={item.label}
            className={cn(
              'flex-1 text-center py-5 px-3',
              i < items.length - 1 && 'border-r border-gray-100'
            )}
          >
            <div className={tc.value}>
              {item.value}
            </div>
            <div className={tc.label}>
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
