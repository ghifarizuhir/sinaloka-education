import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Button } from '@/src/components/UI';
import { SinalokaLogo } from '@/src/components/SinalokaLogo';
import type { LandingPageData } from '@/src/types/landing';
import type { TemplateConfig } from '../templates/template-config';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingFooterCTAProps {
  data: LandingPageData;
  template: TemplateConfig;
}

export function LandingFooterCTA({ data, template }: LandingFooterCTAProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const tc = template.footerCta;

  const brandColor = data.brand_color ?? '#14b8a6';
  const ctaText = data.landing_cta_text ?? t('landingPage.registerNow');

  return (
    <section
      className={tc.section}
      style={{ backgroundColor: brandColor }}
    >
      {/* Geometric decorative circles */}
      <div
        className={`${tc.decorativeCircle} -top-8 -left-8 w-[160px] h-[160px]`}
        style={{ borderColor: 'rgba(255,255,255,0.12)' }}
      />
      <div
        className={`${tc.decorativeCircle} -bottom-12 -right-12 w-[200px] h-[200px]`}
        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
      />
      <div
        className={`${tc.decorativeCircle} top-1/2 -right-6 w-[100px] h-[100px]`}
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      />

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className={tc.title}
        >
          {t('landingPage.ready')}
        </motion.h2>
        <motion.p
          {...fadeInUp}
          transition={{ delay: 0.1, duration: 0.5 }}
          className={tc.subtitle}
          style={{ color: 'rgba(255,255,255,0.7)' }}
        >
          {t('landingPage.readyDesc')}
        </motion.p>

        {data.registration_enabled && (
          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.2, duration: 0.5 }}
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

        {/* Powered by Sinaloka */}
        <motion.div
          {...fadeInUp}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-16 flex items-center justify-center gap-1.5"
        >
          <SinalokaLogo size={14} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {t('landingPage.poweredBy')}
          </span>
        </motion.div>
      </div>
    </section>
  );
}
