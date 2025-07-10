/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { TransactionQueryService } from './transaction-query.service';
import { Transaction } from '../../models/transaction.model';
import { IGetTransactionsRequest, TransactionStatus } from '@pemo-task/shared-types';

describe('TransactionQueryService', () => {
  let service: TransactionQueryService;
  let transactionModel: jest.Mocked<typeof Transaction>;

  const mockTransactionRecord = {
    id: 'txn-123',
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
    createdAt: new Date('2023-01-01T10:00:00Z'),
    updatedAt: new Date('2023-01-01T10:30:00Z'),
    toJSON: jest.fn().mockReturnValue({
      id: 'txn-123',
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
    }),
  };

  const mockQueryRequest: IGetTransactionsRequest = {
    cardId: 'card-123',
    processorId: 'processor-one',
    status: TransactionStatus.PENDING,
    page: 1,
    limit: 10,
  };

  beforeEach(async () => {
    const mockTransactionModel = {
      findAndCountAll: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionQueryService,
        {
          provide: getModelToken(Transaction),
          useValue: mockTransactionModel,
        },
      ],
    }).compile();

    service = module.get<TransactionQueryService>(TransactionQueryService);
    transactionModel = module.get(getModelToken(Transaction));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTransactions', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should return transactions with all filters applied', async () => {
      const mockResult = {
        rows: [mockTransactionRecord],
        count: 1,
      };

      transactionModel.findAndCountAll.mockResolvedValue(mockResult as any);

      const result = await service.getTransactions(mockQueryRequest);

      expect(transactionModel.findAndCountAll).toHaveBeenCalledWith({
        where: {
          cardId: 'card-123',
          processorId: 'processor-one',
          status: TransactionStatus.PENDING,
        },
        offset: 0, // (page - 1) * limit = (1 - 1) * 10 = 0
        limit: 10,
      });

      expect(result).toEqual({
        transactions: [
          {
            id: 'txn-123',
            processorId: 'processor-one',
            processorName: 'Processor One',
            transactionCorrelationId: 'corr-123',
            authorizationTransactionId: 'auth-456',
            status: TransactionStatus.PENDING,
            type: undefined,
            authAmount: 1000,
            billingAmount: 1000,
            currency: 'USD',
            billingCurrency: 'USD',
            mcc: '5411',
            cardId: 'card-123',
            userId: 'user-123',
            referenceNumber: 'ref-123',
            metadata: { merchantName: 'Test Merchant' },
            clearingTransactionId: undefined,
            createdAt: '2023-01-01T10:00:00.000Z',
            updatedAt: '2023-01-01T10:30:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      });
    });

    it('should handle query with only cardId filter', async () => {
      const cardOnlyQuery = {
        cardId: 'card-456',
        page: 1,
        limit: 5,
      } as IGetTransactionsRequest;

      const mockResult = {
        rows: [mockTransactionRecord],
        count: 1,
      };

      transactionModel.findAndCountAll.mockResolvedValue(mockResult as any);

      await service.getTransactions(cardOnlyQuery);

      expect(transactionModel.findAndCountAll).toHaveBeenCalledWith({
        where: {
          cardId: 'card-456',
        },
        offset: 0,
        limit: 5,
      });
    });

    it('should handle query with only processorId filter', async () => {
      const processorOnlyQuery = {
        processorId: 'processor-two',
        page: 2,
        limit: 15,
      } as IGetTransactionsRequest;

      const mockResult = {
        rows: [],
        count: 0,
      };

      transactionModel.findAndCountAll.mockResolvedValue(mockResult as any);

      await service.getTransactions(processorOnlyQuery);

      expect(transactionModel.findAndCountAll).toHaveBeenCalledWith({
        where: {
          processorId: 'processor-two',
        },
        offset: 15, // (page - 1) * limit = (2 - 1) * 15 = 15
        limit: 15,
      });
    });

    it('should handle query with only status filter', async () => {
      const statusOnlyQuery = {
        status: TransactionStatus.SETTLED,
        page: 1,
        limit: 20,
      } as IGetTransactionsRequest;

      const mockResult = {
        rows: [],
        count: 0,
      };

      transactionModel.findAndCountAll.mockResolvedValue(mockResult as any);

      await service.getTransactions(statusOnlyQuery);

      expect(transactionModel.findAndCountAll).toHaveBeenCalledWith({
        where: {
          status: TransactionStatus.SETTLED,
        },
        offset: 0,
        limit: 20,
      });
    });

    it('should handle query with no filters', async () => {
      const noFiltersQuery = {
        page: 3,
        limit: 25,
      } as IGetTransactionsRequest;

      const mockResult = {
        rows: [mockTransactionRecord],
        count: 1,
      };

      transactionModel.findAndCountAll.mockResolvedValue(mockResult as any);

      await service.getTransactions(noFiltersQuery);

      expect(transactionModel.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        offset: 50, // (page - 1) * limit = (3 - 1) * 25 = 50
        limit: 25,
      });
    });

    it('should handle empty result set', async () => {
      const mockResult = {
        rows: [],
        count: 0,
      };

      transactionModel.findAndCountAll.mockResolvedValue(mockResult as any);

      const result = await service.getTransactions(mockQueryRequest);

      expect(result).toEqual({
        transactions: [],
        total: 0,
        page: 1,
        limit: 10,
      });
    });

    it('should handle multiple transactions in result', async () => {
      const mockTransaction2 = {
        ...mockTransactionRecord,
        id: 'txn-456',
        cardId: 'card-456',
        createdAt: new Date('2023-01-02T10:00:00Z'),
        updatedAt: new Date('2023-01-02T10:30:00Z'),
        toJSON: jest.fn().mockReturnValue({
          ...mockTransactionRecord.toJSON(),
          id: 'txn-456',
          cardId: 'card-456',
        }),
      };

      const mockResult = {
        rows: [mockTransactionRecord, mockTransaction2],
        count: 2,
      };

      transactionModel.findAndCountAll.mockResolvedValue(mockResult as any);

      const result = await service.getTransactions(mockQueryRequest);

      expect(result.transactions).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.transactions[0].id).toBe('txn-123');
      expect(result.transactions[1].id).toBe('txn-456');
    });

    it('should correctly calculate pagination offset', async () => {
      const paginationQueries = [
        { page: 1, limit: 10, expectedOffset: 0 },
        { page: 2, limit: 10, expectedOffset: 10 },
        { page: 3, limit: 5, expectedOffset: 10 },
        { page: 5, limit: 20, expectedOffset: 80 },
      ];

      const mockResult = { rows: [], count: 0 };
      transactionModel.findAndCountAll.mockResolvedValue(mockResult as any);

      for (const { page, limit, expectedOffset } of paginationQueries) {
        await service.getTransactions({ page, limit } as IGetTransactionsRequest);

        expect(transactionModel.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            offset: expectedOffset,
            limit,
          }),
        );
      }
    });

    it('should properly format createdAt and updatedAt as ISO strings', async () => {
      const mockResult = {
        rows: [mockTransactionRecord],
        count: 1,
      };

      transactionModel.findAndCountAll.mockResolvedValue(mockResult as any);

      const result = await service.getTransactions(mockQueryRequest);

      expect(result.transactions[0].createdAt).toBe('2023-01-01T10:00:00.000Z');
      expect(result.transactions[0].updatedAt).toBe('2023-01-01T10:30:00.000Z');
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      transactionModel.findAndCountAll.mockRejectedValue(dbError);

      await expect(service.getTransactions(mockQueryRequest)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should preserve all transaction data in response', async () => {
      const complexTransaction = {
        ...mockTransactionRecord,
        metadata: {
          merchantName: 'Complex Merchant',
          location: { lat: 40.7128, lng: -74.006 },
          tags: ['online', 'recurring'],
        },
        toJSON: jest.fn().mockReturnValue({
          ...mockTransactionRecord.toJSON(),
          metadata: {
            merchantName: 'Complex Merchant',
            location: { lat: 40.7128, lng: -74.006 },
            tags: ['online', 'recurring'],
          },
        }),
      };

      const mockResult = {
        rows: [complexTransaction],
        count: 1,
      };

      transactionModel.findAndCountAll.mockResolvedValue(mockResult as any);

      const result = await service.getTransactions(mockQueryRequest);

      expect(result.transactions[0].metadata).toEqual({
        merchantName: 'Complex Merchant',
        location: { lat: 40.7128, lng: -74.006 },
        tags: ['online', 'recurring'],
      });
    });

    it('should handle combined filters correctly', async () => {
      const combinedQuery = {
        cardId: 'card-123',
        processorId: 'processor-one',
        status: TransactionStatus.SETTLED,
        page: 2,
        limit: 5,
      } as IGetTransactionsRequest;

      const mockResult = { rows: [], count: 0 };
      transactionModel.findAndCountAll.mockResolvedValue(mockResult as any);

      await service.getTransactions(combinedQuery);

      expect(transactionModel.findAndCountAll).toHaveBeenCalledWith({
        where: {
          cardId: 'card-123',
          processorId: 'processor-one',
          status: TransactionStatus.SETTLED,
        },
        offset: 5, // (2 - 1) * 5 = 5
        limit: 5,
      });
    });

    it('should return correct pagination metadata', async () => {
      const mockResult = {
        rows: [mockTransactionRecord],
        count: 100, // Large total for pagination testing
      };

      transactionModel.findAndCountAll.mockResolvedValue(mockResult as any);

      const pageQuery = {
        cardId: 'card-123',
        page: 5,
        limit: 10,
      } as IGetTransactionsRequest;

      const result = await service.getTransactions(pageQuery);

      expect(result.page).toBe(5);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(100);
      expect(result.transactions).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined filter values', async () => {
      const edgeCaseQuery = {
        cardId: undefined,
        processorId: null,
        status: undefined,
        page: 1,
        limit: 10,
      } as any;

      const mockResult = { rows: [], count: 0 };
      transactionModel.findAndCountAll.mockResolvedValue(mockResult as any);

      await service.getTransactions(edgeCaseQuery);

      expect(transactionModel.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        offset: 0,
        limit: 10,
      });
    });

    it('should handle very large page numbers', async () => {
      const largePageQuery = {
        page: 1000,
        limit: 100,
      } as IGetTransactionsRequest;

      const mockResult = { rows: [], count: 0 };
      transactionModel.findAndCountAll.mockResolvedValue(mockResult as any);

      await service.getTransactions(largePageQuery);

      expect(transactionModel.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        offset: 99900, // (1000 - 1) * 100
        limit: 100,
      });
    });
  });
});
