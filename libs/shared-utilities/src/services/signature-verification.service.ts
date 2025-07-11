import { Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';

@Injectable()
export class SignatureVerificationService {
  verifySignature({
    data,
    signature,
    publicKey,
    algorithm = 'SHA256',
  }: {
    data: string;
    signature: string;
    publicKey: string;
    algorithm?: 'SHA256' | 'SHA384' | 'SHA512';
  }): boolean {
    try {
      const verifier = crypto.createVerify(algorithm);
      verifier.update(data);
      verifier.end();
      return verifier.verify(publicKey, signature, 'base64');
    } catch {
      return false;
    }
  }
}
