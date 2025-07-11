import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/sequelize';
import {
  isObject,
  ITransactionDetails,
  TransactionEventType,
  TransactionStatus,
  TransactionType,
} from '@pemo-task/shared-types';
import { Op, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction, TransactionEvent, PendingClearingTransaction } from '../../models';
import { Transaction as SequelizeTransaction } from 'sequelize';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectModel(Transaction)
    private transactionModel: typeof Transaction,
    @InjectModel(TransactionEvent)
    private transactionEventModel: typeof TransactionEvent,
    @InjectModel(PendingClearingTransaction)
    private pendingClearingTransactionModel: typeof PendingClearingTransaction,
    private sequelize: Sequelize,
    private eventEmitter: EventEmitter2,
  ) {}

  async processAuthorizationTransaction(data: ITransactionDetails) {
    return this.sequelize.transaction(async (t) => {
      try {
        const [transaction, isNew] = await this.transactionModel.findOrCreate({
          where: {
            transactionCorrelationId: data.transactionCorrelationId,
            processorId: data.processorId,
          } as WhereOptions<Transaction>,
          defaults: {
            processorId: data.processorId,
            processorName: data.processorName,
            transactionCorrelationId: data.transactionCorrelationId,
            authorizationTransactionId: data.authorizationTransactionId,
            status: data.status,
            type: TransactionType.AUTHORIZATION,
            authAmount: data.billingAmount,
            currency: data.billingCurrency,
            mcc: data.mcc,
            cardId: data.cardId,
            userId: data.userId,
            referenceNumber: data.referenceNumber,
            metadata: data.metadata,
          },
          transaction: t,
        });

        if (!isNew) {
          this.logger.warn(
            `transaction with same authorizationTransactionId and processorId already exists: ${transaction.processorId}:${transaction.authorizationTransactionId}`,
          );
          return;
        }

        await this.transactionEventModel.create(
          {
            transactionId: transaction.id,
            eventType: TransactionEventType.AUTHORIZATION_TRANSACTION_PROCESSED,
            data: {
              status: transaction.status,
              type: TransactionType.AUTHORIZATION,
              processorId: data.processorId,
              rawData: data.metadata,
            },
          },
          { transaction: t },
        );

        this.eventEmitter.emit(
          `transaction.${TransactionType.AUTHORIZATION}`,
          transaction.toJSON(),
        );

        //! Check for any pending clearing transactions for this authorization
        setImmediate(async () => {
          try {
            await this.processPendingClearingTransactions(
              data.transactionCorrelationId,
              data.processorId,
            );
          } catch (error) {
            this.logger.error(
              `Error processing pending clearing transactions for ${data.processorId}:${data.transactionCorrelationId}`,
              error,
            );
          }
        });
      } catch (error) {
        if (error instanceof Error) {
          this.logger.error(`Error processing transaction: ${error.message}`, error.stack);
        } else {
          this.logger.error(`Error processing transaction: ${error}`);
        }
        throw error;
      }
    });
  }

  async processClearingTransaction(data: ITransactionDetails) {
    return this.sequelize.transaction(async (t) => {
      try {
        const pendingTransaction = await this.transactionModel.findOne({
          where: {
            transactionCorrelationId: data.transactionCorrelationId,
            processorId: data.processorId,
          } as WhereOptions<Transaction>,
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!pendingTransaction) {
          this.logger.warn(
            `Authorization transaction not found, storing clearing transaction for later processing: ${data.processorId}:${data.transactionCorrelationId}`,
          );

          //* Store the clearing transaction for processing when authorization arrives
          await this.storePendingClearingTransaction(data, t);
          return;
        }

        if (pendingTransaction.status === TransactionStatus.SETTLED) {
          this.logger.warn(
            `transaction to be settled is already settled: ${data.processorId}:${data.transactionCorrelationId}`,
          );
          return;
        }

        let combinedMetadata = pendingTransaction.metadata;

        if (isObject(data.metadata) && isObject(pendingTransaction.metadata)) {
          combinedMetadata = {
            ...pendingTransaction.metadata,
            ...data.metadata,
          };
        }

        const updatedTransaction = await pendingTransaction.update(
          {
            clearingAmount: data.billingAmount,
            clearingTransactionId: data.clearingTransactionId,
            status: data.status,
            metadata: combinedMetadata,
            type: TransactionType.CLEARING,
          },
          {
            transaction: t,
          },
        );

        await this.transactionEventModel.create(
          {
            transactionId: pendingTransaction.id,
            eventType: TransactionEventType.CLEARING_TRANSACTION_PROCESSED,
            data: {
              status: data.status,
              type: TransactionType.CLEARING,
              processorId: data.processorId,
              rawData: data.metadata,
            },
          },
          { transaction: t },
        );

        if (updatedTransaction) {
          this.eventEmitter.emit(
            `transaction.${TransactionType.CLEARING}`,
            updatedTransaction.toJSON(),
          );
        }
      } catch (error) {
        if (error instanceof Error) {
          this.logger.error(`Error processing transaction: ${error.message}`, error.stack);
        } else {
          this.logger.error(`Error processing transaction: ${error}`);
        }
        throw error;
      }
    });
  }

  private async storePendingClearingTransaction(
    data: ITransactionDetails,
    transaction?: SequelizeTransaction,
  ) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); //! Expire after 24 hours

    await this.pendingClearingTransactionModel.findOrCreate({
      where: {
        transactionCorrelationId: data.transactionCorrelationId,
        processorId: data.processorId,
      },
      defaults: {
        processorId: data.processorId,
        transactionCorrelationId: data.transactionCorrelationId,
        transactionData: data,
        retryCount: 0,
        expiresAt,
      },
      transaction,
    });

    this.logger.log(
      `Stored pending clearing transaction: ${data.processorId}:${data.transactionCorrelationId}`,
    );
  }

  async processPendingClearingTransactions(transactionCorrelationId: string, processorId: string) {
    return this.sequelize.transaction(async (t) => {
      const pendingClearing = await this.pendingClearingTransactionModel.findOne({
        where: {
          transactionCorrelationId,
          processorId,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!pendingClearing) {
        return;
      }

      try {
        this.logger.log(
          `Processing pending clearing transaction: ${processorId}:${transactionCorrelationId}`,
        );

        //! Process the clearing transaction directly now that authorization exists
        await this.processClearingTransactionDirectly(pendingClearing.transactionData, t);

        await pendingClearing.destroy({ transaction: t });

        this.logger.log(
          `Successfully processed and removed pending clearing transaction: ${processorId}:${transactionCorrelationId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process pending clearing transaction: ${processorId}:${transactionCorrelationId}`,
          error,
        );

        await pendingClearing.update(
          {
            retryCount: pendingClearing.retryCount + 1,
            lastRetryAt: new Date(),
          },
          { transaction: t },
        );

        throw error;
      }
    });
  }

  async cleanupExpiredPendingClearingTransactions() {
    const deletedCount = await this.pendingClearingTransactionModel.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });

    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${deletedCount} expired pending clearing transactions`);
    }

    return deletedCount;
  }

  private async processClearingTransactionDirectly(
    data: ITransactionDetails,
    t: SequelizeTransaction,
  ) {
    const pendingTransaction = await this.transactionModel.findOne({
      where: {
        transactionCorrelationId: data.transactionCorrelationId,
        processorId: data.processorId,
      } as WhereOptions<Transaction>,
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!pendingTransaction) {
      throw new Error(
        `Authorization transaction not found for clearing: ${data.processorId}:${data.transactionCorrelationId}`,
      );
    }

    if (pendingTransaction.status === TransactionStatus.SETTLED) {
      this.logger.warn(
        `transaction to be settled is already settled: ${data.processorId}:${data.transactionCorrelationId}`,
      );
      return;
    }

    let combinedMetadata = pendingTransaction.metadata;

    if (isObject(data.metadata) && isObject(pendingTransaction.metadata)) {
      combinedMetadata = {
        ...pendingTransaction.metadata,
        ...data.metadata,
      };
    }

    const updatedTransaction = await pendingTransaction.update(
      {
        clearingAmount: data.billingAmount,
        clearingTransactionId: data.clearingTransactionId,
        status: data.status,
        metadata: combinedMetadata,
        type: TransactionType.CLEARING,
      },
      {
        transaction: t,
      },
    );

    await this.transactionEventModel.create(
      {
        transactionId: pendingTransaction.id,
        eventType: TransactionEventType.CLEARING_TRANSACTION_PROCESSED,
        data: {
          status: data.status,
          type: TransactionType.CLEARING,
          processorId: data.processorId,
          rawData: data.metadata,
        },
      },
      { transaction: t },
    );

    if (updatedTransaction) {
      this.eventEmitter.emit(
        `transaction.${TransactionType.CLEARING}`,
        updatedTransaction.toJSON(),
      );
    }
  }
}
