import api from '@/src/lib/api';
import type { OnboardingStatus } from '@/src/types/onboarding';

export const onboardingService = {
  getStatus: () => api.get<OnboardingStatus>('/api/onboarding/status').then((r) => r.data),
  setBillingMode: (billing_mode: 'PER_SESSION' | 'MONTHLY_FIXED') =>
    api.post('/api/onboarding/billing-mode', { billing_mode }).then((r) => r.data),
  complete: () => api.post('/api/onboarding/complete').then((r) => r.data),
};
