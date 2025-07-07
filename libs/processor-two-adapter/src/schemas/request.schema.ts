import { z } from 'zod';
import { ProcessorTransactionStatus, ProcessorTransactionType } from '../enums';

const detailsSchema = z.object({
  oif: z.string(),
  token: z.string(),
  network: z.string(),
  oif_vat: z.string(),
  vat_rate: z.string(),
  scheme_mcc: z.string(),
  tx_fx_rate: z.string(),
  paymentology_pid: z.string(),
  paymentology_tid: z.string(),
  principal_amount: z.string(),
  scheme_tx_amount: z.string(),
  scheme_acceptor_id: z.string(),
  scheme_terminal_id: z.string(),
  scheme_tx_currency: z.string(),
  fast_message_log_id: z.string(),
  scheme_acceptor_city: z.string(),
  scheme_acceptor_name: z.string(),
  scheme_tx_local_time: z.string(),
  paymentology_auth_rid: z.string(),
  scheme_billing_amount: z
    .string()
    .refine((val) => !isNaN(Number(val)) && isFinite(Number(val)), {
      message: 'scheme_billing_amount must be a valid numeric string',
    })
    .transform((val) => Number(val)),
  scheme_billing_fx_rate: z.string(),
  scheme_acceptor_country: z.string(),
  scheme_billing_currency: z.string(),
  scheme_settlement_amount: z.string(),
  scheme_transmission_time: z.string(),
  scheme_settlement_fx_rate: z.string(),
  scheme_settlement_currency: z.string(),
  scheme_retrieval_reference_number: z.string(),
  scheme_systems_trace_audit_number: z.string(),
  //* Optional/clearing only fields
  card_number: z.string().optional(),
  interchange_fee_amount: z.string().optional(),
  interchange_fee_currency: z.string().optional(),
  scheme_reconciliation_date: z.string().optional(),
  scheme_acceptor_terminal_street: z.string().optional(),
  interchange_fee_reconciliation_currency: z.string().optional(),
  scheme_acceptor_terminal_city_or_state_code: z.string().optional(),
  scheme_acceptor_terminal_postal_code: z.string().optional(),
  paymentology_additional_settlement_reference_ri: z.string().optional(),
  interchange_fee_amount_in_reconciliation_currency: z.string().optional(),
});

const transactionSchema = z.object({
  id: z.string(),
  type: z.enum([
    ProcessorTransactionType.ACCOUNT_TRANSACTION_CREATED,
    ProcessorTransactionType.ACCOUNT_TRANSACTION_POSTED,
  ]),
  dr_cr: z.string(),
  amount: z.string(),
  status: z.enum([
    ProcessorTransactionStatus.PENDING,
    ProcessorTransactionStatus.POSTED,
    ProcessorTransactionStatus.REJECTED,
  ]), //! this is payment processor specific status
  details: detailsSchema,
  reference: z.string(),
  account_id: z.string(),
  created_at: z.string(),
  release_date: z.string(),
  scheme_merchant_id: z.string(),
  //* Optional/clearing only fields
  posted_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const authorizationRequestSchema = z.object({
  id: z.string(),
  type: z.literal('ACCOUNT_TRANSACTION_CREATED'),
  transaction: transactionSchema,
});

export const clearingRequestSchema = z.object({
  id: z.string(),
  type: z.literal('ACCOUNT_TRANSACTION_POSTED'),
  created_at: z.string(),
  transaction: transactionSchema,
});

export const processorRequestSchema = z.union([authorizationRequestSchema, clearingRequestSchema]);

export type AuthorizationRequestData = z.infer<typeof authorizationRequestSchema>;
export type ClearingRequestData = z.infer<typeof clearingRequestSchema>;
export type ProcessorRequestData = z.infer<typeof processorRequestSchema>;
