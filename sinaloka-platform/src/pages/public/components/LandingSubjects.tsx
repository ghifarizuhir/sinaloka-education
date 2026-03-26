import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingSubjectsProps {
  subjects: { id: string; name: string }[];
}

export function LandingSubjects({ subjects }: LandingSubjectsProps) {
  const { t } = useTranslation();

  if (subjects.length === 0) return null;

  return (
    <section className="px-6 py-16 border-b border-zinc-800">
      <div className="max-w-2xl mx-auto">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-zinc-100 text-center mb-10"
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
              className="px-4 py-2 rounded-full text-sm text-zinc-300 border border-zinc-700 bg-zinc-900"
            >
              {subject.name}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
