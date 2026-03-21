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
    maxStudents: 30,
    maxTutors: 5,
    features: {
      whatsappNotification: false,
      advancedReporting: false,
      multiBranch: false,
    },
    price: null,
    priceDisplay: 'Gratis',
    gracePeriodDays: 7,
    order: 0,
  },
  GROWTH: {
    label: 'Growth',
    maxStudents: 200,
    maxTutors: 20,
    features: {
      whatsappNotification: true,
      advancedReporting: true,
      multiBranch: false,
    },
    price: 150000,
    priceDisplay: 'Rp 150.000/bulan',
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
    price: 500000,
    priceDisplay: 'Rp 500.000/bulan',
    gracePeriodDays: 7,
    order: 2,
  },
};

export type PlanFeatureKey = keyof PlanFeatures;
export type PlanLimitResource = 'students' | 'tutors';
