import { ILogger } from '@pemo-task/shared-types';

export interface IModuleOptions {
  decryptionPrivateKeyBase64: string;
  signatureVerificationPublicKeyBase64: string;
  apiKey: string;
  logger?: ILogger;
}
