import { Test, TestingModule } from '@nestjs/testing';
import { SignatureVerificationService } from './signature-verification.service';
import * as crypto from 'node:crypto';

describe('SignatureVerificationService', () => {
  let service: SignatureVerificationService;
  let publicKey: string;
  let privateKey: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignatureVerificationService],
    }).compile();

    service = module.get<SignatureVerificationService>(SignatureVerificationService);

    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    publicKey = keyPair.publicKey;
    privateKey = keyPair.privateKey;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifySignature', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should successfully verify a valid signature with SHA256 (default)', () => {
      const data = 'test-data-to-sign';

      // Create a signature using the private key
      const signer = crypto.createSign('SHA256');
      signer.update(data);
      signer.end();
      const signature = signer.sign(privateKey, 'base64');

      const result = service.verifySignature({
        data,
        signature,
        publicKey,
      });

      expect(result).toBe(true);
    });

    it('should successfully verify a valid signature with SHA384', () => {
      const data = 'test-data-to-sign';

      const signer = crypto.createSign('SHA384');
      signer.update(data);
      signer.end();
      const signature = signer.sign(privateKey, 'base64');

      const result = service.verifySignature({
        data,
        signature,
        publicKey,
        algorithm: 'SHA384',
      });

      expect(result).toBe(true);
    });

    it('should successfully verify a valid signature with SHA512', () => {
      const data = 'test-data-to-sign';

      const signer = crypto.createSign('SHA512');
      signer.update(data);
      signer.end();
      const signature = signer.sign(privateKey, 'base64');

      const result = service.verifySignature({
        data,
        signature,
        publicKey,
        algorithm: 'SHA512',
      });

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const data = 'test-data-to-sign';
      const invalidSignature = 'invalid-signature';

      const result = service.verifySignature({
        data,
        signature: invalidSignature,
        publicKey,
      });

      expect(result).toBe(false);
    });

    it('should return false when data does not match signature', () => {
      const originalData = 'original-data';
      const differentData = 'different-data';

      const signer = crypto.createSign('SHA256');
      signer.update(originalData);
      signer.end();
      const signature = signer.sign(privateKey, 'base64');

      const result = service.verifySignature({
        data: differentData,
        signature,
        publicKey,
      });

      expect(result).toBe(false);
    });

    it('should return false with invalid public key', () => {
      const data = 'test-data-to-sign';
      const invalidPublicKey = 'invalid-public-key';

      const signer = crypto.createSign('SHA256');
      signer.update(data);
      signer.end();
      const signature = signer.sign(privateKey, 'base64');

      const result = service.verifySignature({
        data,
        signature,
        publicKey: invalidPublicKey,
      });

      expect(result).toBe(false);
    });

    it('should handle complex data structures in signature payload', () => {
      const complexData = 'id123|AUTHORIZATION|user456|card789|100.50|USD|0000';

      const signer = crypto.createSign('SHA256');
      signer.update(complexData);
      signer.end();
      const signature = signer.sign(privateKey, 'base64');

      const result = service.verifySignature({
        data: complexData,
        signature,
        publicKey,
      });

      expect(result).toBe(true);
    });

    it('should work with empty string data', () => {
      const data = '';

      const signer = crypto.createSign('SHA256');
      signer.update(data);
      signer.end();
      const signature = signer.sign(privateKey, 'base64');

      const result = service.verifySignature({
        data,
        signature,
        publicKey,
      });

      expect(result).toBe(true);
    });

    it('should return false when signature is empty', () => {
      const data = 'test-data';

      const result = service.verifySignature({
        data,
        signature: '',
        publicKey,
      });

      expect(result).toBe(false);
    });

    it('should return false when public key is empty', () => {
      const data = 'test-data';

      const signer = crypto.createSign('SHA256');
      signer.update(data);
      signer.end();
      const signature = signer.sign(privateKey, 'base64');

      const result = service.verifySignature({
        data,
        signature,
        publicKey: '',
      });

      expect(result).toBe(false);
    });
  });
});
