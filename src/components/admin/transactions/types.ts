export type TransactionType =
  | 'payment'
  | 'outstanding_payment'
  | 'refund'
  | 'wallet_topup'
  | 'wallet_deduction'
  | 'service_charge'
  | 'product_purchase'
  | 'adjustment';

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'bank_transfer'
  | 'online_payment'
  | 'wallet'
  | 'instapay'
  | 'vodafone_cash'
  | 'other'
  | 'none';

export type TransactionStatus =
  | 'completed'
  | 'pending'
  | 'outstanding'
  | 'refunded'
  | 'failed';

export type TransactionSource = 'manual' | 'automatic';

export interface TransactionCustomer {
  id: string;
  name: string;
  phone: string;
  wallet_balance?: number;
  outstanding?: number;
  spent?: number;
}

export interface TransactionBranch {
  id: string;
  name_en: string;
  name_ar?: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  branch_id?: string | null;
  customer_id?: string | null;
  invoice_id?: string | null;
  reservation_id?: string | null;
  type: TransactionType;
  description: string;
  payment_method: PaymentMethod;
  amount: number;
  status: TransactionStatus;
  source: TransactionSource;
  reference_no?: string | null;
  related_transaction_id?: string | null;
  reason?: string | null;
  notes?: string | null;
  metadata?: Record<string, any>;
  created_by_employee_id?: string | null;
  created_by_name?: string | null;
  occurred_at: string;
  created_at: string;
  // Joined relation fields
  customer?: TransactionCustomer | null;
  branch?: TransactionBranch | null;
  invoice_no?: string | null;
  reservation_code?: string | null;
}

export interface TransactionStats {
  todayNetPayments: number;
  todayPaymentsCount: number;
  /** Full value charged today (services + products), collected or not — shown under the till figure. */
  todayEstimatedTotal?: number;
  totalOutstanding: number;
  outstandingCount: number;
  totalWalletBalance: number;
  activeWalletCount: number;
  // Patient-specific totals
  totalSpent?: number;
  patientOutstanding?: number;
  patientWalletBalance?: number;
  patientTransactionsCount?: number;
}

export interface TransactionFilterState {
  search: string;
  dateRange: 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';
  startDate?: string;
  endDate?: string;
  type: 'all' | TransactionType;
  paymentMethod: 'all' | PaymentMethod;
  status: 'all' | TransactionStatus;
  branchId: 'all' | string;
  amountRange: 'all' | 'under500' | '500_1000' | '1000_5000' | 'above5000';
  sortBy: 'date' | 'amount';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface NewManualTransactionInput {
  transaction_type: TransactionType;
  customer_id?: string;
  amount: number;
  payment_method: PaymentMethod;
  branch_id?: string;
  reference_no?: string;
  reservation_id?: string;
  invoice_id?: string;
  related_transaction_id?: string;
  description?: string;
  reason?: string;
  adjustment_direction?: 'increase' | 'decrease';
  occurred_at?: string;
  notes?: string;
}

export interface TransactionAuditLog {
  id: string;
  transaction_id: string;
  action: string;
  performed_by_employee_id?: string | null;
  performed_by_name?: string | null;
  details?: Record<string, any>;
  created_at: string;
}
