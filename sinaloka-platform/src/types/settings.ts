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
