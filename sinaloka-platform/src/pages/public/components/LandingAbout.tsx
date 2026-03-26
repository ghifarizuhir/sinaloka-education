import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingAboutProps {
  text: string | null;
}

export function LandingAbout({ text }: LandingAboutProps) {
  const { t } = useTranslation();

  if (!text) return null;

  return (
    <section className="px-6 py-16 border-b border-zinc-800">
      <div className="max-w-2xl mx-auto text-center">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-zinc-100 mb-6"
        >
          {t('landingPage.about')}
        </motion.h2>
        <motion.p
          {...fadeInUp}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-zinc-400 leading-relaxed whitespace-pre-line"
        >
          {text}
        </motion.p>
      </div>
    </section>
  );
}
