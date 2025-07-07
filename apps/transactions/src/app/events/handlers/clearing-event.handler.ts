import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/sequelize';
import { Card } from '../../models/card.model';
import { TransactionEvent } from '../../models/transaction-event.model';
import { Transaction } from '../../models/transaction.model';
import { Sequelize } from 'sequelize-typescript';
import { TransactionEventType, TransactionType } from '@pemo-task/shared-types';
import { Transaction as DBTransaction } from 'sequelize';

@Injectable()
export class ClearingEventHandler {
  private readonly logger = new Logger(ClearingEventHandler.name);

  constructor(
    @InjectModel(Card) private cardModel: typeof Card,
    @InjectModel(TransactionEvent) private transactionEventModel: typeof TransactionEvent,
    private sequelize: Sequelize,
  ) {}

  @OnEvent(`transaction.${TransactionType.CLEARING}`)
  async handleClearingEvent(transaction: Transaction): Promise<void> {
    this.logger.log(`Handling clearing event for transaction ${transaction.id}`);

    await this.sequelize.transaction(async (t) => {
      await this.updateCardUtilization(transaction, t);

      await this.sendAnalyticsEvent(transaction, t);

      await this.transactionEventModel.create(
        {
          transactionId: transaction.id,
          eventType: TransactionEventType.CLEARING_EVENT_HANDLED,
          eventData: {
            cardId: transaction.cardId,
            amount: transaction.clearingAmount,
          },
        },
        { transaction: t },
      );
    });
  }

  private async updateCardUtilization(
    transaction: Transaction,
    dbTransaction: DBTransaction,
  ): Promise<void> {
    const card = await this.cardModel.findOne({
      where: { cardId: transaction.cardId },
      lock: dbTransaction.LOCK.UPDATE,
      transaction: dbTransaction,
    });

    if (card && transaction.clearingAmount) {
      const newSettledBalance = card.settledBalance + transaction.clearingAmount;
      const newPendingAmount = card.pendingBalance - transaction.authAmount;
      const newUtilization = ((newSettledBalance + newPendingAmount) / card.creditLimit) * 100;

      await card.update(
        {
          settledBalance: newSettledBalance,
          pendingBalance: newPendingAmount,
          currentUtilization: newUtilization,
        },
        { transaction: dbTransaction },
      );

      this.logger.log(
        `Card ${card.cardId} utilization updated to ${newUtilization} after clearing`,
      );
    } else {
      this.logger.warn(`Card ${transaction.cardId} not found for clearing transaction`);
      //! we might need to handle this case
    }
  }

  private async sendAnalyticsEvent(
    transaction: Transaction,
    dbTransaction: DBTransaction,
  ): Promise<void> {
    this.logger.log(`Sending analytics for cleared transaction ${transaction.id}`);

    await this.transactionEventModel.create(
      {
        transactionId: transaction.id,
        eventType: TransactionEventType.ANALYTICS_SENT,
        eventData: {
          transactionType: TransactionType.CLEARING,
          amount: transaction.clearingAmount,
          currency: transaction.currency,
          cardId: transaction.cardId,
          userId: transaction.userId,
          metadata: transaction.metadata,
        },
      },
      { transaction: dbTransaction },
    );
  }
}
