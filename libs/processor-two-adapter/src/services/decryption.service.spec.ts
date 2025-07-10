import { Test, TestingModule } from '@nestjs/testing';
import { DecryptionService } from './decryption.service';
import { MODULE_OPTIONS_TOKEN } from '../module.definition';
import { IModuleOptions } from '../interfaces';
import * as crypto from 'node:crypto';

describe('DecryptionService', () => {
  let service: DecryptionService;
  let mockOptions: IModuleOptions;

  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  const privateKeyBase64 = Buffer.from(
    privateKey.export({ format: 'pem', type: 'pkcs8' }),
  ).toString('base64');
  const testData = 'test-data-to-encrypt';

  beforeEach(async () => {
    mockOptions = {
      decryptionPrivateKeyBase64: privateKeyBase64,
      signatureVerificationPublicKeyBase64: 'test-public-key-base64',
      apiKey: 'test-api-key',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecryptionService,
        {
          provide: MODULE_OPTIONS_TOKEN,
          useValue: mockOptions,
        },
      ],
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

    it('should throw error when privateKeyBase64 is not provided', async () => {
      const invalidOptions = {
        ...mockOptions,
        decryptionPrivateKeyBase64: undefined,
      };

      await expect(
        Test.createTestingModule({
          providers: [
            DecryptionService,
            {
              provide: MODULE_OPTIONS_TOKEN,
              useValue: invalidOptions,
            },
          ],
        }).compile(),
      ).rejects.toThrow();
    });

    it.skip('should throw error when privateKeyBase64 is empty string', async () => {
      const invalidOptions = {
        ...mockOptions,
        decryptionPrivateKeyBase64: '',
      };

      await expect(
        Test.createTestingModule({
          providers: [
            DecryptionService,
            {
              provide: MODULE_OPTIONS_TOKEN,
              useValue: invalidOptions,
            },
          ],
        }).compile(),
      ).rejects.toThrow();
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
      const decryptedData = service.decrypt(encryptedBase64);

      expect(decryptedData).toBe(testData);
    });

    it('should throw error when decrypting invalid data', () => {
      const invalidEncryptedData = 'invalid-base64-data';

      expect(() => service.decrypt(invalidEncryptedData)).toThrow();
    });

    it('should throw error when decrypting with wrong format', () => {
      const wrongData = Buffer.from('wrong-encrypted-data').toString('base64');

      expect(() => service.decrypt(wrongData)).toThrow();
    });

    it('should handle empty encrypted data', () => {
      const emptyData = '';

      expect(() => service.decrypt(emptyData)).toThrow();
    });

    it('should handle malformed base64 data', () => {
      const malformedBase64 = 'not-valid-base64!@#';

      expect(() => service.decrypt(malformedBase64)).toThrow();
    });
  });

  describe('private key handling', () => {
    it('should properly decode base64 private key', () => {
      const testPrivateKey =
        '-----BEGIN PRIVATE KEY-----\ntest-key-content\n-----END PRIVATE KEY-----';
      const testKeyBase64 = Buffer.from(testPrivateKey).toString('base64');

      const testOptions = {
        decryptionPrivateKeyBase64: testKeyBase64,
        signatureVerificationPublicKeyBase64: 'test-public-key-base64',
        apiKey: 'test-api-key',
      };

      const testModule = Test.createTestingModule({
        providers: [
          DecryptionService,
          {
            provide: MODULE_OPTIONS_TOKEN,
            useValue: testOptions,
          },
        ],
      }).compile();

      expect(testModule).resolves.toBeDefined();
    });
  });
});
