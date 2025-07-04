import { Module } from '@nestjs/common';
import { TestProcessorAdapter } from './test-processor-adapter';

@Module({
  providers: [TestProcessorAdapter],
  exports: [TestProcessorAdapter],
})
export class TestProcessorAdapterModule {}
