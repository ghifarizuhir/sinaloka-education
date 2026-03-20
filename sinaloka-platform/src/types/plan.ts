export type PlanType = 'STARTER' | 'GROWTH' | 'BUSINESS';

export interface PlanFeatures {
  whatsappNotification: boolean;
  advancedReporting: boolean;
  multiBranch: boolean;
}

export interface PlanConfig {
  label: string;
  maxStudents: number | null;
  maxTutors: number | null;
  features: PlanFeatures;
  price: number | null;
  priceDisplay: string;
  gracePeriodDays: number;
  order: number;
}

export interface PlanUsage {
  current: number;
  limit: number | null;
}

export interface GracePeriod {
  startedAt: string;
  endsAt: string;
  daysRemaining: number;
  expired: boolean;
}

export interface PlanInfo {
  currentPlan: PlanType;
  planConfig: PlanConfig;
  usage: {
    students: PlanUsage;
    tutors: PlanUsage;
  };
  gracePeriod: GracePeriod | null;
  allPlans: Record<PlanType, PlanConfig>;
  planChangedAt: string | null;
}

export interface UpgradeRequest {
  id: string;
  institution_id: string;
  institution?: { id: string; name: string; plan_type: PlanType };
  current_plan: PlanType;
  requested_plan: PlanType;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  message: string | null;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanWarning {
  type: string;
  resource: string;
  current: number;
  limit: number;
  gracePeriodEnds: string;
  message: string;
}
