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
      className="relative min-h-[50vh] flex items-center justify-center px-6 py-20 overflow-hidden"
      style={{ backgroundColor: brandColor }}
    >
      {/* Gradient overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.08), transparent 40%, transparent)',
        }}
      />

      {/* Geometric decorative circles */}
      <div
        className="absolute -top-10 -right-10 w-[200px] h-[200px] rounded-full border-[3px] pointer-events-none"
        style={{ borderColor: 'rgba(255,255,255,0.15)' }}
      />
      <div
        className="absolute top-20 -right-16 w-[120px] h-[120px] rounded-full border-[3px] pointer-events-none"
        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
      />
      <div
        className="absolute -bottom-16 -left-8 w-[160px] h-[160px] rounded-full border-[3px] pointer-events-none"
        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
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
              className="w-16 h-16 rounded-xl object-cover shadow-2xl ring-2 ring-white/30 backdrop-blur"
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
              }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center shadow-2xl text-2xl font-bold backdrop-blur ring-2 ring-white/30"
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: '#fff',
              }}
            >
              {data.name.charAt(0).toUpperCase()}
            </div>
          )}
        </motion.div>

        {/* Institution name */}
        <motion.h1
          {...fadeInUp}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4"
        >
          {data.name}
        </motion.h1>

        {/* Tagline */}
        {tagline && (
          <motion.p
            {...fadeInUp}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-lg max-w-xl leading-relaxed mb-8"
            style={{ color: 'rgba(255,255,255,0.8)' }}
          >
            {tagline}
          </motion.p>
        )}

        {/* CTA */}
        {data.registration_enabled && (
          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Button
              size="lg"
              onClick={() => navigate('/register')}
              className="font-bold sm:min-w-[160px] justify-center px-8 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
              style={{ backgroundColor: '#fff', color: brandColor }}
            >
              {ctaText}
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
