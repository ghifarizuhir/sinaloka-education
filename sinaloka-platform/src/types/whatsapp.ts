import type { PaginationParams } from './common';

export interface WhatsappMessage {
  id: string;
  institution_id: string;
  phone: string;
  template_name: string;
  template_params: (string | number)[];
  wa_message_id: string | null;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  error: string | null;
  retry_count: number;
  related_type: string | null;
  related_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsappStats {
  configured: boolean;
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  pending: number;
}

export interface WhatsappSettings {
  auto_reminders: boolean;
  remind_days_before: number;
}

export interface WhatsappMessageQueryParams extends PaginationParams {
  status?: string;
  date_from?: string;
  date_to?: string;
  related_type?: string;
}
