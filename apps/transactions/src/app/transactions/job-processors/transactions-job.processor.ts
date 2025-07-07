import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ITransactionDetails, TransactionType } from '@pemo-task/shared-types';
import { Job } from 'bullmq';
import { TRANSACTIONS_PROCESSING_QUEUE } from '../constants';
import { TransactionService } from '../services';

@Processor(TRANSACTIONS_PROCESSING_QUEUE)
export class TransactionsJobProcessor extends WorkerHost {
  private readonly logger = new Logger(TransactionsJobProcessor.name);

  constructor(private readonly transactionService: TransactionService) {
    super();
  }

  async process(job: Job<ITransactionDetails>) {
    this.logger.log(`Processing transaction job ${job.id} with name: ${job.name}`);

    const { data } = job;

    if (data.type === TransactionType.AUTHORIZATION) {
      this.logger.log('Processing authorization transaction');
      await this.transactionService.processAuthorizationTransaction(job.data);
    } else {
      this.logger.log('Processing clearing transaction');
      await this.transactionService.processClearingTransaction(job.data);
    }
    return true;
  }
}
