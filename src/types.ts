export type TransactionType = 'payable' | 'receivable';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  category: string;
  type: TransactionType;
  status: 'pending' | 'completed';
  createdAt: string;
}

export interface FinancialSummary {
  totalPayable: number;
  totalReceivable: number;
  balance: number;
  pendingPayable: number;
  pendingReceivable: number;
}
