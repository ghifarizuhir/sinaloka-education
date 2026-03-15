import { z } from 'zod';

export const InviteTutorSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255).optional(),
  subjects: z.array(z.string().min(1)).min(1),
  experience_years: z.number().int().min(0).default(0),
});
export type InviteTutorDto = z.infer<typeof InviteTutorSchema>;

export const AcceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255).optional(),
  bank_name: z.string().max(255).optional(),
  bank_account_number: z.string().max(50).optional(),
  bank_account_holder: z.string().max(255).optional(),
});
export type AcceptInviteDto = z.infer<typeof AcceptInviteSchema>;
