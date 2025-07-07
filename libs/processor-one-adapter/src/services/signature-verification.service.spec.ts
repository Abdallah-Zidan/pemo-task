import { Test, TestingModule } from '@nestjs/testing';
import { SHA256SignatureVerificationService } from './signature-verification.service';
import * as crypto from 'node:crypto';
import { MODULE_OPTIONS_TOKEN } from '../module.definition';

jest.mock('node:crypto', () => ({
  createVerify: jest.fn(),
}));

describe('SHA256SignatureVerificationService', () => {
  let service: SHA256SignatureVerificationService;
  let mockCreateVerify: jest.MockedFunction<typeof crypto.createVerify>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SHA256SignatureVerificationService,
        {
          provide: MODULE_OPTIONS_TOKEN,
          useValue: {
            publicKeyBase64: Buffer.from('mock-public-key', 'utf8').toString('base64'),
          },
        },
      ],
    }).compile();

    service = module.get<SHA256SignatureVerificationService>(SHA256SignatureVerificationService);

    mockCreateVerify = crypto.createVerify as jest.MockedFunction<typeof crypto.createVerify>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should verify a valid signature', () => {
    const mockVerifier = {
      update: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      verify: jest.fn().mockReturnValue(true),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateVerify.mockReturnValue(mockVerifier as any);

    const result = service.verifySignature('data', 'signature');

    expect(mockCreateVerify).toHaveBeenCalledWith('SHA256');
    expect(mockVerifier.update).toHaveBeenCalledWith('data');
    expect(mockVerifier.end).toHaveBeenCalled();
    expect(mockVerifier.verify).toHaveBeenCalledWith('mock-public-key', 'signature', 'base64');
    expect(result).toBe(true);
  });

  it('should return false for an invalid signature', () => {
    const mockVerifier = {
      update: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      verify: jest.fn().mockReturnValue(false),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateVerify.mockReturnValue(mockVerifier as any);

    const result = service.verifySignature('data', 'invalid-signature');

    expect(mockCreateVerify).toHaveBeenCalledWith('SHA256');
    expect(result).toBe(false);
  });
});
