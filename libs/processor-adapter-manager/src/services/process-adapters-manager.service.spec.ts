/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { NotImplementedException } from '@nestjs/common';
import { ProcessorAdapterManager } from './process-adapters-manager.service';
import { PROCESSOR_ADAPTER_METADATA } from '../constants';
import { IProcessorAdapter } from '../interfaces';

describe('ProcessorAdapterManager', () => {
  let service: ProcessorAdapterManager;
  let discoveryService: jest.Mocked<DiscoveryService>;
  let reflector: jest.Mocked<Reflector>;

  const mockProcessorAdapter: IProcessorAdapter = {
    validateAndParseTransaction: jest.fn(),
    authorizeTransaction: jest.fn(),
  };

  const mockProcessorAdapterIncomplete = {
    validateAndParseTransaction: jest.fn(),
    //* Missing authorizeTransaction method
  };

  const mockProcessorAdapterInvalid = {
    validateAndParseTransaction: 'not a function',
    authorizeTransaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessorAdapterManager,
        {
          provide: DiscoveryService,
          useValue: {
            getProviders: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProcessorAdapterManager>(ProcessorAdapterManager);
    discoveryService = module.get(DiscoveryService);
    reflector = module.get(Reflector);

    jest.spyOn(service['logger'], 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should discover and register processor adapters', async () => {
      const mockProviders = [
        {
          instance: mockProcessorAdapter,
          metatype: class MockAdapter {},
        },
        {
          instance: null,
          metatype: null,
        },
      ];

      discoveryService.getProviders.mockReturnValue(mockProviders as any);
      reflector.get.mockReturnValueOnce('test-processor');

      await service.onModuleInit();

      expect(discoveryService.getProviders).toHaveBeenCalledTimes(1);
      expect(reflector.get).toHaveBeenCalledWith(
        PROCESSOR_ADAPTER_METADATA,
        mockProviders[0].metatype,
      );
      expect(service.getProcessorAdapter('test-processor')).toBe(mockProcessorAdapter);
      expect(service['logger'].log).toHaveBeenCalledWith(
        'registered processor adapter for: %s',
        'test-processor',
      );
    });

    it('should skip providers without instance or metatype', async () => {
      const mockProviders = [
        { instance: null, metatype: null },
        { instance: mockProcessorAdapter, metatype: null },
        { instance: null, metatype: class MockAdapter {} },
      ];

      discoveryService.getProviders.mockReturnValue(mockProviders as any);

      await service.onModuleInit();

      expect(reflector.get).not.toHaveBeenCalled();
      expect(service.getProcessorIds()).toEqual([]);
    });

    it('should skip providers without processor adapter metadata', async () => {
      const mockProviders = [
        {
          instance: mockProcessorAdapter,
          metatype: class MockAdapter {},
        },
      ];

      discoveryService.getProviders.mockReturnValue(mockProviders as any);
      reflector.get.mockReturnValue(undefined);

      await service.onModuleInit();

      expect(service.getProcessorIds()).toEqual([]);
    });

    it('should throw error for invalid processor adapter', async () => {
      const mockProviders = [
        {
          instance: mockProcessorAdapterIncomplete,
          metatype: class MockAdapter {},
        },
      ];

      discoveryService.getProviders.mockReturnValue(mockProviders as any);
      reflector.get.mockReturnValue('invalid-processor');

      await expect(service.onModuleInit()).rejects.toThrow(
        'Processor adapter for invalid-processor must implement authorizeTransaction() method',
      );
    });
  });

  describe('getProcessorAdapter', () => {
    beforeEach(async () => {
      const mockProviders = [
        {
          instance: mockProcessorAdapter,
          metatype: class MockAdapter {},
        },
      ];

      discoveryService.getProviders.mockReturnValue(mockProviders as any);
      reflector.get.mockReturnValue('test-processor');
      await service.onModuleInit();
    });

    it('should return processor adapter for valid processor id', () => {
      const result = service.getProcessorAdapter('test-processor');
      expect(result).toBe(mockProcessorAdapter);
    });

    it('should return undefined for invalid processor id', () => {
      const result = service.getProcessorAdapter('invalid-processor');
      expect(result).toBeUndefined();
    });
  });

  describe('getProcessorAdapterOrThrow', () => {
    beforeEach(async () => {
      const mockProviders = [
        {
          instance: mockProcessorAdapter,
          metatype: class MockAdapter {},
        },
      ];

      discoveryService.getProviders.mockReturnValue(mockProviders as any);
      reflector.get.mockReturnValue('test-processor');
      await service.onModuleInit();
    });

    it('should return processor adapter for valid processor id', () => {
      const result = service.getProcessorAdapterOrThrow('test-processor');
      expect(result).toBe(mockProcessorAdapter);
    });

    it('should throw NotImplementedException for invalid processor id', () => {
      expect(() => service.getProcessorAdapterOrThrow('invalid-processor')).toThrow(
        new NotImplementedException('Processor adapter for invalid-processor not found'),
      );
    });
  });

  describe('getProcessorIds', () => {
    it('should return empty array when no processors are registered', () => {
      const result = service.getProcessorIds();
      expect(result).toEqual([]);
    });

    it('should return array of processor ids', async () => {
      const mockProviders = [
        {
          instance: mockProcessorAdapter,
          metatype: class MockAdapter1 {},
        },
        {
          instance: mockProcessorAdapter,
          metatype: class MockAdapter2 {},
        },
      ];

      discoveryService.getProviders.mockReturnValue(mockProviders as any);
      reflector.get.mockReturnValueOnce('processor-1').mockReturnValueOnce('processor-2');

      await service.onModuleInit();

      const result = service.getProcessorIds();
      expect(result).toEqual(['processor-1', 'processor-2']);
    });
  });

  describe('validateProcessorAdapter', () => {
    it('should throw error for null instance', () => {
      expect(() => service['validateProcessorAdapter'](null, 'test-processor')).toThrow(
        'processor adapter for test-processor must be an object',
      );
    });

    it('should throw error for non-object instance', () => {
      expect(() => service['validateProcessorAdapter']('not-an-object', 'test-processor')).toThrow(
        'processor adapter for test-processor must be an object',
      );
    });

    it('should throw error for missing validateAndParseTransaction method', () => {
      const invalidAdapter = {
        authorizeTransaction: jest.fn(),
      };

      expect(() => service['validateProcessorAdapter'](invalidAdapter, 'test-processor')).toThrow(
        'Processor adapter for test-processor must implement validateAndParseTransaction() method',
      );
    });

    it('should throw error for missing authorizeTransaction method', () => {
      const invalidAdapter = {
        validateAndParseTransaction: jest.fn(),
      };

      expect(() => service['validateProcessorAdapter'](invalidAdapter, 'test-processor')).toThrow(
        'Processor adapter for test-processor must implement authorizeTransaction() method',
      );
    });

    it('should throw error for non-function methods', () => {
      expect(() =>
        service['validateProcessorAdapter'](mockProcessorAdapterInvalid, 'test-processor'),
      ).toThrow(
        'Processor adapter for test-processor must implement validateAndParseTransaction() method',
      );
    });

    it('should pass validation for valid processor adapter', () => {
      expect(() =>
        service['validateProcessorAdapter'](mockProcessorAdapter, 'test-processor'),
      ).not.toThrow();
    });
  });

  describe('validateHasMethods', () => {
    it('should validate all required methods', () => {
      const validAdapter = {
        validateAndParseTransaction: jest.fn(),
        authorizeTransaction: jest.fn(),
      };

      expect(() =>
        service['validateHasMethods'](validAdapter, 'test-processor', [
          'validateAndParseTransaction',
          'authorizeTransaction',
        ]),
      ).not.toThrow();
    });

    it('should throw error if any method is missing', () => {
      const invalidAdapter = {
        validateAndParseTransaction: jest.fn(),
      };

      expect(() =>
        service['validateHasMethods'](invalidAdapter, 'test-processor', [
          'validateAndParseTransaction',
          'authorizeTransaction',
        ]),
      ).toThrow(
        'Processor adapter for test-processor must implement authorizeTransaction() method',
      );
    });
  });

  describe('validateHasMethod', () => {
    it('should pass validation for existing function method', () => {
      const validAdapter = {
        testMethod: jest.fn(),
      };

      expect(() =>
        service['validateHasMethod'](validAdapter, 'test-processor', 'testMethod'),
      ).not.toThrow();
    });

    it('should throw error for missing method', () => {
      const invalidAdapter = {};

      expect(() =>
        service['validateHasMethod'](invalidAdapter, 'test-processor', 'testMethod'),
      ).toThrow('Processor adapter for test-processor must implement testMethod() method');
    });

    it('should throw error for non-function method', () => {
      const invalidAdapter = {
        testMethod: 'not-a-function',
      };

      expect(() =>
        service['validateHasMethod'](invalidAdapter, 'test-processor', 'testMethod'),
      ).toThrow('Processor adapter for test-processor must implement testMethod() method');
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple processors with same adapter instance', async () => {
      const mockProviders = [
        {
          instance: mockProcessorAdapter,
          metatype: class MockAdapter1 {},
        },
        {
          instance: mockProcessorAdapter,
          metatype: class MockAdapter2 {},
        },
      ];

      discoveryService.getProviders.mockReturnValue(mockProviders as any);
      reflector.get.mockReturnValueOnce('processor-1').mockReturnValueOnce('processor-1'); // Same processor ID

      await service.onModuleInit();

      expect(service.getProcessorIds()).toEqual(['processor-1']);
      expect(service.getProcessorAdapter('processor-1')).toBe(mockProcessorAdapter);
    });

    it('should handle discovery service returning empty array', async () => {
      discoveryService.getProviders.mockReturnValue([]);

      await service.onModuleInit();

      expect(service.getProcessorIds()).toEqual([]);
      expect(reflector.get).not.toHaveBeenCalled();
    });

    it('should handle reflector throwing error', async () => {
      const mockProviders = [
        {
          instance: mockProcessorAdapter,
          metatype: class MockAdapter {},
        },
      ];

      discoveryService.getProviders.mockReturnValue(mockProviders as any);
      reflector.get.mockImplementation(() => {
        throw new Error('Reflection error');
      });

      await expect(service.onModuleInit()).rejects.toThrow('Reflection error');
    });
  });
});
