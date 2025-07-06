import { Test, TestingModule } from '@nestjs/testing';
import { ProcessorOneAdapter } from './processor-one-adapter';
import { SHA256SignatureVerificationService } from '../services';
import { TransactionStatus, TransactionType } from '@pemo-task/shared-types';
import { ClearingRequestData, ProcessorRequestData } from '../schemas';
import { PROCESS_ONE_ADAPTER_LOGGER_TOKEN, PROCESSOR_ONE_ID } from '../constants';
import { omit } from 'lodash';

describe('ProcessorOneAdapter', () => {
  let adapter: ProcessorOneAdapter;
  let mockSignatureVerificationService: jest.Mocked<SHA256SignatureVerificationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessorOneAdapter,
        {
          provide: SHA256SignatureVerificationService,
          useValue: {
            verifySignature: jest.fn(),
          },
        },
        {
          provide: PROCESS_ONE_ADAPTER_LOGGER_TOKEN,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get<ProcessorOneAdapter>(ProcessorOneAdapter);
    mockSignatureVerificationService = module.get(SHA256SignatureVerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAndParseTransaction', () => {
    const validAuthorizationData: ProcessorRequestData = {
      id: 'txn-123',
      mcc: '5411',
      rrn: 'rrn-123',
      moto: false,
      stan: 'stan-123',
      card_id: 'card-123',
      network: 'visa',
      user_id: 'user-123',
      fallback: false,
      recurring: false,
      card_entry: 'chip',
      account_id1: 'acc-123',
      fee_details: [],
      merchant_id: 'merchant-123',
      pin_present: false,
      status_code: '0000',
      terminal_id: 'term-123',
      is_cancelled: 'false',
      message_type: TransactionType.AUTHORIZATION,
      merchant_city: 'New York',
      merchant_name: 'Test Merchant',
      billing_amount: 100.5,
      clearing_count: 0,
      reversal_count: 0,
      is_cash_advance: false,
      pos_environment: 'retail',
      auth_id_response: 'auth-123',
      billing_currency: 'USD',
      card_expiry_date: '12/25',
      merchant_country: 'US',
      transaction_type: 'purchase',
      card_last4_digits: '1234',
      card_first6_digits: '123456',
      status_description: 'Approved',
      transaction_amount: 100.5,
      transaction_currency: 'USD',
      transaction_timestamp: '2023-01-01T00:00:00Z',
      billing_amount_account: 100.5,
      network_transaction_id: 'net-123',
      transmission_date_time: '2023-01-01T00:00:00Z',
      conversion_rate_billing: '1.0',
      incremental_transaction: false,
      installment_transaction: false,
      transaction_description: 'Test transaction',
      billing_currency_account: 'USD',
      conversion_rate_billing_account: 1.0,
      acquirer_id: 'acquirer-123',
      date_time_acquirer: '2023-01-01T00:00:00Z',
    };

    const validClearingData: ClearingRequestData = {
      ...omit(validAuthorizationData, ['acquirer_id', 'date_time_acquirer']),
      message_type: TransactionType.CLEARING,
      eci: 'eci-123',
      fee_amount: 2.5,
      clearing_id: 'clearing-123',
      settlement_status: 'settled',
      parent_transaction_id: 'txn-123',
    };

    it('should be defined', () => {
      expect(adapter).toBeDefined();
    });

    it('should successfully validate and parse authorization transaction', async () => {
      const result = await adapter.validateAndParseTransaction(validAuthorizationData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          billingAmount: 100.5,
          billingCurrency: 'USD',
          status: TransactionStatus.PENDING,
          type: TransactionType.AUTHORIZATION,
          userId: 'user-123',
          cardId: 'card-123',
          metadata: validAuthorizationData,
          authorizationTransactionId: 'txn-123',
          clearingTransactionId: undefined,
          transactionCorrelationId: 'txn-123',
          processorId: PROCESSOR_ONE_ID,
          isSuccessful: true,
          processorName: 'Processor One',
          mcc: '5411',
          referenceNumber: 'rrn-123',
        });
      }
    });

    it('should successfully validate and parse clearing transaction', async () => {
      const result = await adapter.validateAndParseTransaction(validClearingData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          billingAmount: 100.5,
          billingCurrency: 'USD',
          status: TransactionStatus.SETTLED,
          type: TransactionType.CLEARING,
          userId: 'user-123',
          cardId: 'card-123',
          metadata: validClearingData,
          authorizationTransactionId: 'txn-123',
          clearingTransactionId: 'txn-123',
          transactionCorrelationId: 'txn-123',
          processorId: PROCESSOR_ONE_ID,
          isSuccessful: true,
          processorName: 'Processor One',
          mcc: '5411',
          referenceNumber: 'rrn-123',
        });
      }
    });

    it('should return error for invalid data', async () => {
      const invalidData = {
        id: 'txn-123',
        // Missing required fields
      };

      const result = await adapter.validateAndParseTransaction(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Array);
        expect(result.error.length).toBeGreaterThan(0);
        expect(result.error[0]).toContain(':');
      }
    });

    it('should handle unsuccessful transaction status code', async () => {
      const unsuccessfulData = {
        ...validAuthorizationData,
        status_code: '1111',
      };

      const result = await adapter.validateAndParseTransaction(unsuccessfulData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isSuccessful).toBe(false);
      }
    });
  });

  describe('authorizeTransaction', () => {
    const validData: ProcessorRequestData = {
      id: 'txn-123',
      mcc: '5411',
      rrn: 'rrn-123',
      moto: false,
      stan: 'stan-123',
      card_id: 'card-123',
      network: 'visa',
      user_id: 'user-123',
      fallback: false,
      recurring: false,
      card_entry: 'chip',
      account_id1: 'acc-123',
      fee_details: [],
      merchant_id: 'merchant-123',
      pin_present: false,
      status_code: '0000',
      terminal_id: 'term-123',
      is_cancelled: 'false',
      message_type: TransactionType.AUTHORIZATION,
      merchant_city: 'New York',
      merchant_name: 'Test Merchant',
      billing_amount: 100.5,
      clearing_count: 0,
      reversal_count: 0,
      is_cash_advance: false,
      pos_environment: 'retail',
      auth_id_response: 'auth-123',
      billing_currency: 'USD',
      card_expiry_date: '12/25',
      merchant_country: 'US',
      transaction_type: 'purchase',
      card_last4_digits: '1234',
      card_first6_digits: '123456',
      status_description: 'Approved',
      transaction_amount: 100.5,
      transaction_currency: 'USD',
      transaction_timestamp: '2023-01-01T00:00:00Z',
      billing_amount_account: 100.5,
      network_transaction_id: 'net-123',
      transmission_date_time: '2023-01-01T00:00:00Z',
      conversion_rate_billing: '1.0',
      incremental_transaction: false,
      installment_transaction: false,
      transaction_description: 'Test transaction',
      billing_currency_account: 'USD',
      conversion_rate_billing_account: 1.0,
      acquirer_id: 'acquirer-123',
      date_time_acquirer: '2023-01-01T00:00:00Z',
    };

    const validHeaders = {
      'x-message-signature': 'valid-signature',
    };

    it('should successfully authorize transaction with valid signature', () => {
      mockSignatureVerificationService.verifySignature.mockReturnValue(true);

      const result = adapter.authorizeTransaction(validData, validHeaders);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ isSignatureValid: true });
      }

      expect(mockSignatureVerificationService.verifySignature).toHaveBeenCalledWith(
        'txn-123|AUTHORIZATION|user-123|card-123|100.5|USD|0000',
        'valid-signature',
      );
    });

    it('should return error when signature is missing', () => {
      const headersWithoutSignature = {};

      const result = adapter.authorizeTransaction(validData, headersWithoutSignature);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Signature is required');
      }

      expect(mockSignatureVerificationService.verifySignature).not.toHaveBeenCalled();
    });

    it('should return error when signature is invalid', () => {
      mockSignatureVerificationService.verifySignature.mockReturnValue(false);

      const result = adapter.authorizeTransaction(validData, validHeaders);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid signature');
      }

      expect(mockSignatureVerificationService.verifySignature).toHaveBeenCalledWith(
        'txn-123|AUTHORIZATION|user-123|card-123|100.5|USD|0000',
        'valid-signature',
      );
    });

    it('should handle array signature header', () => {
      const headersWithArraySignature = {
        'x-message-signature': ['valid-signature'],
      };

      mockSignatureVerificationService.verifySignature.mockReturnValue(true);

      const result = adapter.authorizeTransaction(validData, headersWithArraySignature);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ isSignatureValid: true });
      }

      expect(mockSignatureVerificationService.verifySignature).toHaveBeenCalledWith(
        'txn-123|AUTHORIZATION|user-123|card-123|100.5|USD|0000',
        'valid-signature',
      );
    });

    it('should construct correct payload for signature verification', () => {
      const testData = {
        ...validData,
        id: 'test-id',
        message_type: TransactionType.CLEARING,
        user_id: 'test-user',
        card_id: 'test-card',
        billing_amount: 200.75,
        billing_currency: 'EUR',
        status_code: '1111',
      };

      mockSignatureVerificationService.verifySignature.mockReturnValue(true);

      adapter.authorizeTransaction(testData as unknown as ProcessorRequestData, validHeaders);

      expect(mockSignatureVerificationService.verifySignature).toHaveBeenCalledWith(
        'test-id|CLEARING|test-user|test-card|200.75|EUR|1111',
        'valid-signature',
      );
    });
  });

  describe('private methods', () => {
    it('should handle edge cases in signature extraction', () => {
      const headersWithUndefinedSignature = {
        'x-message-signature': undefined,
      };

      const result = adapter.authorizeTransaction(
        {} as ProcessorRequestData,
        headersWithUndefinedSignature,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Signature is required');
      }
    });
  });
});
