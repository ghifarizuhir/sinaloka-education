import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import type { TemplateConfig } from '../templates/template-config';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingSubjectsProps {
  subjects: { id: string; name: string }[];
  brandColor: string | null;
  template: TemplateConfig;
}

export function LandingSubjects({ subjects, brandColor, template }: LandingSubjectsProps) {
  const { t } = useTranslation();
  const tc = template.subjects;

  if (subjects.length === 0) return null;

  const color = brandColor ?? '#14b8a6';

  return (
    <section className="px-6 py-16" style={{ backgroundColor: tc.sectionBg }}>
      <div className="max-w-2xl mx-auto">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className={tc.sectionTitle}
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
              className={tc.pill}
              style={tc.pillStyle(color)}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = tc.pillHoverBg(color);
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '';
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
