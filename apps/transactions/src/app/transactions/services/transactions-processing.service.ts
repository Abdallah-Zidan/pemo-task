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
import { WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction, TransactionEvent } from '../../models';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectModel(Transaction)
    private transactionModel: typeof Transaction,
    @InjectModel(TransactionEvent)
    private transactionEventModel: typeof TransactionEvent,
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
          defaults: Transaction.createNewModel(data),
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
            `transaction to be settled is not found: ${data.processorId}:${data.transactionCorrelationId}`,
          );
          throw new Error(
            `transaction to be settled is not found: ${data.processorId}:${data.transactionCorrelationId}`,
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
}
