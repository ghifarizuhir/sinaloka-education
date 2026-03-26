import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Card, Skeleton, Button } from '@/src/components/UI';
import { ConfirmChangesModal } from '@/src/components/ui/confirm-changes-modal';
import { collectChanges, detectScalarChange } from '@/src/lib/change-detection';
import { useAuth } from '@/src/hooks/useAuth';
import { useLandingSettings, useUpdateLandingSettings } from '@/src/hooks/useSettings';
import { FeatureRepeater } from './components/FeatureRepeater';
import { GalleryUploader } from './components/GalleryUploader';
import type { LandingFeature, GalleryImage, SocialLinks } from '@/src/types/landing';

export const LandingTab = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: settings, isLoading } = useLandingSettings();
  const updateSettings = useUpdateLandingSettings();

  const slug = user?.institution?.slug ?? '';
  const landingUrl = `https://${slug}.sinaloka.com`;

  // Form state
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [features, setFeatures] = useState<LandingFeature[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [social, setSocial] = useState<SocialLinks>({});

  // Confirm modal
  const [showConfirm, setShowConfirm] = useState(false);
  const initialRef = useRef<typeof settings>(null);

  // Sync from server data
  useEffect(() => {
    if (!settings) return;
    setTagline(settings.landing_tagline ?? '');
    setAbout(settings.landing_about ?? '');
    setCtaText(settings.landing_cta_text ?? '');
    setWhatsapp(settings.whatsapp_number ?? '');
    setFeatures((settings.landing_features as LandingFeature[]) ?? []);
    setGallery((settings.gallery_images as GalleryImage[]) ?? []);
    setSocial((settings.social_links as SocialLinks) ?? {});
    if (!initialRef.current) initialRef.current = settings;
  }, [settings]);

  const handleToggle = (enabled: boolean) => {
    updateSettings.mutate({ landing_enabled: enabled });
  };

  const handleSave = () => {
    const changes = collectChanges(
      detectScalarChange(t('settings.landing.tagline'), initialRef.current?.landing_tagline ?? '', tagline),
      detectScalarChange(t('settings.landing.about'), initialRef.current?.landing_about ?? '', about),
      detectScalarChange(t('settings.landing.ctaText'), initialRef.current?.landing_cta_text ?? '', ctaText),
      detectScalarChange(t('settings.landing.whatsapp'), initialRef.current?.whatsapp_number ?? '', whatsapp),
    );
    if (changes.length === 0 &&
        JSON.stringify(features) === JSON.stringify(initialRef.current?.landing_features ?? []) &&
        JSON.stringify(social) === JSON.stringify(initialRef.current?.social_links ?? {})) {
      toast.info('No changes');
      return;
    }
    setShowConfirm(true);
  };

  const confirmSave = () => {
    updateSettings.mutate(
      {
        landing_tagline: tagline || null,
        landing_about: about || null,
        landing_cta_text: ctaText || null,
        whatsapp_number: whatsapp || null,
        landing_features: features.length > 0 ? features : null,
        gallery_images: gallery.length > 0 ? gallery : null,
        social_links: Object.values(social).some(Boolean) ? social : null,
      },
      {
        onSuccess: () => {
          toast.success(t('settings.landing.saveSuccess'));
          initialRef.current = null; // will be re-set on next data sync
          setShowConfirm(false);
        },
        onError: () => toast.error(t('settings.landing.saveFailed')),
      },
    );
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(landingUrl);
    toast.success(t('settings.landing.copy'));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Globe size={20} className="text-zinc-400" />
          <h3 className="text-lg font-bold dark:text-zinc-100">{t('settings.landing.title')}</h3>
        </div>
        <p className="text-sm text-zinc-500 mb-4">{t('settings.landing.description')}</p>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium dark:text-zinc-200">{t('settings.landing.enabled')}</p>
            <p className="text-xs text-zinc-400">{t('settings.landing.enabledHint')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings?.landing_enabled ?? false}
            onClick={() => handleToggle(!settings?.landing_enabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              settings?.landing_enabled ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                settings?.landing_enabled ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-md text-sm">
          <span className="text-zinc-500 truncate flex-1">{landingUrl}</span>
          <button type="button" onClick={handleCopyUrl} className="text-primary hover:underline text-xs">
            <Copy size={14} />
          </button>
          <a
            href={landingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-primary text-xs ${!settings?.landing_enabled ? 'pointer-events-none opacity-40' : ''}`}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </Card>

      {/* Hero Content */}
      <Card>
        <h3 className="text-sm font-semibold dark:text-zinc-200 mb-3">Hero</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">{t('settings.landing.tagline')}</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder={t('settings.landing.taglinePlaceholder')}
              maxLength={200}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
            />
            <p className="text-xs text-zinc-400 text-right">{tagline.length}/200</p>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">{t('settings.landing.ctaText')}</label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder={t('settings.landing.ctaDefault')}
              maxLength={50}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
            />
          </div>
        </div>
      </Card>

      {/* About */}
      <Card>
        <h3 className="text-sm font-semibold dark:text-zinc-200 mb-3">{t('settings.landing.about')}</h3>
        <textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder={t('settings.landing.aboutPlaceholder')}
          maxLength={2000}
          rows={4}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md resize-none"
        />
        <p className="text-xs text-zinc-400 text-right">{about.length}/2000</p>
      </Card>

      {/* Features */}
      <Card>
        <h3 className="text-sm font-semibold dark:text-zinc-200 mb-3">{t('settings.landing.features')}</h3>
        <FeatureRepeater features={features} onChange={setFeatures} />
      </Card>

      {/* Gallery */}
      <Card>
        <h3 className="text-sm font-semibold dark:text-zinc-200 mb-3">{t('settings.landing.gallery')}</h3>
        <GalleryUploader images={gallery} onChange={setGallery} />
      </Card>

      {/* Contact & Social */}
      <Card>
        <h3 className="text-sm font-semibold dark:text-zinc-200 mb-3">{t('settings.landing.socialLinks')}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">{t('settings.landing.whatsapp')}</label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="08xxxxxxxxxx"
              maxLength={20}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
            />
            <p className="text-xs text-zinc-400">{t('settings.landing.whatsappHint')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(['instagram', 'tiktok', 'facebook', 'youtube'] as const).map((platform) => (
              <div key={platform}>
                <label className="text-xs text-zinc-500 mb-1 block capitalize">{platform}</label>
                <input
                  type="text"
                  value={social[platform] ?? ''}
                  onChange={(e) => setSocial({ ...social, [platform]: e.target.value })}
                  placeholder={platform === 'instagram' || platform === 'tiktok' ? '@username' : 'URL'}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
                />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave}>{t('common.save')}</Button>
      </div>

      <ConfirmChangesModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmSave}
        changes={collectChanges(
          detectScalarChange(t('settings.landing.tagline'), initialRef.current?.landing_tagline ?? '', tagline),
          detectScalarChange(t('settings.landing.about'), initialRef.current?.landing_about ?? '', about),
          detectScalarChange(t('settings.landing.ctaText'), initialRef.current?.landing_cta_text ?? '', ctaText),
          detectScalarChange(t('settings.landing.whatsapp'), initialRef.current?.whatsapp_number ?? '', whatsapp),
        )}
        isLoading={updateSettings.isPending}
      />
    </div>
  );
};
