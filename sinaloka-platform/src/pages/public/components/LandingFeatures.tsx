import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { icons, type LucideIcon } from 'lucide-react';
import type { LandingFeature } from '@/src/types/landing';
import type { TemplateConfig } from '../templates/template-config';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingFeaturesProps {
  features: LandingFeature[] | null;
  brandColor: string | null;
  template: TemplateConfig;
}

export function LandingFeatures({ features, brandColor, template }: LandingFeaturesProps) {
  const { t } = useTranslation();
  const tc = template.features;

  if (!features || features.length === 0) return null;

  const color = brandColor ?? '#14b8a6';

  return (
    <section className="px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className={tc.sectionTitle}
        >
          {t('landingPage.features')}
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feature, i) => {
            const Icon = (icons as Record<string, LucideIcon>)[feature.icon];
            return (
              <motion.div
                key={feature.id}
                {...fadeInUp}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className={tc.card}
                style={tc.cardStyle(color)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={tc.iconWrapper}
                    style={tc.iconWrapperStyle(color)}
                  >
                    {Icon ? (
                      <Icon size={20} style={{ color }} />
                    ) : (
                      <span className="text-sm font-bold" style={{ color }}>?</span>
                    )}
                  </div>
                  <div>
                    <h3 className={tc.title}>
                      {feature.title}
                    </h3>
                    <p className={tc.description}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
