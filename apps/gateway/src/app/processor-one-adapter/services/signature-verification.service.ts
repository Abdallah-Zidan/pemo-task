import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

@Injectable()
export class SHA256SignatureVerificationService {
  private readonly publicKey: string;

  constructor(private readonly configService: ConfigService) {
    this.publicKey = this.configService.getOrThrow<string>('PROCESSOR_ONE_PUBLIC_KEY');
  }

  verifySignature(data: string, signature: string): boolean {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(data);
    verifier.end();
    return verifier.verify(this.publicKey, signature, 'base64');
  }
}
