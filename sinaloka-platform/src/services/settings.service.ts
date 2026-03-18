import api from '@/src/lib/api';
import type { GeneralSettings, UpdateGeneralSettingsDto, BillingSettings, UpdateBillingSettingsDto } from '@/src/types/settings';

export const settingsService = {
  getGeneral: () =>
    api.get<GeneralSettings>('/api/settings/general').then((r) => r.data),
  updateGeneral: (data: UpdateGeneralSettingsDto) =>
    api.patch<GeneralSettings>('/api/settings/general', data).then((r) => r.data),
  getBilling: () =>
    api.get<BillingSettings>('/api/settings/billing').then((r) => r.data),
  updateBilling: (data: UpdateBillingSettingsDto) =>
    api.patch<BillingSettings>('/api/settings/billing', data).then((r) => r.data),
};
