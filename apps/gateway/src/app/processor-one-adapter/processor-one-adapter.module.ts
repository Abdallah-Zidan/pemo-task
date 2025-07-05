import { Module } from '@nestjs/common';
import { ProcessorOneAdapter } from './adapters';
import { SHA256SignatureVerificationService } from './services';

@Module({
  providers: [ProcessorOneAdapter, SHA256SignatureVerificationService],
  exports: [ProcessorOneAdapter],
})
export class ProcessorOneAdapterModule {}
