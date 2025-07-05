import { z } from 'zod';

export const baseRequestSchema = z.object({
  id: z.string(),
  mcc: z.string(),
  rrn: z.string(),
  moto: z.boolean(),
  stan: z.string(),
  card_id: z.string(),
  network: z.string(),
  user_id: z.string(),
  fallback: z.boolean(),
  recurring: z.boolean(),
  card_entry: z.string(),
  account_id1: z.string(),
  fee_details: z.array(z.unknown()),
  merchant_id: z.string(),
  pin_present: z.boolean(),
  status_code: z.string(),
  terminal_id: z.string(),
  is_cancelled: z.string(),
  message_type: z.enum(['AUTHORIZATION', 'CLEARING']),
  merchant_city: z.string(),
  merchant_name: z.string(),
  billing_amount: z.number(),
  clearing_count: z.number(),
  reversal_count: z.number(),
  is_cash_advance: z.boolean(),
  pos_environment: z.string(),
  auth_id_response: z.string(),
  billing_currency: z.string(),
  card_expiry_date: z.string(),
  merchant_country: z.string(),
  transaction_type: z.string(),
  card_last4_digits: z.string(),
  card_first6_digits: z.string(),
  status_description: z.string(),
  transaction_amount: z.number(),
  transaction_currency: z.string(),
  transaction_timestamp: z.string(),
  billing_amount_account: z.number(),
  network_transaction_id: z.string(),
  transmission_date_time: z.string(),
  conversion_rate_billing: z.string(),
  incremental_transaction: z.boolean(),
  installment_transaction: z.boolean(),
  transaction_description: z.string(),
  billing_currency_account: z.string(),
  conversion_rate_billing_account: z.number(),
});

export const authorizationSpecificSchema = z.object({
  message_type: z.literal('AUTHORIZATION'),
  acquirer_id: z.string(),
  date_time_acquirer: z.string(),
});

export const clearingSpecificSchema = z.object({
  message_type: z.literal('CLEARING'),
  eci: z.string(),
  fee_amount: z.number(),
  clearing_id: z.string(),
  settlement_status: z.string(),
  parent_transaction_id: z.string(),
});

export const authorizationRequestSchema = baseRequestSchema.merge(authorizationSpecificSchema);

export const clearingRequestSchema = baseRequestSchema.merge(clearingSpecificSchema);

export const processorRequestSchema = z.discriminatedUnion('message_type', [
  authorizationRequestSchema,
  clearingRequestSchema,
]);

export type AuthorizationRequestData = z.infer<typeof authorizationRequestSchema>;
export type ClearingRequestData = z.infer<typeof clearingRequestSchema>;

export type ProcessorRequestData = z.infer<typeof processorRequestSchema>;
