import { Logger, Module } from '@nestjs/common';
import { SHA256SignatureVerificationService } from './services';
import { ProcessorOneAdapter } from './adapters';
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './module.definition';
import { IModuleOptions } from './interfaces';
import { PROCESS_ONE_ADAPTER_LOGGER_TOKEN } from './constants';

@Module({
  providers: [
    {
      provide: PROCESS_ONE_ADAPTER_LOGGER_TOKEN,
      inject: [MODULE_OPTIONS_TOKEN],
      useFactory: (options: IModuleOptions) =>
        options.logger ?? new Logger(ProcessorOneAdapterModule.name),
    },
    ProcessorOneAdapter,
    SHA256SignatureVerificationService,
  ],
  exports: [ProcessorOneAdapter],
})
export class ProcessorOneAdapterModule extends ConfigurableModuleClass {}
