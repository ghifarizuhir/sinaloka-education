import { z } from 'zod';

export const InviteTutorSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255).optional(),
  subject_ids: z.array(z.string().uuid()).min(1),
  experience_years: z.number().int().min(0).default(0),
});
export type InviteTutorDto = z.infer<typeof InviteTutorSchema>;

export const AcceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255).optional(),
  bank_name: z.string().min(1).max(255),
  bank_account_number: z.string().min(1).max(50),
  bank_account_holder: z.string().min(1).max(255),
});
export type AcceptInviteDto = z.infer<typeof AcceptInviteSchema>;
