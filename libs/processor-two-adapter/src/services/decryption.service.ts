import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { IModuleOptions } from '../interfaces';
import { MODULE_OPTIONS_TOKEN } from '../module.definition';

@Injectable()
export class DecryptionService {
  private readonly privateKey: string;

  constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly options: IModuleOptions) {
    if (!this.options.privateKeyBase64) {
      throw new Error('Private key is required for decryption for Processor Two adapter');
    }

    this.privateKey = Buffer.from(this.options.privateKeyBase64, 'base64').toString('utf8');
  }

  decrypt(data: string): string {
    const encrypted = Buffer.from(data, 'base64');
    const decrypted = crypto.privateDecrypt(
      {
        key: this.privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      encrypted,
    );

    return decrypted.toString('utf8');
  }
}
