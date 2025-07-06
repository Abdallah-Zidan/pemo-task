import { TransactionStatus, TransactionType } from '../enums';

export interface ITransactionDetails<T = unknown> {
  authorizationTransactionId: string;
  clearingTransactionId?: string;
  //* this will be used to correlate the transaction with the transactions in our database
  //* (for example, if the transaction is a clearing transaction, we can use the authorization transaction id
  //* to find the authorization transaction in our database)
  transactionCorrelationId: string;
  processorId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  cardId: string;
  userId: string;
  metadata: T;
  isSuccessful: boolean;
}
