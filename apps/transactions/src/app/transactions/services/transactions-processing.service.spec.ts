/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from './transactions-processing.service';
import { Transaction } from '../../models/transaction.model';
import { TransactionEvent } from '../../models/transaction-event.model';
import { getModelToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ITransactionDetails,
  TransactionStatus,
  TransactionType,
  TransactionEventType,
} from '@pemo-task/shared-types';
import { PendingClearingTransaction } from '../../models/pending-clearing-transaction.model';

describe('TransactionService', () => {
  let service: TransactionService;
  let transactionModel: jest.Mocked<typeof Transaction>;
  let transactionEventModel: jest.Mocked<typeof TransactionEvent>;
  let sequelize: jest.Mocked<Sequelize>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let mockTransaction: jest.Mocked<any>;

  const mockTransactionDetails: ITransactionDetails = {
    processorId: 'processor-one',
    processorName: 'Processor One',
    transactionCorrelationId: 'corr-123',
    authorizationTransactionId: 'auth-456',
    clearingTransactionId: 'clear-789',
    status: TransactionStatus.PENDING,
    type: TransactionType.AUTHORIZATION,
    billingAmount: 1000,
    billingCurrency: 'USD',
    mcc: '5411',
    cardId: 'card-123',
    userId: 'user-123',
    referenceNumber: 'ref-123',
    metadata: { merchantName: 'Test Merchant' },
    isSuccessful: true,
  };

  const mockTransactionRecord = {
    id: 'txn-uuid',
    processorId: 'processor-one',
    processorName: 'Processor One',
    transactionCorrelationId: 'corr-123',
    authorizationTransactionId: 'auth-456',
    status: TransactionStatus.PENDING,
    authAmount: 1000,
    currency: 'USD',
    mcc: '5411',
    cardId: 'card-123',
    userId: 'user-123',
    referenceNumber: 'ref-123',
    metadata: { merchantName: 'Test Merchant' },
    toJSON: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    mockTransaction = {
      LOCK: { UPDATE: 'UPDATE' },
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    const mockTransactionModel = {
      findOrCreate: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockTransactionEventModel = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const mockPendingClearingTransactionModel = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findOrCreate: jest.fn(),
    };

    const mockSequelize = {
      transaction: jest.fn((callback) => callback(mockTransaction)),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: getModelToken(Transaction),
          useValue: mockTransactionModel,
        },
        {
          provide: getModelToken(TransactionEvent),
          useValue: mockTransactionEventModel,
        },
        {
          provide: getModelToken(PendingClearingTransaction),
          useValue: mockPendingClearingTransactionModel,
        },
        {
          provide: Sequelize,
          useValue: mockSequelize,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    transactionModel = module.get(getModelToken(Transaction));
    transactionEventModel = module.get(getModelToken(TransactionEvent));
    sequelize = module.get(Sequelize);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processAuthorizationTransaction', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should process new authorization transaction successfully', async () => {
      const mockTxn = {
        ...mockTransactionRecord,
        toJSON: jest.fn().mockReturnValue(mockTransactionRecord),
      };
      transactionModel.findOrCreate.mockResolvedValue([mockTxn, true] as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      await service.processAuthorizationTransaction(mockTransactionDetails);

      expect(sequelize.transaction).toHaveBeenCalledTimes(1);

      expect(transactionModel.findOrCreate).toHaveBeenCalledWith({
        where: {
          transactionCorrelationId: 'corr-123',
          processorId: 'processor-one',
        },
        defaults: {
          processorId: 'processor-one',
          processorName: 'Processor One',
          transactionCorrelationId: 'corr-123',
          authorizationTransactionId: 'auth-456',
          status: TransactionStatus.PENDING,
          type: TransactionType.AUTHORIZATION,
          authAmount: 1000,
          currency: 'USD',
          mcc: '5411',
          cardId: 'card-123',
          userId: 'user-123',
          referenceNumber: 'ref-123',
          metadata: { merchantName: 'Test Merchant' },
        },
        transaction: mockTransaction,
      });

      expect(transactionEventModel.create).toHaveBeenCalledWith(
        {
          transactionId: 'txn-uuid',
          eventType: TransactionEventType.AUTHORIZATION_TRANSACTION_PROCESSED,
          data: {
            status: TransactionStatus.PENDING,
            type: TransactionType.AUTHORIZATION,
            processorId: 'processor-one',
            rawData: { merchantName: 'Test Merchant' },
          },
        },
        { transaction: mockTransaction },
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'transaction.AUTHORIZATION',
        mockTransactionRecord,
      );
    });

    it('should warn and return early for duplicate transactions', async () => {
      const existingTransaction = { ...mockTransactionRecord };
      transactionModel.findOrCreate.mockResolvedValue([existingTransaction, false] as any);

      const loggerSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      await service.processAuthorizationTransaction(mockTransactionDetails);

      expect(loggerSpy).toHaveBeenCalledWith(
        'transaction with same authorizationTransactionId and processorId already exists: processor-one:auth-456',
      );

      expect(transactionEventModel.create).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();

      loggerSpy.mockRestore();
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      transactionModel.findOrCreate.mockRejectedValue(error);

      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      await expect(service.processAuthorizationTransaction(mockTransactionDetails)).rejects.toThrow(
        'Database error',
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        'Error processing transaction: Database error',
        expect.any(String),
      );

      loggerSpy.mockRestore();
    });

    it('should handle non-Error exceptions', async () => {
      const stringError = 'String error';
      transactionModel.findOrCreate.mockRejectedValue(stringError);

      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      await expect(service.processAuthorizationTransaction(mockTransactionDetails)).rejects.toBe(
        'String error',
      );

      expect(loggerSpy).toHaveBeenCalledWith('Error processing transaction: String error');

      loggerSpy.mockRestore();
    });

    it('should handle transactions with minimal metadata', async () => {
      const minimalDetails = {
        ...mockTransactionDetails,
        metadata: null,
      };

      const mockTxn = {
        ...mockTransactionRecord,
        toJSON: jest.fn().mockReturnValue(mockTransactionRecord),
      };
      transactionModel.findOrCreate.mockResolvedValue([mockTxn, true] as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      await service.processAuthorizationTransaction(minimalDetails);

      expect(transactionModel.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          defaults: expect.objectContaining({
            metadata: null,
          }),
        }),
      );
    });
  });

  describe('processClearingTransaction', () => {
    it('should process clearing transaction successfully', async () => {
      const clearingDetails = {
        ...mockTransactionDetails,
        status: TransactionStatus.SETTLED,
        billingAmount: 950,
      };

      const existingTransaction = {
        ...mockTransactionRecord,
        update: jest.fn().mockResolvedValue({
          ...mockTransactionRecord,
          status: TransactionStatus.SETTLED,
          toJSON: jest
            .fn()
            .mockReturnValue({ ...mockTransactionRecord, status: TransactionStatus.SETTLED }),
        }),
      };

      transactionModel.findOne.mockResolvedValue(existingTransaction as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      await service.processClearingTransaction(clearingDetails);

      expect(transactionModel.findOne).toHaveBeenCalledWith({
        where: {
          transactionCorrelationId: 'corr-123',
          processorId: 'processor-one',
        },
        transaction: mockTransaction,
        lock: mockTransaction.LOCK.UPDATE,
      });

      expect(existingTransaction.update).toHaveBeenCalledWith(
        {
          clearingAmount: 950,
          clearingTransactionId: 'clear-789',
          status: TransactionStatus.SETTLED,
          metadata: { merchantName: 'Test Merchant' },
          type: TransactionType.CLEARING,
        },
        { transaction: mockTransaction },
      );

      expect(transactionEventModel.create).toHaveBeenCalledWith(
        {
          transactionId: 'txn-uuid',
          eventType: TransactionEventType.CLEARING_TRANSACTION_PROCESSED,
          data: {
            status: TransactionStatus.SETTLED,
            type: TransactionType.CLEARING,
            processorId: 'processor-one',
            rawData: { merchantName: 'Test Merchant' },
          },
        },
        { transaction: mockTransaction },
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'transaction.CLEARING',
        expect.objectContaining({ status: TransactionStatus.SETTLED }),
      );
    });

    it('should warn and return early for already settled transactions', async () => {
      const settledTransaction = {
        ...mockTransactionRecord,
        status: TransactionStatus.SETTLED,
      };

      transactionModel.findOne.mockResolvedValue(settledTransaction as any);

      const loggerSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      await service.processClearingTransaction(mockTransactionDetails);

      expect(loggerSpy).toHaveBeenCalledWith(
        'transaction to be settled is already settled: processor-one:corr-123',
      );

      expect(transactionEventModel.create).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();

      loggerSpy.mockRestore();
    });

    it('should merge metadata correctly', async () => {
      const clearingDetails = {
        ...mockTransactionDetails,
        metadata: { additionalInfo: 'clearing data' },
      };

      const existingTransaction = {
        ...mockTransactionRecord,
        metadata: { merchantName: 'Test Merchant', originalData: 'auth data' },
        update: jest.fn().mockResolvedValue(mockTransactionRecord),
      };

      transactionModel.findOne.mockResolvedValue(existingTransaction as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      await service.processClearingTransaction(clearingDetails);

      expect(existingTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            merchantName: 'Test Merchant',
            originalData: 'auth data',
            additionalInfo: 'clearing data',
          },
        }),
        { transaction: mockTransaction },
      );
    });

    it('should handle non-object metadata gracefully', async () => {
      const clearingDetails = {
        ...mockTransactionDetails,
        metadata: 'string metadata',
      };

      const existingTransaction = {
        ...mockTransactionRecord,
        metadata: 'existing string metadata',
        update: jest.fn().mockResolvedValue(mockTransactionRecord),
      };

      transactionModel.findOne.mockResolvedValue(existingTransaction as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      await service.processClearingTransaction(clearingDetails);

      expect(existingTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: 'existing string metadata',
        }),
        { transaction: mockTransaction },
      );
    });

    it('should use SELECT FOR UPDATE to prevent race conditions', async () => {
      const existingTransaction = {
        ...mockTransactionRecord,
        update: jest.fn().mockResolvedValue(mockTransactionRecord),
      };

      transactionModel.findOne.mockResolvedValue(existingTransaction as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      await service.processClearingTransaction(mockTransactionDetails);

      expect(transactionModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          lock: mockTransaction.LOCK.UPDATE,
        }),
      );
    });

    it('should handle clearing transaction processing errors', async () => {
      const error = new Error('Processing error');
      transactionModel.findOne.mockRejectedValue(error);

      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      await expect(service.processClearingTransaction(mockTransactionDetails)).rejects.toThrow(
        'Processing error',
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        'Error processing transaction: Processing error',
        expect.any(String),
      );

      loggerSpy.mockRestore();
    });
  });

  describe('database transaction handling', () => {
    it('should wrap authorization processing in database transaction', async () => {
      const mockTxn = {
        ...mockTransactionRecord,
        toJSON: jest.fn().mockReturnValue(mockTransactionRecord),
      };
      transactionModel.findOrCreate.mockResolvedValue([mockTxn, true] as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      await service.processAuthorizationTransaction(mockTransactionDetails);

      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      expect(sequelize.transaction).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should wrap clearing processing in database transaction', async () => {
      const existingTransaction = {
        ...mockTransactionRecord,
        update: jest.fn().mockResolvedValue(mockTransactionRecord),
      };

      transactionModel.findOne.mockResolvedValue(existingTransaction as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      await service.processClearingTransaction(mockTransactionDetails);

      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      expect(sequelize.transaction).toHaveBeenCalledWith(expect.any(Function));
    });
  });
});
