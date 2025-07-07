import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { IModuleOptions } from '../interfaces';
import { MODULE_OPTIONS_TOKEN } from '../module.definition';

@Injectable()
export class SHA256SignatureVerificationService {
  private readonly publicKey: string;

  constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly options: IModuleOptions) {
    if (!this.options.publicKeyBase64) {
      throw new Error(
        'Public key is required for signature verification for Processor One adapter',
      );
    }

    this.publicKey = Buffer.from(this.options.publicKeyBase64, 'base64').toString('utf8');
  }

  verifySignature(data: string, signature: string): boolean {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(data);
    verifier.end();
    return verifier.verify(this.publicKey, signature, 'base64');
  }
}
