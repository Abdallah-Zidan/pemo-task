import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PENDING_CLEARING_CLEANUP_QUEUE } from '../constants';

@Injectable()
export class PendingClearingSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(PendingClearingSchedulerService.name);

  constructor(
    @InjectQueue(PENDING_CLEARING_CLEANUP_QUEUE)
    private readonly cleanupQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.scheduleCleanupJob();
  }

  private async scheduleCleanupJob() {
    try {
      const jobSchedulers = await this.cleanupQueue.getJobSchedulers();
      for (const jobScheduler of jobSchedulers) {
        if (jobScheduler.name === 'cleanup-expired-pending-clearing') {
          await this.cleanupQueue.removeJobScheduler(jobScheduler.key);
        }
      }

      await this.cleanupQueue.add(
        'cleanup-expired-pending-clearing',
        {},
        {
          repeat: {
            pattern: '0 * * * *',
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );

      this.logger.log('Scheduled cleanup job for pending clearing transactions to run every hour');
    } catch (error) {
      this.logger.error('Failed to schedule cleanup job', error);
    }
  }
}
