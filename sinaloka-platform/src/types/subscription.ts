export interface SubscriptionStatus {
  plan_type: 'STARTER' | 'GROWTH' | 'BUSINESS';
  plan_config: {
    maxStudents: number | null;
    maxTutors: number | null;
    price: number | null;
    gracePeriodDays: number;
    features: Record<string, boolean>;
  };
  subscription: {
    id: string;
    status: 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED' | 'CANCELLED';
    started_at: string;
    expires_at: string;
    grace_ends_at: string | null;
    days_remaining: number;
    last_payment: SubscriptionPayment | null;
  } | null;
}

export interface SubscriptionPayment {
  id: string;
  subscription_id: string | null;
  institution_id: string;
  amount: number;
  method: 'MIDTRANS' | 'MANUAL_TRANSFER';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  midtrans_order_id: string | null;
  proof_url: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface SubscriptionInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  period_start: string;
  period_end: string;
  due_date: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  payment: SubscriptionPayment | null;
}

export interface CreatePaymentRequest {
  plan_type: 'GROWTH' | 'BUSINESS';
  method: 'MIDTRANS' | 'MANUAL_TRANSFER';
  type: 'new' | 'renewal';
  proof_url?: string;
}

export interface CreatePaymentResponse {
  payment_id: string;
  snap_token?: string;
  snap_redirect_url?: string;
  status?: string;
}

export interface SubscriptionWarning {
  type: 'EXPIRING_SOON' | 'EXPIRED' | 'GRACE_PERIOD' | 'DOWNGRADE_PENDING';
  days_remaining?: number;
  grace_ends_at?: string;
}

export interface SubscriptionListItem {
  id: string;
  institution_id: string;
  plan_type: string;
  status: string;
  started_at: string;
  expires_at: string;
  grace_ends_at: string | null;
  institution: { id: string; name: string };
  payments: SubscriptionPayment[];
}

export interface SubscriptionStats {
  planCounts: { plan_type: string; count: number }[];
  expiringSoon: number;
  pendingPayments: number;
  monthlyRevenue: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
