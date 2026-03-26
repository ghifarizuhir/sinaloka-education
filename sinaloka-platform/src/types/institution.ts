export interface InstitutionAdmin {
  id: string;
  name: string;
  email: string;
}

export interface Institution {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  settings: Record<string, any> | null;
  timezone: string;
  default_language: string;
  is_active: boolean;
  plan_type: 'STARTER' | 'GROWTH' | 'BUSINESS';
  billing_mode: 'PER_SESSION' | 'MONTHLY_FIXED' | null;
  created_at: string;
  updated_at: string;
  users?: InstitutionAdmin[];
}

export interface InstitutionSummary {
  studentCount: number;
  tutorCount: number;
  adminCount: number;
  activeClassCount: number;
}

export interface CreateInstitutionPayload {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  timezone?: string;
  default_language?: string;
  admin?: {
    name: string;
    email: string;
    password: string;
  };
}

export interface UpdateInstitutionPayload {
  name?: string;
  slug?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  timezone?: string | null;
  default_language?: string | null;
  is_active?: boolean;
}
