import { Test, TestingModule } from '@nestjs/testing';
import { DecryptionService } from './decryption.service';

import * as crypto from 'node:crypto';

describe('DecryptionService', () => {
  let service: DecryptionService;

  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  const testData = 'test-data-to-encrypt';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DecryptionService],
    }).compile();

    service = module.get<DecryptionService>(DecryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('decrypt', () => {
    it('should successfully decrypt encrypted data', () => {
      const encryptedData = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(testData, 'utf8'),
      );

      const encryptedBase64 = encryptedData.toString('base64');
      const decryptedData = service.privateDecrypt({
        data: encryptedBase64,
        privateKey: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
        algorithm: 'SHA256',
      });

      expect(decryptedData).toBe(testData);
    });

    it('should throw error when decrypting invalid data', () => {
      const invalidEncryptedData = 'invalid-base64-data';

      expect(() =>
        service.privateDecrypt({
          data: invalidEncryptedData,
          privateKey: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
          algorithm: 'SHA256',
        }),
      ).toThrow();
    });

    it('should throw error when decrypting with wrong format', () => {
      const wrongData = Buffer.from('wrong-encrypted-data').toString('base64');

      expect(() =>
        service.privateDecrypt({
          data: wrongData,
          privateKey: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
          algorithm: 'SHA256',
        }),
      ).toThrow();
    });

    it('should handle empty encrypted data', () => {
      const emptyData = '';

      expect(() =>
        service.privateDecrypt({
          data: emptyData,
          privateKey: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
          algorithm: 'SHA256',
        }),
      ).toThrow();
    });

    it('should handle malformed base64 data', () => {
      const malformedBase64 = 'not-valid-base64!@#';

      expect(() =>
        service.privateDecrypt({
          data: malformedBase64,
          privateKey: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
          algorithm: 'SHA256',
        }),
      ).toThrow();
    });
  });
});
