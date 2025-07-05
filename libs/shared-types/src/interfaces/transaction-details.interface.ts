import { TransactionStatus, TransactionType } from '../enums';

export interface ITransactionDetails<T = unknown> {
  processorTransactionId: string;
  parentTransactionId?: string;
  processorId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  cardId: string;
  userId: string;
  metadata: T;
}
