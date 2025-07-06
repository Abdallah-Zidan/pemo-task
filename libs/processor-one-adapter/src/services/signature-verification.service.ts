import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { IModuleOptions } from '../interfaces';
import { MODULE_OPTIONS_TOKEN } from '../module.definition';

@Injectable()
export class SHA256SignatureVerificationService {
  private readonly publicKey: string;

  constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly options: IModuleOptions) {
    if (!this.options.publicKey) {
      throw new Error(
        'Public key is required for signature verification for Processor One adapter',
      );
    }

    this.publicKey = this.options.publicKey;
  }

  verifySignature(data: string, signature: string): boolean {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(data);
    verifier.end();
    return verifier.verify(this.publicKey, signature, 'base64');
  }
}
