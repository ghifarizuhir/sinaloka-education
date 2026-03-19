import api from '@/src/lib/api';
import type { GeneralSettings, UpdateGeneralSettingsDto, BillingSettings, UpdateBillingSettingsDto, AcademicSettings, UpdateAcademicSettingsDto } from '@/src/types/settings';

export const settingsService = {
  getGeneral: () =>
    api.get<GeneralSettings>('/api/settings/general').then((r) => r.data),
  updateGeneral: (data: UpdateGeneralSettingsDto) =>
    api.patch<GeneralSettings>('/api/settings/general', data).then((r) => r.data),
  getBilling: () =>
    api.get<BillingSettings>('/api/settings/billing').then((r) => r.data),
  updateBilling: (data: UpdateBillingSettingsDto) =>
    api.patch<BillingSettings>('/api/settings/billing', data).then((r) => r.data),
  getAcademic: () =>
    api.get<AcademicSettings>('/api/settings/academic').then((r) => r.data),
  updateAcademic: (data: UpdateAcademicSettingsDto) =>
    api.patch<AcademicSettings>('/api/settings/academic', data).then((r) => r.data),
};
