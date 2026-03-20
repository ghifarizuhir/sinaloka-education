import { SetMetadata } from '@nestjs/common';
import type { PlanFeatureKey, PlanLimitResource } from '../constants/plans.js';

export const PLAN_FEATURE_KEY = 'plan_feature';
export const PLAN_LIMIT_KEY = 'plan_limit';

export const PlanFeature = (feature: PlanFeatureKey) =>
  SetMetadata(PLAN_FEATURE_KEY, feature);

export const PlanLimit = (resource: PlanLimitResource) =>
  SetMetadata(PLAN_LIMIT_KEY, resource);
