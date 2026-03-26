import { useState } from 'react';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
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
    <section className="px-6 py-16" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-2xl mx-auto">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-gray-900 text-center mb-10"
        >
          {t('landingPage.gallery')}
        </motion.h2>
        <div
          className={cn(
            'grid gap-3',
            sorted.length === 1
              ? 'grid-cols-1'
              : sorted.length === 2
                ? 'grid-cols-2 sm:grid-cols-3'
                : 'grid-cols-2 sm:grid-cols-3'
          )}
        >
          {sorted.map((image, i) => (
            <GalleryItem
              key={image.id}
              image={image}
              index={i}
              isFirst={i === 0 && sorted.length >= 2}
              isSingle={sorted.length === 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function GalleryItem({
  image,
  index,
  isFirst,
  isSingle,
}: {
  image: GalleryImage;
  index: number;
  isFirst: boolean;
  isSingle: boolean;
  key?: React.Key;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      {...fadeInUp}
      transition={{ delay: index * 0.06, duration: 0.5 }}
      className={cn(
        'relative rounded-xl overflow-hidden group cursor-default',
        isFirst && 'col-span-2 row-span-2',
        isSingle && 'col-span-full',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={image.url}
        alt={image.caption ?? ''}
        className={cn(
          'w-full h-full object-cover transition-transform duration-300',
          (isFirst || isSingle) ? 'aspect-[16/10]' : 'aspect-square',
          hovered && 'scale-105'
        )}
      />
      {image.caption && (
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 px-3 py-2 transition-all duration-300',
            hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          )}
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
          }}
        >
          <p className="text-white text-xs truncate">{image.caption}</p>
        </div>
      )}
    </motion.div>
  );
}
