export const ProcessorTransactionStatus = {
  PENDING: 'PENDING',
  POSTED: 'POSTED',
  REJECTED: 'REJECTED',
} as const;

export type ProcessorTransactionStatus =
  (typeof ProcessorTransactionStatus)[keyof typeof ProcessorTransactionStatus];
