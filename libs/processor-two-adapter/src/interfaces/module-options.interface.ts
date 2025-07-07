import { ILogger } from '@pemo-task/shared-types';

export interface IModuleOptions {
  privateKeyBase64: string;
  apiKey: string;
  logger?: ILogger;
}
