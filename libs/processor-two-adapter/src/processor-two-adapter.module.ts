import { Logger, Module } from '@nestjs/common';
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './module.definition';
import { PROCESS_TWO_ADAPTER_LOGGER_TOKEN } from './constants';
import { IModuleOptions } from './interfaces';
import { ProcessorTwoAdapter } from './adapters';
import { DecryptionService, SHA512SignatureVerificationService } from './services';

@Module({
  providers: [
    {
      provide: PROCESS_TWO_ADAPTER_LOGGER_TOKEN,
      inject: [MODULE_OPTIONS_TOKEN],
      useFactory: (options: IModuleOptions) =>
        options.logger ?? new Logger(ProcessorTwoAdapterModule.name),
    },
    ProcessorTwoAdapter,
    DecryptionService,
    SHA512SignatureVerificationService,
  ],
  exports: [ProcessorTwoAdapter],
})
export class ProcessorTwoAdapterModule extends ConfigurableModuleClass {}
