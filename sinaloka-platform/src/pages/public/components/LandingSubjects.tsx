import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingSubjectsProps {
  subjects: { id: string; name: string }[];
  brandColor: string | null;
}

export function LandingSubjects({ subjects, brandColor }: LandingSubjectsProps) {
  const { t } = useTranslation();

  if (subjects.length === 0) return null;

  const color = brandColor ?? '#14b8a6';

  return (
    <section className="px-6 py-16" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-2xl mx-auto">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-gray-900 text-center mb-10"
        >
          {t('landingPage.subjects')}
        </motion.h2>
        <motion.div
          {...fadeInUp}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {subjects.map((subject) => (
            <span
              key={subject.id}
              className="px-4 py-2 rounded-full text-sm text-gray-700 font-medium bg-white transition-colors cursor-default"
              style={{
                border: `2px solid ${color}33`,
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = `${color}1a`;
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#fff';
              }}
            >
              {subject.name}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
