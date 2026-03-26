-- AlterTable
ALTER TABLE "institutions" ADD COLUMN     "landing_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "landing_tagline" VARCHAR(200),
ADD COLUMN     "landing_about" TEXT,
ADD COLUMN     "landing_cta_text" VARCHAR(50),
ADD COLUMN     "whatsapp_number" VARCHAR(20),
ADD COLUMN     "landing_features" JSONB,
ADD COLUMN     "gallery_images" JSONB,
ADD COLUMN     "social_links" JSONB;
