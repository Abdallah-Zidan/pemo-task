import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { IGetTransactionsRequest, ITransactionDetails } from '@pemo-task/shared-types';
import { Queue } from 'bullmq';
import { TRANSACTIONS_PROCESSING_QUEUE } from '../constants';
import { TransactionQueryService } from './transaction-query.service';

@Injectable()
export class TransactionsGrpcService {
  constructor(
    @InjectQueue(TRANSACTIONS_PROCESSING_QUEUE) private queue: Queue,
    private readonly transactionsQueryService: TransactionQueryService,
  ) {}

  async processTransaction(data: ITransactionDetails): Promise<{ success: boolean }> {
    await this.queue.add(
      'process-transaction',
      {
        ...data,
        metadata: data.metadata,
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
          //* this is the id of the job that will be used to deduplicate the job
          //* in all cases same correlation id for same transaction type should be the same job
          id: `${data.type}-${data.processorId}-${data.transactionCorrelationId}`,
        },
      },
    );

    return { success: true };
  }

  getTransactions(query: IGetTransactionsRequest) {
    return this.transactionsQueryService.getTransactions(query);
  }
}
