import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { TransactionService } from '../services';
import { PENDING_CLEARING_CLEANUP_QUEUE } from '../constants';

@Processor(PENDING_CLEARING_CLEANUP_QUEUE)
export class PendingClearingCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(PendingClearingCleanupProcessor.name);

  constructor(private readonly transactionService: TransactionService) {
    super();
  }

  async process(): Promise<void> {
    this.logger.log('Starting cleanup of expired pending clearing transactions');

    try {
      const deletedCount =
        await this.transactionService.cleanupExpiredPendingClearingTransactions();

      this.logger.log(
        `Cleanup completed. Removed ${deletedCount} expired pending clearing transactions`,
      );
    } catch (error) {
      this.logger.error('Error during pending clearing transaction cleanup', error);
      throw error;
    }
  }
}
