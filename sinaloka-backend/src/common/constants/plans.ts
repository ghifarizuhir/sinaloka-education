import type { PlanType } from '../../../generated/prisma/client.js';

export interface PlanFeatures {
  whatsappNotification: boolean;
  advancedReporting: boolean;
  multiBranch: boolean;
}

export interface PlanConfig {
  label: string;
  maxStudents: number | null; // null = unlimited
  maxTutors: number | null; // null = unlimited
  features: PlanFeatures;
  price: number | null; // null = free
  priceDisplay: string;
  gracePeriodDays: number;
  order: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanConfig> = {
  STARTER: {
    label: 'Starter',
    maxStudents: 40,
    maxTutors: 5,
    features: {
      whatsappNotification: false,
      advancedReporting: false,
      multiBranch: false,
    },
    price: 199000,
    priceDisplay: 'Rp 199rb/bulan',
    gracePeriodDays: 7,
    order: 0,
  },
  GROWTH: {
    label: 'Growth',
    maxStudents: 100,
    maxTutors: 15,
    features: {
      whatsappNotification: true,
      advancedReporting: true,
      multiBranch: false,
    },
    price: 399000,
    priceDisplay: 'Rp 399rb/bulan',
    gracePeriodDays: 7,
    order: 1,
  },
  BUSINESS: {
    label: 'Business',
    maxStudents: null,
    maxTutors: null,
    features: {
      whatsappNotification: true,
      advancedReporting: true,
      multiBranch: true,
    },
    price: null,
    priceDisplay: 'Segera Hadir',
    gracePeriodDays: 7,
    order: 2,
  },
};

export type PlanFeatureKey = keyof PlanFeatures;
export type PlanLimitResource = 'students' | 'tutors';
