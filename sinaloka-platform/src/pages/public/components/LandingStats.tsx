import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

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
}

export function LandingStats({ stats, brandColor }: LandingStatsProps) {
  const { t } = useTranslation();

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
        className="flex bg-white border border-gray-100 overflow-hidden"
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
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {item.value}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mt-1">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
