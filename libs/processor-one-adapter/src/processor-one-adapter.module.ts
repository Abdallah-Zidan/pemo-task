import { Logger, Module } from '@nestjs/common';
import { ProcessorOneAdapter } from './adapters';
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './module.definition';
import { IModuleOptions } from './interfaces';
import { PROCESS_ONE_ADAPTER_LOGGER_TOKEN } from './constants';
import { SharedUtilitiesModule } from '@pemo-task/shared-utilities';

@Module({
  imports: [SharedUtilitiesModule],
  providers: [
    {
      provide: PROCESS_ONE_ADAPTER_LOGGER_TOKEN,
      inject: [MODULE_OPTIONS_TOKEN],
      useFactory: (options: IModuleOptions) =>
        options.logger ?? new Logger(ProcessorOneAdapterModule.name),
    },
    ProcessorOneAdapter,
  ],
  exports: [ProcessorOneAdapter],
})
export class ProcessorOneAdapterModule extends ConfigurableModuleClass {}
