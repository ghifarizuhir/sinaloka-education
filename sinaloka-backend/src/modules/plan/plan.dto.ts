import { z } from 'zod';

export const UpgradeRequestSchema = z.object({
  requested_plan: z.enum(['GROWTH', 'BUSINESS']),
  message: z.string().max(500).optional(),
});

export type UpgradeRequestDto = z.infer<typeof UpgradeRequestSchema>;

export const ReviewUpgradeRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  review_notes: z.string().max(500).optional(),
});

export type ReviewUpgradeRequestDto = z.infer<
  typeof ReviewUpgradeRequestSchema
>;

export const UpdateInstitutionPlanSchema = z.object({
  plan_type: z.enum(['STARTER', 'GROWTH', 'BUSINESS']),
});

export type UpdateInstitutionPlanDto = z.infer<
  typeof UpdateInstitutionPlanSchema
>;

export const UpgradeRequestQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type UpgradeRequestQueryDto = z.infer<typeof UpgradeRequestQuerySchema>;
