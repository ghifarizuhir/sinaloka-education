import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { settingsService } from '@/src/services/settings.service';
import type { GalleryImage } from '@/src/types/landing';

interface GalleryUploaderProps {
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
}

export function GalleryUploader({ images, onChange }: GalleryUploaderProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const upload = useMutation({
    mutationFn: (file: File) => settingsService.uploadGalleryImage(file),
    onSuccess: (data) => {
      const newImage: GalleryImage = {
        id: data.id,
        url: data.url,
        order: images.length,
      };
      onChange([...images, newImage]);
      qc.invalidateQueries({ queryKey: ['settings', 'landing'] });
    },
    onError: () => toast.error(t('settings.landing.uploadFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => settingsService.deleteGalleryImage(imageId),
    onSuccess: (_, imageId) => {
      const filtered = images
        .filter((img) => img.id !== imageId)
        .map((img, i) => ({ ...img, order: i }));
      onChange(filtered);
      qc.invalidateQueries({ queryKey: ['settings', 'landing'] });
    },
    onError: () => toast.error(t('settings.landing.deleteFailed')),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    upload.mutate(file);
    e.target.value = '';
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {images.map((image) => (
          <div key={image.id} className="relative group aspect-[4/3] rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            <img src={image.url} alt={image.caption ?? ''} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => deleteMutation.mutate(image.id)}
              disabled={deleteMutation.isPending}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {images.length < 6 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
            className="aspect-[4/3] border border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg flex flex-col items-center justify-center gap-1 text-primary hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm"
          >
            {upload.isPending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Plus size={20} />
                {t('settings.landing.galleryAdd')}
              </>
            )}
          </button>
        )}
      </div>
      <p className="text-xs text-zinc-400 text-right mt-1">{images.length}/6</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
