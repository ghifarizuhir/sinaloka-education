export type RegistrationType = 'STUDENT' | 'TUTOR';
export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Registration {
  id: string;
  institution_id: string;
  type: RegistrationType;
  status: RegistrationStatus;
  name: string;
  email: string | null;
  phone: string | null;
  grade: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  subject_names: string[];
  experience_years: number | null;
  rejected_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegistrationSettings {
  student_enabled: boolean;
  tutor_enabled: boolean;
}
