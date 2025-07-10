import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { IModuleOptions } from '../interfaces';
import { MODULE_OPTIONS_TOKEN } from '../module.definition';

@Injectable()
export class SHA512SignatureVerificationService {
  private readonly publicKey: string;

  constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly options: IModuleOptions) {
    this.publicKey = Buffer.from(
      this.options.signatureVerificationPublicKeyBase64,
      'base64',
    ).toString('utf8');
  }

  verifySignature(data: string, signature: string): boolean {
    const verifier = crypto.createVerify('SHA512');
    verifier.update(data);
    verifier.end();
    return verifier.verify(this.publicKey, signature, 'base64');
  }
}
