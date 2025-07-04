import { ITransactionDetails, Result } from '@pemo-task/shared-types';

export interface IProcessorAdapter {
  validateAndParseTransaction(
    data: unknown,
  ): Promise<Result<ITransactionDetails, string[]>> | Result<ITransactionDetails, string[]>;

  authorizeTransaction(
    transaction: unknown,
  ): Promise<Result<unknown, string>> | Result<unknown, string>;
}
