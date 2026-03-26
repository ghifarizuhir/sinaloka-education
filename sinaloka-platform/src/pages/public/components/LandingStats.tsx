import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';

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
  const color = brandColor ?? '#14b8a6';

  const items = [
    { value: stats.active_students, label: t('landingPage.students') },
    { value: stats.active_tutors, label: t('landingPage.tutors') },
    { value: stats.total_subjects, label: t('landingPage.subjectsCount') },
  ];

  return (
    <section className="px-6 py-16 border-b border-zinc-800">
      <div className="max-w-2xl mx-auto grid grid-cols-3 gap-4">
        {items.map((item) => (
          <motion.div
            key={item.label}
            {...fadeInUp}
            transition={{ duration: 0.5 }}
            className="text-center rounded-xl bg-zinc-900 border border-zinc-800 p-6"
          >
            <div
              className="text-3xl sm:text-4xl font-bold mb-1"
              style={{ color }}
            >
              {item.value}
            </div>
            <div className="text-sm text-zinc-400">{item.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
