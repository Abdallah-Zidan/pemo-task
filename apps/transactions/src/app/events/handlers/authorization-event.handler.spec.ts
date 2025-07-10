/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationEventHandler } from './authorization-event.handler';
import { Card } from '../../models/card.model';
import { TransactionEvent } from '../../models/transaction-event.model';
import { Transaction } from '../../models/transaction.model';
import { getModelToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { TransactionStatus, TransactionType, TransactionEventType } from '@pemo-task/shared-types';
import { CARD_LIMIT } from '../constants';

describe('AuthorizationEventHandler', () => {
  let handler: AuthorizationEventHandler;
  let cardModel: jest.Mocked<typeof Card>;
  let transactionEventModel: jest.Mocked<typeof TransactionEvent>;
  let sequelize: jest.Mocked<Sequelize>;
  let mockTransaction: jest.Mocked<any>;

  const mockTransactionData = {
    id: 'txn-123',
    cardId: 'card-123',
    userId: 'user-123',
    authAmount: 1000,
    currency: 'USD',
    processorId: 'processor-one',
    status: TransactionStatus.PENDING,
    type: TransactionType.AUTHORIZATION,
  } as unknown as Transaction;

  const mockCard = {
    id: 'card-uuid',
    cardId: 'card-123',
    userId: 'user-123',
    creditLimit: CARD_LIMIT,
    pendingBalance: 500,
    settledBalance: 0,
    currentUtilization: 5,
    availableCredit: 9500,
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

    const mockSequelize = {
      transaction: jest.fn((callback) => callback(mockTransaction)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationEventHandler,
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

    handler = module.get<AuthorizationEventHandler>(AuthorizationEventHandler);
    cardModel = module.get(getModelToken(Card));
    transactionEventModel = module.get(getModelToken(TransactionEvent));
    sequelize = module.get(Sequelize);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleAuthorizationEvent', () => {
    it('should be defined', () => {
      expect(handler).toBeDefined();
    });

    it('should handle authorization event successfully', async () => {
      // Mock findOrCreate for new card
      cardModel.findOrCreate.mockResolvedValue([mockCard, true] as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      await handler.handleAuthorizationEvent(mockTransactionData);

      // Verify database transaction is used
      expect(sequelize.transaction).toHaveBeenCalledTimes(1);

      // Verify card creation
      expect(cardModel.findOrCreate).toHaveBeenCalledWith({
        where: { cardId: 'card-123' },
        defaults: {
          cardId: 'card-123',
          userId: 'user-123',
          creditLimit: CARD_LIMIT,
          pendingBalance: 1000,
          settledBalance: 0,
          currentUtilization: (1000 / CARD_LIMIT) * 100,
          availableCredit: CARD_LIMIT - 1000,
        },
        transaction: mockTransaction,
        lock: mockTransaction.LOCK.UPDATE,
      });

      // Verify event creation (authorization handled + cardholder notified)
      expect(transactionEventModel.create).toHaveBeenCalledTimes(2);

      // Check authorization event
      expect(transactionEventModel.create).toHaveBeenCalledWith(
        {
          transactionId: 'txn-123',
          eventType: TransactionEventType.AUTHORIZATION_EVENT_HANDLED,
          data: {
            cardId: 'card-123',
            amount: 1000,
          },
        },
        { transaction: mockTransaction },
      );

      // Check cardholder notification event
      expect(transactionEventModel.create).toHaveBeenCalledWith(
        {
          transactionId: 'txn-123',
          eventType: TransactionEventType.CARDHOLDER_NOTIFIED,
          data: {
            userId: 'user-123',
            notificationType: TransactionType.AUTHORIZATION,
            amount: 1000,
            currency: 'USD',
          },
        },
        { transaction: mockTransaction },
      );
    });

    it('should create new card when card does not exist', async () => {
      const newCard = { ...mockCard, pendingBalance: 1000, currentUtilization: 10 };
      cardModel.findOrCreate.mockResolvedValue([newCard, true] as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      await handler.handleAuthorizationEvent(mockTransactionData);

      expect(cardModel.findOrCreate).toHaveBeenCalledWith({
        where: { cardId: 'card-123' },
        defaults: expect.objectContaining({
          pendingBalance: 1000,
          currentUtilization: 10,
          availableCredit: CARD_LIMIT - 1000,
        }),
        transaction: mockTransaction,
        lock: mockTransaction.LOCK.UPDATE,
      });

      // Should not call update since it's a new card
      expect(mockCard.update).not.toHaveBeenCalled();
    });

    it('should update existing card balance when card exists', async () => {
      const existingCard = {
        ...mockCard,
        pendingBalance: 500,
        currentUtilization: 5,
        update: jest.fn().mockResolvedValue(mockCard),
      };

      cardModel.findOrCreate.mockResolvedValue([existingCard, false] as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      await handler.handleAuthorizationEvent(mockTransactionData);

      // Verify card balance update
      const expectedNewPendingBalance = 500 + 1000; // existing + auth amount
      const expectedNewAvailableCredit = CARD_LIMIT - expectedNewPendingBalance;
      const expectedNewUtilization = (expectedNewPendingBalance / CARD_LIMIT) * 100;

      expect(existingCard.update).toHaveBeenCalledWith(
        {
          pendingBalance: expectedNewPendingBalance,
          availableCredit: expectedNewAvailableCredit,
          currentUtilization: expectedNewUtilization,
        },
        { transaction: mockTransaction },
      );
    });

    it('should log error when card utilization exceeds 100%', async () => {
      const overLimitCard = {
        ...mockCard,
        pendingBalance: 9500, // High existing balance
        currentUtilization: 105, // Over limit after update
        update: jest.fn().mockResolvedValue({ ...mockCard, currentUtilization: 105 }),
      };

      cardModel.findOrCreate.mockResolvedValue([overLimitCard, false] as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      const loggerSpy = jest.spyOn(handler['logger'], 'error').mockImplementation();

      await handler.handleAuthorizationEvent(mockTransactionData);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Card card-123 has exceeded the credit limit'),
      );

      loggerSpy.mockRestore();
    });

    it('should handle different transaction amounts correctly', async () => {
      const smallAmountTransaction = { ...mockTransactionData, authAmount: 50 };
      const newCard = { ...mockCard };

      cardModel.findOrCreate.mockResolvedValue([newCard, true] as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      await handler.handleAuthorizationEvent(smallAmountTransaction as unknown as Transaction);

      expect(cardModel.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          defaults: expect.objectContaining({
            pendingBalance: 50,
            currentUtilization: (50 / CARD_LIMIT) * 100,
            availableCredit: CARD_LIMIT - 50,
          }),
        }),
      );
    });

    it('should handle database transaction errors', async () => {
      const error = new Error('Database error');
      cardModel.findOrCreate.mockRejectedValue(error);

      await expect(handler.handleAuthorizationEvent(mockTransactionData)).rejects.toThrow(
        'Database error',
      );

      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent card creation with SELECT FOR UPDATE', async () => {
      const existingCard = {
        ...mockCard,
        update: jest.fn().mockResolvedValue(mockCard),
      };

      // Simulate findOrCreate returning existing card (another process created it)
      cardModel.findOrCreate.mockResolvedValue([existingCard, false] as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      await handler.handleAuthorizationEvent(mockTransactionData);

      // Verify that SELECT FOR UPDATE lock was used
      expect(cardModel.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          lock: mockTransaction.LOCK.UPDATE,
        }),
      );

      // Should update the existing card
      expect(existingCard.update).toHaveBeenCalled();
    });

    it('should create proper event data for cardholder notification', async () => {
      cardModel.findOrCreate.mockResolvedValue([mockCard, true] as any);
      transactionEventModel.create.mockResolvedValue({} as any);

      await handler.handleAuthorizationEvent(mockTransactionData);

      expect(transactionEventModel.create).toHaveBeenCalledWith(
        {
          transactionId: 'txn-123',
          eventType: TransactionEventType.CARDHOLDER_NOTIFIED,
          data: {
            userId: 'user-123',
            notificationType: TransactionType.AUTHORIZATION,
            amount: 1000,
            currency: 'USD',
          },
        },
        { transaction: mockTransaction },
      );
    });
  });

  describe('calculateCardUtilization', () => {
    it('should calculate utilization correctly for new cards', async () => {
      const authAmount = 2500;
      const expectedUtilization = (authAmount / CARD_LIMIT) * 100;

      cardModel.findOrCreate.mockResolvedValue([
        { ...mockCard, pendingBalance: authAmount, currentUtilization: expectedUtilization },
        true,
      ] as any);

      const transaction = { ...mockTransactionData, authAmount };
      await handler['calculateCardUtilization'](
        transaction as unknown as Transaction,
        mockTransaction,
      );

      expect(cardModel.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          defaults: expect.objectContaining({
            currentUtilization: expectedUtilization,
          }),
        }),
      );
    });

    it('should handle zero authorization amounts', async () => {
      const zeroTransaction = { ...mockTransactionData, authAmount: 0 };

      cardModel.findOrCreate.mockResolvedValue([
        { ...mockCard, pendingBalance: 0, currentUtilization: 0 },
        true,
      ] as any);

      await handler['calculateCardUtilization'](
        zeroTransaction as unknown as Transaction,
        mockTransaction,
      );

      expect(cardModel.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          defaults: expect.objectContaining({
            pendingBalance: 0,
            currentUtilization: 0,
            availableCredit: CARD_LIMIT,
          }),
        }),
      );
    });
  });
});
