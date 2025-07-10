import { Logger, Module } from '@nestjs/common';
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './module.definition';
import { PROCESS_TWO_ADAPTER_LOGGER_TOKEN } from './constants';
import { IModuleOptions } from './interfaces';
import { ProcessorTwoAdapter } from './adapters';
import { SharedUtilitiesModule } from '@pemo-task/shared-utilities';

@Module({
  imports: [SharedUtilitiesModule],
  providers: [
    {
      provide: PROCESS_TWO_ADAPTER_LOGGER_TOKEN,
      inject: [MODULE_OPTIONS_TOKEN],
      useFactory: (options: IModuleOptions) =>
        options.logger ?? new Logger(ProcessorTwoAdapterModule.name),
    },
    ProcessorTwoAdapter,
  ],
  exports: [ProcessorTwoAdapter],
})
export class ProcessorTwoAdapterModule extends ConfigurableModuleClass {}
