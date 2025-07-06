export const TransactionStatus = {
  PENDING: 'PENDING',
  SETTLED: 'SETTLED',
} as const;

export type TransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus];
