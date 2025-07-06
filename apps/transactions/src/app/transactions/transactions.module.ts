import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Transaction, TransactionEvent, Card } from '../models';
import { TRANSACTIONS_PROCESSING_QUEUE } from './constants';
import { TransactionService, TransactionsGrpcService } from './services';
import { TransactionsJobProcessor } from './job-processors';
import { TransactionsGrpcController } from './controllers';
import { AuthorizationEventHandler, ClearingEventHandler } from './handlers';

@Module({
  controllers: [TransactionsGrpcController],
  imports: [
    SequelizeModule.forFeature([Transaction, TransactionEvent, Card]),

    BullModule.registerQueue({
      name: TRANSACTIONS_PROCESSING_QUEUE,
    }),

    EventEmitterModule.forRoot(),
  ],
  providers: [
    TransactionService,
    TransactionsGrpcService,
    TransactionsJobProcessor,
    AuthorizationEventHandler,
    ClearingEventHandler,
  ],
})
export class TransactionsModule {}
