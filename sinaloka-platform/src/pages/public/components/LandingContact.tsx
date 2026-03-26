import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';
import type { LandingPageData } from '@/src/types/landing';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingContactProps {
  data: LandingPageData;
}

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.56a8.23 8.23 0 0 0 4.76 1.51V6.63a4.83 4.83 0 0 1-1-.06z" />
    </svg>
  );
}

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function YouTubeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="white" />
    </svg>
  );
}

const SOCIAL_PLATFORMS = [
  { key: 'instagram' as const, Icon: InstagramIcon, urlPrefix: 'https://instagram.com/' },
  { key: 'tiktok' as const, Icon: TikTokIcon, urlPrefix: 'https://tiktok.com/@' },
  { key: 'facebook' as const, Icon: FacebookIcon, urlPrefix: 'https://facebook.com/' },
  { key: 'youtube' as const, Icon: YouTubeIcon, urlPrefix: 'https://youtube.com/@' },
  { key: 'website' as const, Icon: Globe, urlPrefix: '' },
] as const;

export function LandingContact({ data }: LandingContactProps) {
  const { t } = useTranslation();

  const brandColor = data.brand_color ?? '#14b8a6';
  const hasContact = data.email || data.phone || data.address;
  const hasSocial = data.social_links &&
    Object.values(data.social_links).some(Boolean);

  if (!hasContact && !hasSocial) return null;

  const contactItems = [
    { icon: Mail, value: data.email, href: data.email ? `mailto:${data.email}` : undefined },
    { icon: Phone, value: data.phone, href: data.phone ? `tel:${data.phone}` : undefined },
    { icon: MapPin, value: data.address, href: undefined },
  ].filter((item) => item.value);

  return (
    <section className="px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-gray-900 text-center mb-10"
        >
          {t('landingPage.contact')}
        </motion.h2>

        {contactItems.length > 0 && (
          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
          >
            {contactItems.map((item) => {
              const Icon = item.icon;
              const content = (
                <div
                  className="flex items-center gap-3 rounded-xl p-4 transition-colors"
                  style={{ backgroundColor: `${brandColor}0d` }}
                  onMouseOver={(e) => {
                    if (item.href) (e.currentTarget as HTMLElement).style.backgroundColor = `${brandColor}1a`;
                  }}
                  onMouseOut={(e) => {
                    if (item.href) (e.currentTarget as HTMLElement).style.backgroundColor = `${brandColor}0d`;
                  }}
                >
                  <Icon size={18} className="shrink-0" style={{ color: brandColor }} />
                  <span className="text-sm text-gray-700 break-all">{item.value}</span>
                </div>
              );
              return item.href ? (
                <a key={item.value} href={item.href} className="block">
                  {content}
                </a>
              ) : (
                <div key={item.value}>{content}</div>
              );
            })}
          </motion.div>
        )}

        {hasSocial && data.social_links && (
          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex justify-center gap-3"
          >
            {SOCIAL_PLATFORMS.map(({ key, Icon, urlPrefix }) => {
              const handle = data.social_links?.[key];
              if (!handle) return null;
              const url = key === 'website'
                ? (handle.startsWith('http') ? handle : `https://${handle}`)
                : (handle.startsWith('http') ? handle : `${urlPrefix}${handle}`);
              return (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
                  onMouseOver={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.backgroundColor = brandColor;
                    el.style.color = '#fff';
                  }}
                  onMouseOut={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.backgroundColor = '';
                    el.style.color = '';
                  }}
                >
                  <Icon size={18} />
                </a>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
}
