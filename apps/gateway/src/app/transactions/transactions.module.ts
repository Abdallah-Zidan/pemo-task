import { Module } from '@nestjs/common';
import { TransactionsController } from './controllers';
import { TransactionsProcessingService, TransactionsQueryService } from './services';
import { ProcessorAdapterManagerModule } from '@pemo-task/process-adapter-manager';
import { TestProcessorAdapterModule } from '../test-processor-adapter/test-processor-adapter.module';

@Module({
  imports: [ProcessorAdapterManagerModule, TestProcessorAdapterModule],
  controllers: [TransactionsController],
  providers: [TransactionsProcessingService, TransactionsQueryService],
})
export class TransactionsModule {}
