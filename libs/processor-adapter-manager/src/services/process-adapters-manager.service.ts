import { Injectable, OnModuleInit, Logger, NotImplementedException } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { PROCESSOR_ADAPTER_METADATA } from '../constants';
import { IProcessorAdapter } from '../interfaces';

@Injectable()
export class ProcessorAdapterManager implements OnModuleInit {
  private readonly logger = new Logger(ProcessorAdapterManager.name);
  private readonly processorAdapters = new Map<string, IProcessorAdapter>();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  async onModuleInit() {
    await this.discoverProcessorAdapters();
  }

  getProcessorAdapter(processorId: string): IProcessorAdapter | undefined {
    return this.processorAdapters.get(processorId);
  }

  getProcessorAdapterOrThrow(processorId: string): IProcessorAdapter {
    const processor = this.getProcessorAdapter(processorId);
    if (!processor) {
      throw new NotImplementedException(`Processor adapter for ${processorId} not found`);
    }
    return processor;
  }

  getProcessorIds(): string[] {
    return Array.from(this.processorAdapters.keys());
  }

  private async discoverProcessorAdapters() {
    const providers = this.discoveryService.getProviders();

    for (const wrapper of providers) {
      const { instance, metatype } = wrapper;

      if (!instance || !metatype) continue;

      const processorId = this.reflector.get<string>(PROCESSOR_ADAPTER_METADATA, metatype);

      if (processorId) {
        this.validateProcessorAdapter(instance, processorId);
        this.processorAdapters.set(processorId, instance);
        this.logger.log('registered processor adapter for: %s', processorId);
      }
    }
  }

  private validateProcessorAdapter(instance: unknown, processorId: string) {
    if (typeof instance !== 'object' || instance === null) {
      throw new Error(`processor adapter for ${processorId} must be an object`);
    }

    this.validateHasMethods(instance, processorId, [
      'validateAndParseTransaction',
      'authorizeTransaction',
    ]);
  }

  private validateHasMethods(instance: object, processorId: string, methodNames: string[]) {
    for (const methodName of methodNames) {
      this.validateHasMethod(instance, processorId, methodName);
    }
  }

  private validateHasMethod(instance: object, processorId: string, methodName: string) {
    if (
      !(methodName in instance) ||
      typeof instance[methodName as keyof typeof instance] !== 'function'
    ) {
      throw new Error(`Processor adapter for ${processorId} must implement ${methodName}() method`);
    }
  }
}
