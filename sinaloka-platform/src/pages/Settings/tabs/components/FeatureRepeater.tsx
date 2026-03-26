import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { IconPicker } from './IconPicker';
import type { LandingFeature } from '@/src/types/landing';

interface FeatureRepeaterProps {
  features: LandingFeature[];
  onChange: (features: LandingFeature[]) => void;
}

export function FeatureRepeater({ features, onChange }: FeatureRepeaterProps) {
  const { t } = useTranslation();

  const addFeature = () => {
    if (features.length >= 4) return;
    onChange([
      ...features,
      { id: crypto.randomUUID(), icon: 'Star', title: '', description: '' },
    ]);
  };

  const removeFeature = (id: string) => {
    onChange(features.filter((f) => f.id !== id));
  };

  const updateFeature = (id: string, field: keyof LandingFeature, value: string) => {
    onChange(features.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  return (
    <div className="space-y-3">
      {features.map((feature) => (
        <div
          key={feature.id}
          className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg space-y-2"
        >
          <div className="flex items-center gap-2">
            <IconPicker
              value={feature.icon}
              onChange={(icon) => updateFeature(feature.id, 'icon', icon)}
            />
            <input
              type="text"
              value={feature.title}
              onChange={(e) => updateFeature(feature.id, 'title', e.target.value)}
              placeholder={t('settings.landing.featureTitle')}
              maxLength={50}
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
            />
            <button
              type="button"
              onClick={() => removeFeature(feature.id)}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <input
            type="text"
            value={feature.description}
            onChange={(e) => updateFeature(feature.id, 'description', e.target.value)}
            placeholder={t('settings.landing.featureDescription')}
            maxLength={120}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
          />
        </div>
      ))}
      {features.length < 4 && (
        <button
          type="button"
          onClick={addFeature}
          className="w-full py-2 border border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg text-sm text-primary hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center gap-1"
        >
          <Plus size={14} />
          {t('settings.landing.featuresAdd')}
        </button>
      )}
      <p className="text-xs text-zinc-400 text-right">
        {features.length}/4
      </p>
    </div>
  );
}
