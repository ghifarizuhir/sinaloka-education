import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Button } from '@/src/components/UI';
import type { LandingPageData } from '@/src/types/landing';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

interface LandingHeroProps {
  data: LandingPageData;
}

export function LandingHero({ data }: LandingHeroProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const brandColor = data.brand_color ?? '#14b8a6';
  const tagline = data.landing_tagline ?? data.description;
  const ctaText = data.landing_cta_text ?? t('landingPage.registerNow');

  return (
    <section
      className="relative min-h-[70vh] flex flex-col items-center justify-center px-6 py-20 overflow-hidden border-b border-zinc-800"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, ${brandColor}22 0%, transparent 70%), linear-gradient(to bottom, ${brandColor}0a, transparent)`,
      }}
    >
      {/* Logo */}
      <motion.div
        {...fadeInUp}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        {data.logo_url ? (
          <img
            src={data.logo_url}
            alt={data.name}
            className="w-24 h-24 rounded-2xl object-cover shadow-2xl ring-2 ring-white/10"
          />
        ) : (
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center shadow-2xl text-4xl font-bold ring-2 ring-white/10"
            style={{ backgroundColor: `${brandColor}33`, color: brandColor }}
          >
            {data.name.charAt(0).toUpperCase()}
          </div>
        )}
      </motion.div>

      {/* Institution name */}
      <motion.h1
        {...fadeInUp}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="text-4xl sm:text-5xl font-extrabold text-zinc-100 text-center tracking-tight mb-4"
      >
        {data.name}
      </motion.h1>

      {/* Tagline */}
      {tagline && (
        <motion.p
          {...fadeInUp}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-lg text-zinc-400 text-center max-w-xl leading-relaxed mb-8"
        >
          {tagline}
        </motion.p>
      )}

      {/* CTA buttons */}
      <motion.div
        {...fadeInUp}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        {data.registration_enabled && (
          <Button
            size="lg"
            onClick={() => navigate('/register')}
            className="font-semibold sm:min-w-[160px] justify-center"
            style={{ backgroundColor: brandColor, color: '#fff' }}
          >
            {ctaText}
          </Button>
        )}
      </motion.div>
    </section>
  );
}
