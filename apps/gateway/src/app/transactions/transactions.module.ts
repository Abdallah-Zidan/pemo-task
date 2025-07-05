import { Module } from '@nestjs/common';
import { HealthController, TransactionsController } from './controllers';
import { TransactionsProcessingService, TransactionsQueryService } from './services';
import { ProcessorAdapterManagerModule } from '@pemo-task/process-adapter-manager';
import { ProcessorOneAdapterModule } from '../processor-one-adapter/processor-one-adapter.module';

@Module({
  imports: [ProcessorAdapterManagerModule, ProcessorOneAdapterModule],
  controllers: [TransactionsController, HealthController],
  providers: [TransactionsProcessingService, TransactionsQueryService],
})
export class TransactionsModule {}
