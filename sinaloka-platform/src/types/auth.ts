export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  must_change_password: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TUTOR';
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  must_change_password: boolean;
  institution: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    timezone: string;
    default_language: string;
  } | null;
}
