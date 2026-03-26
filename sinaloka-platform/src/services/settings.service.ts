import api from '@/src/lib/api';
import type { GeneralSettings, UpdateGeneralSettingsDto, BillingSettings, UpdateBillingSettingsDto, AcademicSettings, UpdateAcademicSettingsDto, PaymentGatewaySettings, UpdatePaymentGatewayDto } from '@/src/types/settings';
import type { LandingSettings, UpdateLandingSettingsDto } from '@/src/types/landing';

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
  getPaymentGateway: () =>
    api.get<PaymentGatewaySettings>('/api/settings/payment-gateway').then((r) => r.data),
  updatePaymentGateway: (data: UpdatePaymentGatewayDto) =>
    api.patch<PaymentGatewaySettings>('/api/settings/payment-gateway', data).then((r) => r.data),
  getLanding: () =>
    api.get<LandingSettings>('/api/settings/landing').then((r) => r.data),
  updateLanding: (data: UpdateLandingSettingsDto) =>
    api.patch<LandingSettings>('/api/settings/landing', data).then((r) => r.data),
  uploadGalleryImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ id: string; url: string }>('/api/settings/landing/gallery', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  deleteGalleryImage: (imageId: string) =>
    api.delete(`/api/settings/landing/gallery/${imageId}`),
};
