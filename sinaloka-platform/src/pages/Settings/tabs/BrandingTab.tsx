import React from 'react';
import {
  Card, Button, Input, Label, Badge
} from '../../../components/UI';
import {
  Palette, Globe, Upload
} from 'lucide-react';
import type { SettingsPageState } from '../useSettingsPage';

type BrandingTabProps = Pick<SettingsPageState,
  't' | 'primaryColor' | 'setPrimaryColor'
>;

export const BrandingTab = ({
  t, primaryColor, setPrimaryColor,
}: BrandingTabProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-bold mb-6 dark:text-zinc-100 flex items-center gap-2">
          <Palette size={20} className="text-zinc-400" />
          {t('settings.branding.whiteLabelingTitle')}
        </h3>

        <div className="space-y-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <Label>{t('settings.branding.institutionLogo')}</Label>
              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-zinc-400 transition-colors cursor-pointer">
                <div className="w-16 h-16 rounded-xl bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-400">
                  <Upload size={32} />
                </div>
                <div>
                  <p className="text-sm font-bold">{t('settings.branding.clickToUploadLogo')}</p>
                  <p className="text-xs text-zinc-500">{t('settings.branding.logoUsage')}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <Label>{t('settings.branding.primaryBrandColor')}</Label>
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl shadow-inner border border-zinc-200 dark:border-zinc-800"
                  style={{ backgroundColor: primaryColor }}
                />
                <div className="flex-1 space-y-2">
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#000000"
                  />
                  <p className="text-[10px] text-zinc-500">{t('settings.branding.colorNote')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">{t('settings.branding.customDomain')}</Label>
                <p className="text-xs text-zinc-500">{t('settings.branding.customDomainDesc')}</p>
              </div>
              <Badge variant="outline">{t('common.proFeature')}</Badge>
            </div>
            <div className="flex gap-3">
              <Input placeholder="tutor.yourbrand.com" disabled />
              <Button variant="outline" disabled className="gap-2">
                <Globe size={16} />
                {t('settings.branding.connect')}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
