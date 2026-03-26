import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Button } from '@/src/components/UI';
import { SinalokaLogo } from '@/src/components/SinalokaLogo';
import type { LandingPageData } from '@/src/types/landing';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingFooterCTAProps {
  data: LandingPageData;
}

export function LandingFooterCTA({ data }: LandingFooterCTAProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const brandColor = data.brand_color ?? '#14b8a6';
  const ctaText = data.landing_cta_text ?? t('landingPage.registerNow');

  return (
    <section
      className="px-6 py-20"
      style={{
        background: `linear-gradient(to bottom, ${brandColor}11, ${brandColor}22)`,
      }}
    >
      <div className="max-w-2xl mx-auto text-center">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold text-zinc-100 mb-3"
        >
          {t('landingPage.ready')}
        </motion.h2>
        <motion.p
          {...fadeInUp}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-zinc-400 mb-8"
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
              className="font-semibold sm:min-w-[180px] justify-center"
              style={{ backgroundColor: brandColor, color: '#fff' }}
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
          <span className="text-xs text-zinc-600">
            {t('landingPage.poweredBy')}
          </span>
        </motion.div>
      </div>
    </section>
  );
}
