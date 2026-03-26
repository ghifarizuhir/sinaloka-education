import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import type { GalleryImage } from '@/src/types/landing';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

interface LandingGalleryProps {
  images: GalleryImage[] | null;
}

export function LandingGallery({ images }: LandingGalleryProps) {
  const { t } = useTranslation();

  if (!images || images.length === 0) return null;

  const sorted = [...images].sort((a, b) => a.order - b.order);

  return (
    <section className="px-6 py-16 border-b border-zinc-800">
      <div className="max-w-2xl mx-auto">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-zinc-100 text-center mb-10"
        >
          {t('landingPage.gallery')}
        </motion.h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sorted.map((image) => (
            <motion.div
              key={image.id}
              {...fadeInUp}
              transition={{ duration: 0.5 }}
              className="rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800"
            >
              <img
                src={image.url}
                alt={image.caption ?? ''}
                className="w-full aspect-square object-cover"
              />
              {image.caption && (
                <p className="px-3 py-2 text-xs text-zinc-400 truncate">
                  {image.caption}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
