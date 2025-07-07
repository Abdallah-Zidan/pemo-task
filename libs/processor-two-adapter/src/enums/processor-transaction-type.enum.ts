export const ProcessorTransactionType = {
  ACCOUNT_TRANSACTION_CREATED: 'ACCOUNT_TRANSACTION_CREATED',
  ACCOUNT_TRANSACTION_POSTED: 'ACCOUNT_TRANSACTION_POSTED',
} as const;

export type ProcessorTransactionType =
  (typeof ProcessorTransactionType)[keyof typeof ProcessorTransactionType];
