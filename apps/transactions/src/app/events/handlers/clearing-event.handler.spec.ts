/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { ClearingEventHandler } from './clearing-event.handler';
import { Card } from '../../models/card.model';
import { TransactionEvent } from '../../models/transaction-event.model';
import { Transaction } from '../../models/transaction.model';
import { getModelToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { TransactionStatus, TransactionType, TransactionEventType } from '@pemo-task/shared-types';

describe('ClearingEventHandler', () => {
  let handler: ClearingEventHandler;
  let cardModel: jest.Mocked<typeof Card>;
  let transactionEventModel: jest.Mocked<typeof TransactionEvent>;
  let sequelize: jest.Mocked<Sequelize>;
  let mockTransaction: jest.Mocked<any>;

  const mockTransactionData = {
    id: 'txn-456',
    cardId: 'card-123',
    userId: 'user-123',
    authAmount: 1000,
    clearingAmount: 1000,
    currency: 'USD',
    processorId: 'processor-one',
    status: TransactionStatus.SETTLED,
    type: TransactionType.CLEARING,
    metadata: { some: 'data' },
  } as unknown as Transaction;

  const mockCard = {
    id: 'card-uuid',
    cardId: 'card-123',
    userId: 'user-123',
    creditLimit: 10000,
    pendingBalance: 1000,
    settledBalance: 500,
    currentUtilization: 15,
    availableCredit: 8500,
    update: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    mockTransaction = {
      LOCK: { UPDATE: 'UPDATE' },
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    const mockCardModel = {
      findOne: jest.fn(),
      findOrCreate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockTransactionEventModel = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const mockSequelize = {
      transaction: jest.fn((callback) => callback(mockTransaction)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClearingEventHandler,
        {
          provide: getModelToken(Card),
          useValue: mockCardModel,
        },
        {
          provide: getModelToken(TransactionEvent),
          useValue: mockTransactionEventModel,
        },
        {
          provide: Sequelize,
          useValue: mockSequelize,
        },
      ],
    }).compile();

    handler = module.get<ClearingEventHandler>(ClearingEventHandler);
    cardModel = module.get(getModelToken(Card));
    transactionEventModel = module.get(getModelToken(TransactionEvent));
    sequelize = module.get(Sequelize);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleClearingEvent', () => {
    it('should be defined', () => {
      expect(handler).toBeDefined();
    });

    it('should handle clearing event successfully', async () => {
      const updatedCard = {
        ...mockCard,
        update: jest.fn().mockResolvedValue(mockCard),
      };

      cardModel.findOne.mockResolvedValue(updatedCard as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      await handler.handleClearingEvent(mockTransactionData);

      // Verify database transaction is used
      expect(sequelize.transaction).toHaveBeenCalledTimes(1);

      // Verify card lookup with lock
      expect(cardModel.findOne).toHaveBeenCalledWith({
        where: { cardId: 'card-123' },
        lock: mockTransaction.LOCK.UPDATE,
        transaction: mockTransaction,
      });

      // Verify card balance update
      const expectedSettledBalance = 500 + 1000; // existing + auth amount
      const expectedPendingBalance = 1000 - 1000; // existing - auth amount
      const expectedAvailableCredit = 10000 - expectedSettledBalance - expectedPendingBalance;
      const expectedUtilization = ((expectedSettledBalance + expectedPendingBalance) / 10000) * 100;

      expect(updatedCard.update).toHaveBeenCalledWith(
        {
          settledBalance: expectedSettledBalance,
          pendingBalance: expectedPendingBalance,
          availableCredit: expectedAvailableCredit,
          currentUtilization: expectedUtilization,
        },
        { transaction: mockTransaction },
      );

      // Verify event creation (clearing handled + analytics sent)
      expect(transactionEventModel.create).toHaveBeenCalledTimes(2);

      // Check clearing event
      expect(transactionEventModel.create).toHaveBeenCalledWith(
        {
          transactionId: 'txn-456',
          eventType: TransactionEventType.CLEARING_EVENT_HANDLED,
          data: {
            cardId: 'card-123',
            amount: 1000,
          },
        },
        { transaction: mockTransaction },
      );

      // Check analytics event
      expect(transactionEventModel.create).toHaveBeenCalledWith(
        {
          transactionId: 'txn-456',
          eventType: TransactionEventType.ANALYTICS_SENT,
          data: {
            transactionType: TransactionType.CLEARING,
            amount: 1000,
            currency: 'USD',
            cardId: 'card-123',
            userId: 'user-123',
            metadata: { some: 'data' },
          },
        },
        { transaction: mockTransaction },
      );
    });

    it('should handle missing card gracefully', async () => {
      cardModel.findOne.mockResolvedValue(null);
      transactionEventModel.create.mockResolvedValue({} as any);

      const loggerSpy = jest.spyOn(handler['logger'], 'warn').mockImplementation();

      await handler.handleClearingEvent(mockTransactionData as unknown as Transaction);

      expect(loggerSpy).toHaveBeenCalledWith('Card card-123 not found for clearing transaction');

      // Should still create events even if card is missing
      expect(transactionEventModel.create).toHaveBeenCalledTimes(2);

      loggerSpy.mockRestore();
    });

    it('should calculate correct balances for partial settlements', async () => {
      const partialTransaction = {
        ...mockTransactionData,
        authAmount: 500, // Partial amount of original authorization
      };

      const updatedCard = {
        ...mockCard,
        update: jest.fn().mockResolvedValue(mockCard),
      };

      cardModel.findOne.mockResolvedValue(updatedCard as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      await handler.handleClearingEvent(partialTransaction as unknown as Transaction);

      const expectedSettledBalance = 500 + 500; // existing + partial auth amount
      const expectedPendingBalance = 1000 - 500; // existing - partial auth amount
      const expectedAvailableCredit = 10000 - expectedSettledBalance - expectedPendingBalance;
      const expectedUtilization = ((expectedSettledBalance + expectedPendingBalance) / 10000) * 100;

      expect(updatedCard.update).toHaveBeenCalledWith(
        {
          settledBalance: expectedSettledBalance,
          pendingBalance: expectedPendingBalance,
          availableCredit: expectedAvailableCredit,
          currentUtilization: expectedUtilization,
        },
        { transaction: mockTransaction },
      );
    });

    it('should handle zero amounts correctly', async () => {
      const zeroTransaction = {
        ...mockTransactionData,
        authAmount: 0,
        clearingAmount: 0,
      };

      const updatedCard = {
        ...mockCard,
        update: jest.fn().mockResolvedValue(mockCard),
      };

      cardModel.findOne.mockResolvedValue(updatedCard as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      await handler.handleClearingEvent(zeroTransaction as unknown as Transaction);

      expect(updatedCard.update).not.toHaveBeenCalled();
    });

    it('should handle database transaction errors', async () => {
      const error = new Error('Database error');
      cardModel.findOne.mockRejectedValue(error);

      await expect(handler.handleClearingEvent(mockTransactionData)).rejects.toThrow(
        'Database error',
      );

      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    });

    it('should use SELECT FOR UPDATE to prevent race conditions', async () => {
      const updatedCard = {
        ...mockCard,
        update: jest.fn().mockResolvedValue(mockCard),
      };

      cardModel.findOne.mockResolvedValue(updatedCard as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      await handler.handleClearingEvent(mockTransactionData as unknown as Transaction);

      // Verify that SELECT FOR UPDATE lock was used
      expect(cardModel.findOne).toHaveBeenCalledWith({
        where: { cardId: 'card-123' },
        lock: mockTransaction.LOCK.UPDATE,
        transaction: mockTransaction,
      });
    });

    it('should create analytics event with complete transaction data', async () => {
      const complexTransaction = {
        ...mockTransactionData,
        metadata: {
          merchantName: 'Test Merchant',
          mcc: '5411',
          reference: 'ref-123',
        },
      };

      const updatedCard = {
        ...mockCard,
        update: jest.fn().mockResolvedValue(mockCard),
      };

      cardModel.findOne.mockResolvedValue(updatedCard as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      await handler.handleClearingEvent(complexTransaction as unknown as Transaction);

      expect(transactionEventModel.create).toHaveBeenCalledWith(
        {
          transactionId: 'txn-456',
          eventType: TransactionEventType.ANALYTICS_SENT,
          data: {
            transactionType: TransactionType.CLEARING,
            amount: 1000,
            currency: 'USD',
            cardId: 'card-123',
            userId: 'user-123',
            metadata: {
              merchantName: 'Test Merchant',
              mcc: '5411',
              reference: 'ref-123',
            },
          },
        },
        { transaction: mockTransaction },
      );
    });
  });

  describe('updateCardUtilization', () => {
    it('should handle large clearing amounts correctly', async () => {
      const largeTransaction = {
        ...mockTransactionData,
        authAmount: 5000,
      };

      const highBalanceCard = {
        ...mockCard,
        pendingBalance: 5000,
        settledBalance: 2000,
        update: jest.fn().mockResolvedValue(mockCard),
      };

      cardModel.findOne.mockResolvedValue(highBalanceCard as any);

      await handler['updateCardUtilization'](
        largeTransaction as unknown as Transaction,
        mockTransaction,
      );

      const expectedSettledBalance = 2000 + 5000;
      const expectedPendingBalance = 5000 - 5000;
      const expectedUtilization = ((7000 + 0) / 10000) * 100;

      expect(highBalanceCard.update).toHaveBeenCalledWith(
        expect.objectContaining({
          settledBalance: expectedSettledBalance,
          pendingBalance: expectedPendingBalance,
          currentUtilization: expectedUtilization,
        }),
        { transaction: mockTransaction },
      );
    });

    it('should handle negative pending balance edge case', async () => {
      // This could happen if clearing amount > original pending balance
      const edgeCaseTransaction = {
        ...mockTransactionData,
        authAmount: 1500, // More than current pending balance
      };

      const lowPendingCard = {
        ...mockCard,
        pendingBalance: 1000, // Less than auth amount
        update: jest.fn().mockResolvedValue(mockCard),
      };

      cardModel.findOne.mockResolvedValue(lowPendingCard as any);

      await handler['updateCardUtilization'](
        edgeCaseTransaction as unknown as Transaction,
        mockTransaction,
      );

      const expectedPendingBalance = 1000 - 1500;

      expect(lowPendingCard.update).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingBalance: expectedPendingBalance,
        }),
        { transaction: mockTransaction },
      );
    });
  });

  describe('sendAnalyticsEvent', () => {
    it('should create analytics event with all required fields', async () => {
      transactionEventModel.create.mockResolvedValue({} as any);

      await handler['sendAnalyticsEvent'](mockTransactionData, mockTransaction);

      expect(transactionEventModel.create).toHaveBeenCalledWith(
        {
          transactionId: 'txn-456',
          eventType: TransactionEventType.ANALYTICS_SENT,
          data: {
            transactionType: TransactionType.CLEARING,
            amount: 1000,
            currency: 'USD',
            cardId: 'card-123',
            userId: 'user-123',
            metadata: { some: 'data' },
          },
        },
        { transaction: mockTransaction },
      );
    });

    it('should handle missing metadata gracefully', async () => {
      const transactionWithoutMetadata = {
        ...mockTransactionData,
        metadata: undefined,
      };

      transactionEventModel.create.mockResolvedValue({} as any);

      await handler['sendAnalyticsEvent'](
        transactionWithoutMetadata as unknown as Transaction,
        mockTransaction,
      );

      expect(transactionEventModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: undefined,
          }),
        }),
        { transaction: mockTransaction },
      );
    });
  });
});
