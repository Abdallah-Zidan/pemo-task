import { ILogger } from '@pemo-task/shared-types';

export interface IModuleOptions {
  publicKeyBase64: string;
  logger?: ILogger;
}
