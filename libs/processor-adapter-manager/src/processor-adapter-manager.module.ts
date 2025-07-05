import { Module } from '@nestjs/common';
import { ProcessorAdapterManager } from './services';
import { DiscoveryModule } from '@nestjs/core';

@Module({
  imports: [DiscoveryModule],
  providers: [ProcessorAdapterManager],
  exports: [ProcessorAdapterManager],
})
export class ProcessorAdapterManagerModule {}
