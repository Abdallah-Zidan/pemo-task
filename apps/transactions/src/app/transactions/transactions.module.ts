import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Transaction, TransactionEvent, Card, PendingClearingTransaction } from '../models';
import { PENDING_CLEARING_CLEANUP_QUEUE, TRANSACTIONS_PROCESSING_QUEUE } from './constants';
import {
  TransactionService,
  TransactionsGrpcService,
  PendingClearingSchedulerService,
} from './services';
import { TransactionsJobProcessor, PendingClearingCleanupProcessor } from './job-processors';
import { TransactionsGrpcController } from './controllers';
import { EventModule } from '../events/event.module';
import { TransactionQueryService } from './services/transaction-query.service';

@Module({
  controllers: [TransactionsGrpcController],
  imports: [
    EventModule,
    SequelizeModule.forFeature([Transaction, TransactionEvent, Card, PendingClearingTransaction]),
    BullModule.registerQueue({
      name: TRANSACTIONS_PROCESSING_QUEUE,
    }),
    BullModule.registerQueue({
      name: PENDING_CLEARING_CLEANUP_QUEUE,
    }),
    EventEmitterModule.forRoot(),
  ],
  providers: [
    TransactionService,
    TransactionsGrpcService,
    TransactionQueryService,
    TransactionsJobProcessor,
    PendingClearingCleanupProcessor,
    PendingClearingSchedulerService,
  ],
})
export class TransactionsModule {}
