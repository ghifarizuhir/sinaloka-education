export interface LandingFeature {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
  order: number;
}

export interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  youtube?: string;
  website?: string;
}

export interface LandingSettings {
  landing_enabled: boolean;
  landing_tagline: string | null;
  landing_about: string | null;
  landing_cta_text: string | null;
  whatsapp_number: string | null;
  landing_features: LandingFeature[] | null;
  gallery_images: GalleryImage[] | null;
  social_links: SocialLinks | null;
}

export interface UpdateLandingSettingsDto {
  landing_enabled?: boolean;
  landing_tagline?: string | null;
  landing_about?: string | null;
  landing_cta_text?: string | null;
  whatsapp_number?: string | null;
  landing_features?: LandingFeature[] | null;
  gallery_images?: GalleryImage[] | null;
  social_links?: SocialLinks | null;
}

export interface LandingPageData {
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  brand_color: string | null;
  background_image_url: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  registration_enabled: boolean;
  landing_enabled: boolean;
  landing_tagline: string | null;
  landing_about: string | null;
  landing_cta_text: string | null;
  whatsapp_number: string | null;
  landing_features: LandingFeature[] | null;
  gallery_images: GalleryImage[] | null;
  social_links: SocialLinks | null;
  stats: {
    active_students: number;
    active_tutors: number;
    total_subjects: number;
  };
  subjects: { id: string; name: string }[];
}
