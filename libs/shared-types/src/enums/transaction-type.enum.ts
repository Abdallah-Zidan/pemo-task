export const TransactionType = {
  AUTHORIZATION: 'AUTHORIZATION',
  CLEARING: 'CLEARING',
} as const;

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];
