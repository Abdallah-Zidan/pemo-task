import { ITransactionDetails, RequestHeaders, Result } from '@pemo-task/shared-types';

type ParseResult<T = unknown> = Result<ITransactionDetails<T>, string[]>;
type AuthorizeResult = Result<unknown, string>;
export interface IProcessorAdapter<T = unknown> {
  validateAndParseTransaction(data: unknown): Promise<ParseResult<T>> | ParseResult<T>;
  authorizeTransaction(
    data: T,
    headers: RequestHeaders,
  ): Promise<AuthorizeResult> | AuthorizeResult;
}
