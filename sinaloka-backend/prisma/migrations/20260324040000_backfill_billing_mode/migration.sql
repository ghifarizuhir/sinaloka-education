-- Backfill: existing institutions get PER_SESSION default and skip onboarding
UPDATE "institutions" SET "billing_mode" = 'PER_SESSION', "onboarding_completed" = true WHERE "billing_mode" IS NULL;
