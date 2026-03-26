import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingAboutProps {
  text: string | null;
  brandColor: string | null;
}

export function LandingAbout({ text, brandColor }: LandingAboutProps) {
  const { t } = useTranslation();

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
            className="text-2xl font-bold text-gray-900 mb-3"
          >
            {t('landingPage.about')}
          </motion.h2>
          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.05, duration: 0.5 }}
            className="w-16 h-1 rounded-full mx-auto mb-6"
            style={{ backgroundColor: color }}
          />
          <motion.p
            {...fadeInUp}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-gray-600 leading-relaxed whitespace-pre-line"
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
            <h2 className="text-2xl font-bold text-gray-900">
              {t('landingPage.about')}
            </h2>
            <div
              className="w-16 h-1 rounded-full mt-3"
              style={{ backgroundColor: color }}
            />
          </motion.div>
          <motion.p
            {...fadeInUp}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-gray-600 leading-relaxed whitespace-pre-line"
          >
            {text}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
