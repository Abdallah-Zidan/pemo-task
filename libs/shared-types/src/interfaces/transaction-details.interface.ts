import { TransactionStatus, TransactionType } from '../enums';

export interface ITransactionDetails {
  processorTransactionId: string;
  parentTransactionId?: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  cardIdentifier: string;
  userId: string;
  metadata: Record<string, unknown>;
}
