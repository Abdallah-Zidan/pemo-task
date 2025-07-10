/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { ProcessorTwoAdapter } from './processor-two.adapter';
import { DecryptionService, SHA512SignatureVerificationService } from '../services';
import { MODULE_OPTIONS_TOKEN } from '../module.definition';
import { PROCESS_TWO_ADAPTER_LOGGER_TOKEN, PROCESSOR_TWO_ID } from '../constants';
import { IModuleOptions } from '../interfaces';
import { ProcessorTransactionStatus, ProcessorTransactionType } from '../enums';
import { TransactionStatus, TransactionType } from '@pemo-task/shared-types';

describe('ProcessorTwoAdapter', () => {
  let adapter: ProcessorTwoAdapter;
  let mockDecryptionService: jest.Mocked<DecryptionService>;
  let mockSignatureVerificationService: jest.Mocked<SHA512SignatureVerificationService>;
  let mockLogger: jest.Mocked<any>;
  let mockOptions: IModuleOptions;

  const validAuthorizationData: any = {
    id: 'req-123',
    type: 'ACCOUNT_TRANSACTION_CREATED',
    transaction: {
      id: 'txn-123',
      type: 'ACCOUNT_TRANSACTION_CREATED',
      dr_cr: 'dr',
      amount: '100.50',
      status: 'PENDING',
      details: {
        oif: 'oif-123',
        token: 'token-123',
        network: 'visa',
        oif_vat: '5.0',
        vat_rate: '0.05',
        scheme_mcc: '5411',
        tx_fx_rate: '1.0',
        paymentology_pid: 'pid-123',
        paymentology_tid: 'tid-123',
        principal_amount: '100.50',
        scheme_tx_amount: '100.50',
        scheme_acceptor_id: 'acc-123',
        scheme_terminal_id: 'term-123',
        scheme_tx_currency: 'USD',
        fast_message_log_id: 'log-123',
        scheme_acceptor_city: 'New York',
        scheme_acceptor_name: 'Test Merchant',
        scheme_tx_local_time: '2023-01-01T00:00:00Z',
        paymentology_auth_rid: 'auth-123',
        scheme_billing_amount: '100.5',
        scheme_billing_fx_rate: '1.0',
        scheme_acceptor_country: 'US',
        scheme_billing_currency: 'USD',
        scheme_settlement_amount: '100.50',
        scheme_transmission_time: '2023-01-01T00:00:00Z',
        scheme_settlement_fx_rate: '1.0',
        scheme_settlement_currency: 'USD',
        scheme_retrieval_reference_number: 'rrn-123',
        scheme_systems_trace_audit_number: 'stan-123',
      },
      reference: 'ref-123',
      account_id: 'account-123',
      created_at: '2023-01-01T00:00:00Z',
      release_date: '2023-01-01T00:00:00Z',
      scheme_merchant_id: 'merchant-123',
    },
  };

  const validClearingData: any = {
    id: 'req-456',
    type: 'ACCOUNT_TRANSACTION_POSTED',
    created_at: '2023-01-01T00:00:00Z',
    transaction: {
      ...validAuthorizationData.transaction,
      type: 'ACCOUNT_TRANSACTION_POSTED',
      status: 'POSTED',
      posted_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
  };

  beforeEach(async () => {
    mockOptions = {
      decryptionPrivateKeyBase64: 'test-key-base64',
      signatureVerificationPublicKeyBase64: 'test-public-key-base64',
      apiKey: 'test-api-key',
    };

    mockDecryptionService = {
      decrypt: jest.fn(),
    } as any;

    mockSignatureVerificationService = {
      verifySignature: jest.fn(),
    } as any;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessorTwoAdapter,
        {
          provide: DecryptionService,
          useValue: mockDecryptionService,
        },
        {
          provide: SHA512SignatureVerificationService,
          useValue: mockSignatureVerificationService,
        },
        {
          provide: MODULE_OPTIONS_TOKEN,
          useValue: mockOptions,
        },
        {
          provide: PROCESS_TWO_ADAPTER_LOGGER_TOKEN,
          useValue: mockLogger,
        },
      ],
    }).compile();

    adapter = module.get<ProcessorTwoAdapter>(ProcessorTwoAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAndParseTransaction', () => {
    it('should be defined', () => {
      expect(adapter).toBeDefined();
    });

    it('should return error when body does not have data property', async () => {
      const invalidBody = { notData: 'test' };

      const result = await adapter.validateAndParseTransaction(invalidBody);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(['Invalid data']);
      }
    });

    it('should return error when body.data is not a string', async () => {
      const invalidBody = { data: 123 };

      const result = await adapter.validateAndParseTransaction(invalidBody);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(['Invalid data']);
      }
    });

    it('should return error when decryption fails', async () => {
      const body = { data: 'encrypted-data' };
      mockDecryptionService.decrypt.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const result = await adapter.validateAndParseTransaction(body);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(['Invalid data']);
      }
      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return error when JSON parsing fails', async () => {
      const body = { data: 'encrypted-data' };
      mockDecryptionService.decrypt.mockReturnValue('invalid-json');

      const result = await adapter.validateAndParseTransaction(body);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(['Invalid data']);
      }
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should return error when schema validation fails', async () => {
      const body = { data: 'encrypted-data' };
      const invalidData = { invalidField: 'test' };
      mockDecryptionService.decrypt.mockReturnValue(JSON.stringify(invalidData));

      const result = await adapter.validateAndParseTransaction(body);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Array);
        expect(result.error.length).toBeGreaterThan(0);
      }
    });

    it('should successfully validate and parse authorization transaction', async () => {
      const body = { data: 'encrypted-data' };
      mockDecryptionService.decrypt.mockReturnValue(JSON.stringify(validAuthorizationData));

      const result = await adapter.validateAndParseTransaction(body);


      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          billingAmount: 100.5,
          billingCurrency: 'USD',
          status: TransactionStatus.PENDING,
          type: TransactionType.AUTHORIZATION,
          userId: 'merchant-123',
          cardId: 'account-123',
          metadata: expect.objectContaining({
            id: 'req-123',
            type: 'ACCOUNT_TRANSACTION_CREATED',
          }),
          authorizationTransactionId: 'txn-123',
          clearingTransactionId: 'txn-123',
          transactionCorrelationId: 'txn-123',
          processorId: PROCESSOR_TWO_ID,
          isSuccessful: true,
          processorName: 'Processor Two',
          mcc: '5411',
          referenceNumber: 'ref-123',
        });
      }
    });

    it('should successfully validate and parse clearing transaction', async () => {
      const body = { data: 'encrypted-data' };
      mockDecryptionService.decrypt.mockReturnValue(JSON.stringify(validClearingData));

      const result = await adapter.validateAndParseTransaction(body);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          billingAmount: 100.5,
          billingCurrency: 'USD',
          status: TransactionStatus.SETTLED,
          type: TransactionType.CLEARING,
          userId: 'merchant-123',
          cardId: 'account-123',
          metadata: expect.objectContaining({
            id: 'req-456',
            type: 'ACCOUNT_TRANSACTION_POSTED',
          }),
          authorizationTransactionId: 'txn-123',
          clearingTransactionId: 'txn-123',
          transactionCorrelationId: 'txn-123',
          processorId: PROCESSOR_TWO_ID,
          isSuccessful: true,
          processorName: 'Processor Two',
          mcc: '5411',
          referenceNumber: 'ref-123',
        });
      }
    });

    it('should handle unsuccessful transaction with rejected status', async () => {
      const unsuccessfulData = {
        ...validAuthorizationData,
        transaction: {
          ...validAuthorizationData.transaction,
          status: 'REJECTED',
        },
      };

      const body = { data: 'encrypted-data' };
      mockDecryptionService.decrypt.mockReturnValue(JSON.stringify(unsuccessfulData));

      const result = await adapter.validateAndParseTransaction(body);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isSuccessful).toBe(false);
      }
    });
  });

  describe('authorizeTransaction', () => {
    const validData = validAuthorizationData;
    const validHeaders = {
      'x-api-key': 'test-api-key',
      'x-message-signature': 'valid-signature',
    };

    it('should successfully authorize transaction with valid API key and signature', () => {
      mockSignatureVerificationService.verifySignature.mockReturnValue(true);

      const result = adapter.authorizeTransaction(validData, validHeaders);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ isSignatureValid: true });
      }

      expect(mockSignatureVerificationService.verifySignature).toHaveBeenCalledWith(
        'req-123|ACCOUNT_TRANSACTION_CREATED|100.5|USD|PENDING',
        'valid-signature',
      );
    });

    it('should return error when API key is missing', () => {
      const headersWithoutApiKey = {
        'x-message-signature': 'valid-signature',
      };

      const result = adapter.authorizeTransaction(validData, headersWithoutApiKey);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid API key');
      }

      expect(mockSignatureVerificationService.verifySignature).not.toHaveBeenCalled();
    });

    it('should return error when API key is invalid', () => {
      const headersWithInvalidApiKey = {
        'x-api-key': 'invalid-api-key',
        'x-message-signature': 'valid-signature',
      };

      const result = adapter.authorizeTransaction(validData, headersWithInvalidApiKey);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid API key');
      }

      expect(mockSignatureVerificationService.verifySignature).not.toHaveBeenCalled();
    });

    it('should return error when signature is missing', () => {
      const headersWithoutSignature = {
        'x-api-key': 'test-api-key',
      };

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
        'req-123|ACCOUNT_TRANSACTION_CREATED|100.5|USD|PENDING',
        'valid-signature',
      );
    });

    it('should handle array API key header', () => {
      const headersWithArrayApiKey = {
        'x-api-key': ['test-api-key'],
        'x-message-signature': 'valid-signature',
      };

      const result = adapter.authorizeTransaction(validData, headersWithArrayApiKey);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid API key');
      }
    });

    it('should handle array signature header', () => {
      const headersWithArraySignature = {
        'x-api-key': 'test-api-key',
        'x-message-signature': ['valid-signature'],
      };

      mockSignatureVerificationService.verifySignature.mockReturnValue(true);

      const result = adapter.authorizeTransaction(validData, headersWithArraySignature);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ isSignatureValid: true });
      }

      expect(mockSignatureVerificationService.verifySignature).toHaveBeenCalledWith(
        'req-123|ACCOUNT_TRANSACTION_CREATED|100.5|USD|PENDING',
        'valid-signature',
      );
    });

    it('should handle undefined API key header', () => {
      const headersWithUndefinedApiKey = {
        'x-api-key': undefined,
        'x-message-signature': 'valid-signature',
      };

      const result = adapter.authorizeTransaction(validData, headersWithUndefinedApiKey);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid API key');
      }
    });
  });

  describe('private methods', () => {
    describe('mapTransactionType', () => {
      it('should map ACCOUNT_TRANSACTION_POSTED to CLEARING', () => {
        const result = (adapter as any).mapTransactionType(
          ProcessorTransactionType.ACCOUNT_TRANSACTION_POSTED,
        );
        expect(result).toBe(TransactionType.CLEARING);
      });

      it('should map ACCOUNT_TRANSACTION_CREATED to AUTHORIZATION', () => {
        const result = (adapter as any).mapTransactionType(
          ProcessorTransactionType.ACCOUNT_TRANSACTION_CREATED,
        );
        expect(result).toBe(TransactionType.AUTHORIZATION);
      });
    });

    describe('mapTypeToStatus', () => {
      it('should map ACCOUNT_TRANSACTION_POSTED to SETTLED', () => {
        const result = (adapter as any).mapTypeToStatus(
          ProcessorTransactionType.ACCOUNT_TRANSACTION_POSTED,
        );
        expect(result).toBe(TransactionStatus.SETTLED);
      });

      it('should map ACCOUNT_TRANSACTION_CREATED to PENDING', () => {
        const result = (adapter as any).mapTypeToStatus(
          ProcessorTransactionType.ACCOUNT_TRANSACTION_CREATED,
        );
        expect(result).toBe(TransactionStatus.PENDING);
      });
    });

    describe('isSuccessfulTransaction', () => {
      it('should return true for POSTED status', () => {
        const result = (adapter as any).isSuccessfulTransaction(ProcessorTransactionStatus.POSTED);
        expect(result).toBe(true);
      });

      it('should return true for PENDING status', () => {
        const result = (adapter as any).isSuccessfulTransaction(ProcessorTransactionStatus.PENDING);
        expect(result).toBe(true);
      });

      it('should return false for REJECTED status', () => {
        const result = (adapter as any).isSuccessfulTransaction(
          ProcessorTransactionStatus.REJECTED,
        );
        expect(result).toBe(false);
      });
    });
  });
});