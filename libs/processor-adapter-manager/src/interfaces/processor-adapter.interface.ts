import { ITransactionDetails, RequestHeaders, Result } from '@pemo-task/shared-types';

type ParseResult = Result<ITransactionDetails, string[]>;
type AuthorizeResult = Result<unknown, string>;
export interface IProcessorAdapter<T = unknown> {
  validateAndParseTransaction(data: unknown): Promise<ParseResult> | ParseResult;
  authorizeTransaction(
    data: T,
    headers: RequestHeaders,
  ): Promise<AuthorizeResult> | AuthorizeResult;
}
