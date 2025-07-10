/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { TransactionsGrpcService } from './transactions-grpc.service';
import { TransactionQueryService } from './transaction-query.service';
import {
  ITransactionDetails,
  IGetTransactionsRequest,
  TransactionStatus,
  TransactionType,
} from '@pemo-task/shared-types';
import { Queue } from 'bullmq';
import { TRANSACTIONS_PROCESSING_QUEUE } from '../constants';

describe('TransactionsGrpcService', () => {
  let service: TransactionsGrpcService;
  let queue: jest.Mocked<Queue>;
  let transactionQueryService: jest.Mocked<TransactionQueryService>;

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

  const mockGetTransactionsRequest: IGetTransactionsRequest = {
    cardId: 'card-123',
    processorId: 'processor-one',
    status: TransactionStatus.PENDING,
    page: 1,
    limit: 10,
  };

  const mockTransactionQueryResult = {
    transactions: [
      {
        id: 'txn-1',
        cardId: 'card-123',
        userId: 'user-123',
        authAmount: 1000,
        status: TransactionStatus.PENDING,
      },
    ],
    total: 1,
  };

  beforeEach(async () => {
    const mockQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
      getJobs: jest.fn(),
    };

    const mockTransactionQueryService = {
      getTransactions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsGrpcService,
        {
          provide: getQueueToken(TRANSACTIONS_PROCESSING_QUEUE),
          useValue: mockQueue,
        },
        {
          provide: TransactionQueryService,
          useValue: mockTransactionQueryService,
        },
      ],
    }).compile();

    service = module.get<TransactionsGrpcService>(TransactionsGrpcService);
    queue = module.get(getQueueToken(TRANSACTIONS_PROCESSING_QUEUE));
    transactionQueryService = module.get(TransactionQueryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processTransaction', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should add transaction to queue successfully', async () => {
      queue.add.mockResolvedValue({} as any);

      const result = await service.processTransaction(mockTransactionDetails);

      expect(queue.add).toHaveBeenCalledWith(
        'process-transaction',
        {
          ...mockTransactionDetails,
          metadata: mockTransactionDetails.metadata,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: false,
          removeOnFail: false,
          deduplication: {
            id: 'AUTHORIZATION-processor-one-corr-123',
          },
        },
      );

      expect(result).toEqual({ success: true });
    });

    it('should handle different transaction types in deduplication id', async () => {
      const clearingTransaction = {
        ...mockTransactionDetails,
        type: TransactionType.CLEARING,
      };

      queue.add.mockResolvedValue({} as any);

      await service.processTransaction(clearingTransaction);

      expect(queue.add).toHaveBeenCalledWith(
        'process-transaction',
        expect.any(Object),
        expect.objectContaining({
          deduplication: {
            id: 'CLEARING-processor-one-corr-123',
          },
        }),
      );
    });

    it('should handle transactions with different processor ids', async () => {
      const differentProcessorTransaction = {
        ...mockTransactionDetails,
        processorId: 'processor-two',
      };

      queue.add.mockResolvedValue({} as any);

      await service.processTransaction(differentProcessorTransaction);

      expect(queue.add).toHaveBeenCalledWith(
        'process-transaction',
        expect.any(Object),
        expect.objectContaining({
          deduplication: {
            id: 'AUTHORIZATION-processor-two-corr-123',
          },
        }),
      );
    });

    it('should handle transactions with different correlation ids', async () => {
      const differentCorrelationTransaction = {
        ...mockTransactionDetails,
        transactionCorrelationId: 'corr-456',
      };

      queue.add.mockResolvedValue({} as any);

      await service.processTransaction(differentCorrelationTransaction);

      expect(queue.add).toHaveBeenCalledWith(
        'process-transaction',
        expect.any(Object),
        expect.objectContaining({
          deduplication: {
            id: 'AUTHORIZATION-processor-one-corr-456',
          },
        }),
      );
    });

    it('should preserve metadata in queue payload', async () => {
      const transactionWithComplexMetadata = {
        ...mockTransactionDetails,
        metadata: {
          merchantName: 'Complex Merchant',
          location: { lat: 40.7128, lng: -74.006 },
          extra: { nested: { data: 'value' } },
        },
      };

      queue.add.mockResolvedValue({} as any);

      await service.processTransaction(transactionWithComplexMetadata);

      expect(queue.add).toHaveBeenCalledWith(
        'process-transaction',
        expect.objectContaining({
          metadata: {
            merchantName: 'Complex Merchant',
            location: { lat: 40.7128, lng: -74.006 },
            extra: { nested: { data: 'value' } },
          },
        }),
        expect.any(Object),
      );
    });

    it('should handle transactions with null metadata', async () => {
      const transactionWithNullMetadata = {
        ...mockTransactionDetails,
        metadata: null,
      };

      queue.add.mockResolvedValue({} as any);

      await service.processTransaction(transactionWithNullMetadata);

      expect(queue.add).toHaveBeenCalledWith(
        'process-transaction',
        expect.objectContaining({
          metadata: null,
        }),
        expect.any(Object),
      );
    });

    it('should use correct queue configuration', async () => {
      queue.add.mockResolvedValue({} as any);

      await service.processTransaction(mockTransactionDetails);

      expect(queue.add).toHaveBeenCalledWith(
        'process-transaction',
        expect.any(Object),
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: false,
          removeOnFail: false,
        }),
      );
    });

    it('should handle queue add failures', async () => {
      const queueError = new Error('Queue add failed');
      queue.add.mockRejectedValue(queueError);

      await expect(service.processTransaction(mockTransactionDetails)).rejects.toThrow(
        'Queue add failed',
      );
    });

    it('should create unique deduplication ids for different transactions', async () => {
      const transaction1 = { ...mockTransactionDetails, transactionCorrelationId: 'corr-001' };
      const transaction2 = { ...mockTransactionDetails, transactionCorrelationId: 'corr-002' };

      queue.add.mockResolvedValue({} as any);

      await service.processTransaction(transaction1);
      await service.processTransaction(transaction2);

      expect(queue.add).toHaveBeenNthCalledWith(
        1,
        'process-transaction',
        expect.any(Object),
        expect.objectContaining({
          deduplication: { id: 'AUTHORIZATION-processor-one-corr-001' },
        }),
      );

      expect(queue.add).toHaveBeenNthCalledWith(
        2,
        'process-transaction',
        expect.any(Object),
        expect.objectContaining({
          deduplication: { id: 'AUTHORIZATION-processor-one-corr-002' },
        }),
      );
    });
  });

  describe('getTransactions', () => {
    it('should delegate to transaction query service', async () => {
      transactionQueryService.getTransactions.mockResolvedValue(mockTransactionQueryResult as any);

      const result = await service.getTransactions(mockGetTransactionsRequest);

      expect(transactionQueryService.getTransactions).toHaveBeenCalledWith(
        mockGetTransactionsRequest,
      );
      expect(result).toEqual(mockTransactionQueryResult);
    });

    it('should handle different query parameters', async () => {
      const customQuery = {
        ...mockGetTransactionsRequest,
        limit: 50,
        offset: 10,
        status: TransactionStatus.SETTLED,
      };

      transactionQueryService.getTransactions.mockResolvedValue(mockTransactionQueryResult as any);

      await service.getTransactions(customQuery);

      expect(transactionQueryService.getTransactions).toHaveBeenCalledWith(customQuery);
    });

    it('should handle empty query results', async () => {
      const emptyResult = { transactions: [], total: 0 };
      transactionQueryService.getTransactions.mockResolvedValue(emptyResult as any);

      const result = await service.getTransactions(mockGetTransactionsRequest);

      expect(result).toEqual(emptyResult);
    });

    it('should propagate query service errors', async () => {
      const queryError = new Error('Query failed');
      transactionQueryService.getTransactions.mockRejectedValue(queryError);

      await expect(service.getTransactions(mockGetTransactionsRequest)).rejects.toThrow(
        'Query failed',
      );
    });

    it('should handle query with minimal parameters', async () => {
      const minimalQuery = {
        page: 1,
        limit: 10,
      } as IGetTransactionsRequest;

      transactionQueryService.getTransactions.mockResolvedValue(mockTransactionQueryResult as any);

      await service.getTransactions(minimalQuery);

      expect(transactionQueryService.getTransactions).toHaveBeenCalledWith(minimalQuery);
    });
  });

  describe('integration scenarios', () => {
    it('should handle concurrent transaction processing', async () => {
      queue.add.mockResolvedValue({} as any);

      const transaction1 = { ...mockTransactionDetails, transactionCorrelationId: 'corr-001' };
      const transaction2 = { ...mockTransactionDetails, transactionCorrelationId: 'corr-002' };

      const promises = [
        service.processTransaction(transaction1),
        service.processTransaction(transaction2),
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual([{ success: true }, { success: true }]);
      expect(queue.add).toHaveBeenCalledTimes(2);
    });

    it('should maintain service functionality when queue is down', async () => {
      queue.add.mockRejectedValue(new Error('Queue unavailable'));
      transactionQueryService.getTransactions.mockResolvedValue(mockTransactionQueryResult as any);

      // Queue operation should fail
      await expect(service.processTransaction(mockTransactionDetails)).rejects.toThrow(
        'Queue unavailable',
      );

      // But query operation should still work
      const result = await service.getTransactions(mockGetTransactionsRequest);
      expect(result).toEqual(mockTransactionQueryResult);
    });
  });
});
