import { Module } from '@nestjs/common';
import { TransactionsController } from './controllers';
import { TransactionsProcessingService, TransactionsQueryService } from './services';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsProcessingService, TransactionsQueryService],
})
export class TransactionsModule {}
