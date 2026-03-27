import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Button } from '@/src/components/UI';
import type { LandingPageData } from '@/src/types/landing';
import type { TemplateConfig } from '../templates/template-config';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

interface LandingHeroProps {
  data: LandingPageData;
  template: TemplateConfig;
}

export function LandingHero({ data, template }: LandingHeroProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const tc = template.hero;

  const brandColor = data.brand_color ?? '#14b8a6';
  const tagline = data.landing_tagline ?? data.description;
  const ctaText = data.landing_cta_text ?? t('landingPage.registerNow');

  return (
    <section
      className={tc.section}
      style={{ backgroundColor: brandColor }}
    >
      {/* Gradient overlay for depth */}
      <div
        className={tc.overlay}
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.08), transparent 40%, transparent)',
        }}
      />

      {/* Geometric decorative circles */}
      <div
        className={`${tc.decorativeCircle} -top-10 -right-10 w-[200px] h-[200px]`}
        style={{ borderColor: 'rgba(255,255,255,0.15)' }}
      />
      <div
        className={`${tc.decorativeCircle} top-20 -right-16 w-[120px] h-[120px]`}
        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
      />
      <div
        className={`${tc.decorativeCircle} -bottom-16 -left-8 w-[160px] h-[160px]`}
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
              className={`${tc.logoWrapper} object-cover`}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
              }}
            />
          ) : (
            <div
              className={`${tc.logoWrapper} flex items-center justify-center text-2xl font-bold`}
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
          className={tc.title}
        >
          {data.name}
        </motion.h1>

        {/* Tagline */}
        {tagline && (
          <motion.p
            {...fadeInUp}
            transition={{ delay: 0.2, duration: 0.5 }}
            className={tc.tagline}
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
              className={tc.ctaButton}
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
