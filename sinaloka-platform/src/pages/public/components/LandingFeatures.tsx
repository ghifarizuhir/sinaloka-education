import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { icons, type LucideIcon } from 'lucide-react';
import type { LandingFeature } from '@/src/types/landing';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingFeaturesProps {
  features: LandingFeature[] | null;
  brandColor: string | null;
}

export function LandingFeatures({ features, brandColor }: LandingFeaturesProps) {
  const { t } = useTranslation();

  if (!features || features.length === 0) return null;

  const color = brandColor ?? '#14b8a6';

  return (
    <section className="px-6 py-16 border-b border-zinc-800">
      <div className="max-w-2xl mx-auto">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-zinc-100 text-center mb-10"
        >
          {t('landingPage.features')}
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feature) => {
            const Icon = (icons as Record<string, LucideIcon>)[feature.icon];
            return (
              <motion.div
                key={feature.id}
                {...fadeInUp}
                transition={{ duration: 0.5 }}
                className="rounded-xl bg-zinc-900 border border-zinc-800 p-6"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}22` }}
                  >
                    {Icon ? (
                      <Icon size={20} style={{ color }} />
                    ) : (
                      <span
                        className="text-sm font-bold"
                        style={{ color }}
                      >
                        ?
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-100 mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">
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
