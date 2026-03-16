import { z } from 'zod';

export const WebhookVerifySchema = z.object({
  'hub.mode': z.literal('subscribe'),
  'hub.verify_token': z.string(),
  'hub.challenge': z.string(),
});

export type WebhookVerifyDto = z.infer<typeof WebhookVerifySchema>;
