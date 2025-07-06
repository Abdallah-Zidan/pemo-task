import { ConfigurableModuleBuilder } from '@nestjs/common';
import { IModuleOptions } from './interfaces';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<IModuleOptions>().build();
