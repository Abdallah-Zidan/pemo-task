import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Transaction, TransactionEvent, Card } from '../models';
import { TRANSACTIONS_PROCESSING_QUEUE } from './constants';
import { TransactionService, TransactionsGrpcService } from './services';
import { TransactionsJobProcessor } from './job-processors';
import { TransactionsGrpcController } from './controllers';
import { EventModule } from '../events/event.module';
import { TransactionQueryService } from './services/transaction-query.service';

@Module({
  controllers: [TransactionsGrpcController],
  imports: [
    EventModule,
    SequelizeModule.forFeature([Transaction, TransactionEvent, Card]),
    BullModule.registerQueue({
      name: TRANSACTIONS_PROCESSING_QUEUE,
    }),
    EventEmitterModule.forRoot(),
  ],
  providers: [
    TransactionService,
    TransactionsGrpcService,
    TransactionQueryService,
    TransactionsJobProcessor,
  ],
})
export class TransactionsModule {}
