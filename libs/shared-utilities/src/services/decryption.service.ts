import { Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';

@Injectable()
export class DecryptionService {
  privateDecrypt({
    data,
    privateKey,
    algorithm = 'SHA256',
  }: {
    data: string;
    privateKey: string;
    algorithm?: 'SHA256' | 'SHA384' | 'SHA512';
  }): string {
    const encrypted = Buffer.from(data, 'base64');
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: algorithm,
      },
      encrypted,
    );

    return decrypted.toString('utf8');
  }
}
