export interface OnboardingStatus {
  billing_mode: 'PER_SESSION' | 'MONTHLY_FIXED' | null;
  onboarding_completed: boolean;
  steps: {
    profile: boolean;
    billing: boolean;
  };
}
