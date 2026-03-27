import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import type { TemplateConfig } from '../templates/template-config';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingAboutProps {
  text: string | null;
  brandColor: string | null;
  template: TemplateConfig;
}

export function LandingAbout({ text, brandColor, template }: LandingAboutProps) {
  const { t } = useTranslation();
  const tc = template.about;

  if (!text) return null;

  const color = brandColor ?? '#14b8a6';
  const isShort = text.length < 100;

  if (isShort) {
    return (
      <section className="px-6 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <motion.h2
            {...fadeInUp}
            transition={{ duration: 0.5 }}
            className={`${tc.sectionTitle} mb-3`}
          >
            {t('landingPage.about')}
          </motion.h2>
          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.05, duration: 0.5 }}
            className={`${tc.divider} mx-auto mb-6`}
            style={{ backgroundColor: color }}
          />
          <motion.p
            {...fadeInUp}
            transition={{ delay: 0.1, duration: 0.5 }}
            className={tc.text}
          >
            {text}
          </motion.p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:gap-10">
          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.5 }}
            className="sm:w-1/3 shrink-0 mb-6 sm:mb-0"
          >
            <h2 className={tc.sectionTitle}>
              {t('landingPage.about')}
            </h2>
            <div
              className={`${tc.divider} mt-3`}
              style={{ backgroundColor: color }}
            />
          </motion.div>
          <motion.p
            {...fadeInUp}
            transition={{ delay: 0.1, duration: 0.5 }}
            className={tc.text}
          >
            {text}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
