import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/sequelize';
import {
  isObject,
  ITransactionDetails,
  TransactionStatus,
  TransactionType,
} from '@pemo-task/shared-types';
import { WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { EventType } from '../enums';
import { Transaction, TransactionEvent } from '../models';

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
        const existing = await this.transactionModel.findOne({
          where: {
            //* in case of authorization transaction, we check if a transaction exists with
            //* same authorizationTransactionId and same processorId
            transactionCorrelationId: data.transactionCorrelationId,
            processorId: data.processorId,
          } as WhereOptions<Transaction>,
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (existing) {
          this.logger.warn(
            `transaction with same authorizationTransactionId and processorId already exists: ${existing.processorId}:${existing.authorizationTransactionId}`,
          );
          return existing;
        }

        const transaction = await this.transactionModel.create(
          {
            ...data,
          },
          { transaction: t },
        );

        await this.transactionEventModel.create(
          {
            transactionId: transaction.id,
            eventType: EventType.AUTHORIZATION_TRANSACTION_PROCESSED,
            data: {
              status: transaction.status,
              type: TransactionType.AUTHORIZATION,
              processorId: data.processorId,
              rawData: data.metadata,
            },
          },
          { transaction: t },
        );

        // this.eventEmitter.emit(
        //   `transaction.${TransactionType.AUTHORIZATION}`,
        //   transaction.toJSON(),
        // );
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

        if (isObject(data.metadata)) {
          combinedMetadata = {
            ...pendingTransaction.metadata,
            ...data.metadata,
          };
        }

        //* update the transaction with the clearing data
        await this.transactionModel.update(
          {
            ...data,
            metadata: combinedMetadata,
          },
          {
            where: {
              id: pendingTransaction.id,
            },
            transaction: t,
          },
        );

        await this.transactionEventModel.create(
          {
            transactionId: pendingTransaction.id,
            eventType: EventType.CLEARING_TRANSACTION_PROCESSED,
            data: {
              status: data.status,
              type: TransactionType.CLEARING,
              processorId: data.processorId,
              rawData: data.metadata,
            },
          },
          { transaction: t },
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
}
