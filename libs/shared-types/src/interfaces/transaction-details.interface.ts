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
  billingAmount: number;
  billingCurrency: string;
  cardId: string;
  userId: string;
  metadata: T;
  isSuccessful: boolean;
  processorName: string;
  mcc: string;
  referenceNumber: string;
}

export type ITransactionDetailsResponse<T = unknown> = Omit<
  ITransactionDetails<T>,
  'isSuccessful'
> & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export interface IGetTransactionResponse<T = unknown> {
  transactions: ITransactionDetailsResponse<T>[];
  total: number;
  page: number;
  limit: number;
}

export interface IGetTransactionsRequest {
  cardId?: string;
  processorId?: string;
  status?: TransactionStatus;
  page: number;
  limit: number;
}
