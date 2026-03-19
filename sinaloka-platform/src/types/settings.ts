export interface GeneralSettings {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  timezone: string;
  default_language: string;
}

export interface UpdateGeneralSettingsDto {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  timezone?: string;
  default_language?: string;
}

export interface BankAccount {
  id?: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
}

export interface BillingSettings {
  billing_mode: 'manual' | 'per_session' | 'package' | 'subscription';
  currency: string;
  invoice_prefix: string;
  late_payment_auto_lock: boolean;
  late_payment_threshold: number;
  expense_categories: string[];
  bank_accounts: BankAccount[];
}

export interface UpdateBillingSettingsDto {
  billing_mode?: string;
  currency?: string;
  invoice_prefix?: string;
  late_payment_auto_lock?: boolean;
  late_payment_threshold?: number;
  expense_categories?: string[];
  bank_accounts?: BankAccount[];
}

export type RoomType = 'Classroom' | 'Laboratory' | 'Studio' | 'Online';
export type RoomStatus = 'Available' | 'Maintenance' | 'Unavailable';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  capacity: number | null;
  status: RoomStatus;
}

export interface SubjectCategory {
  id: string;
  name: string;
  order: number;
}

export interface GradeLevel {
  id: string;
  name: string;
  order: number;
}

export interface AcademicSettings {
  rooms: Room[];
  subject_categories: SubjectCategory[];
  grade_levels: GradeLevel[];
  working_days: number[];
}

export interface UpdateAcademicSettingsDto {
  rooms?: Room[];
  subject_categories?: SubjectCategory[];
  grade_levels?: GradeLevel[];
  working_days?: number[];
}

export interface PaymentGatewaySettings {
  provider: string;
  midtrans_server_key: string;
  midtrans_client_key: string;
  midtrans_server_key_masked: string;
  is_sandbox: boolean;
  is_configured: boolean;
}

export interface UpdatePaymentGatewayDto {
  midtrans_server_key?: string;
  midtrans_client_key?: string;
  is_sandbox?: boolean;
}
