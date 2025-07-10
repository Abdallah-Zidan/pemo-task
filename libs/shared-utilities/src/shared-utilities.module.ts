import { Module } from '@nestjs/common';
import { DecryptionService, SignatureVerificationService } from './services';

@Module({
  providers: [DecryptionService, SignatureVerificationService],
  exports: [DecryptionService, SignatureVerificationService],
})
export class SharedUtilitiesModule {}
