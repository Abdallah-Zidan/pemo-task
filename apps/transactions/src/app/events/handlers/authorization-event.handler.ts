import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/sequelize';
import { Card } from '../../models/card.model';
import { TransactionEvent } from '../../models/transaction-event.model';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from '../../models';
import { Transaction as DBTransaction } from 'sequelize';
import { TransactionEventType, TransactionType } from '@pemo-task/shared-types';
import { CARD_LIMIT } from '../constants';

@Injectable()
export class AuthorizationEventHandler {
  private readonly logger = new Logger(AuthorizationEventHandler.name);

  constructor(
    @InjectModel(Card) private cardModel: typeof Card,
    @InjectModel(TransactionEvent) private transactionEventModel: typeof TransactionEvent,
    private sequelize: Sequelize,
  ) {}

  @OnEvent(`transaction.${TransactionType.AUTHORIZATION}`)
  async handleAuthorizationEvent(transaction: Transaction): Promise<void> {
    this.logger.log(`Handling authorization event for transaction ${transaction.id}`);

    await this.sequelize.transaction(async (t) => {
      await this.calculateCardUtilization(transaction, t);
      await this.notifyCardholder(transaction, t);

      await this.transactionEventModel.create(
        {
          transactionId: transaction.id,
          eventType: TransactionEventType.AUTHORIZATION_EVENT_HANDLED,
          data: {
            cardId: transaction.cardId,
            amount: transaction.authAmount,
          },
        },
        { transaction: t },
      );
    });
  }

  private async calculateCardUtilization(
    transaction: Transaction,
    dbTransaction: DBTransaction,
  ): Promise<void> {
    /**
     * ! Notes from Abd Allah
     * in order race conditions that might cause phantom reads and create duplicate cards
     * the approach is to use findOrCreate from sequelize + have unique constraint on cardId
     * that way in case of race condition, the findOrCreate will return the existing card and not create a new one
     */
    const [card, isNew] = await this.cardModel.findOrCreate({
      where: { cardId: transaction.cardId },
      defaults: {
        cardId: transaction.cardId,
        userId: transaction.userId,
        creditLimit: CARD_LIMIT,
        pendingBalance: transaction.authAmount,
        settledBalance: 0,
        currentUtilization: (transaction.authAmount / CARD_LIMIT) * 100,
        availableCredit: CARD_LIMIT - transaction.authAmount,
      },
      transaction: dbTransaction,
      //! Notes from Abd Allah
      // we need to lock the row for update to avoid lost updates in case the card exists and we are trying to update it
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (isNew) {
      this.logger.log(
        `Created new card ${card.cardId} with utilization ${card.currentUtilization}%`,
      );
    } else {
      const newPendingBalance = Number(card.pendingBalance) + transaction.authAmount;
      const newAvailableCredit = card.creditLimit - newPendingBalance;
      const newUtilization = (newPendingBalance / card.creditLimit) * 100;

      await card.update(
        {
          pendingBalance: newPendingBalance,
          availableCredit: newAvailableCredit,
          currentUtilization: newUtilization,
        },
        { transaction: dbTransaction },
      );

      this.logger.log(`Updated card ${card.cardId} utilization to ${newUtilization}%`);
    }

    /**
     * ! Notes from Abd Allah
     * Check for credit limit violations
     * we might block the card or apply any action here
     */
    if (card.currentUtilization > 100) {
      this.logger.error(
        `Card ${card.cardId} has exceeded the credit limit. Current utilization: ${card.currentUtilization}%`,
      );
    }
  }

  private async notifyCardholder(
    transaction: Transaction,
    dbTransaction: DBTransaction,
  ): Promise<void> {
    this.logger.log(
      `Notifying cardholder ${transaction.userId} about authorization on card ${transaction.cardId}`,
    );

    await this.transactionEventModel.create(
      {
        transactionId: transaction.id,
        eventType: TransactionEventType.CARDHOLDER_NOTIFIED,
        data: {
          userId: transaction.userId,
          notificationType: TransactionType.AUTHORIZATION,
          amount: transaction.authAmount,
          currency: transaction.currency,
        },
      },
      { transaction: dbTransaction },
    );
  }
}
