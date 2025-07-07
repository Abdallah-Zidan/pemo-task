import { DecryptionService } from '../services';
import { PROCESS_TWO_ADAPTER_LOGGER_TOKEN, PROCESSOR_TWO_ID } from '../constants';
import { IProcessorAdapter, ProcessorAdapter } from '@pemo-task/process-adapter-manager';
import {
  hasProperty,
  ILogger,
  isString,
  ITransactionDetails,
  RequestHeaders,
  Result,
  TransactionStatus,
  TransactionType,
} from '@pemo-task/shared-types';
import { Inject } from '@nestjs/common';
import { MODULE_OPTIONS_TOKEN } from '../module.definition';
import { IModuleOptions } from '../interfaces';
import { ProcessorTransactionStatus, ProcessorTransactionType } from '../enums';
import { processorRequestSchema } from '../schemas';

@ProcessorAdapter(PROCESSOR_TWO_ID)
export class ProcessorTwoAdapter implements IProcessorAdapter {
  constructor(
    private readonly decryptionService: DecryptionService,
    @Inject(MODULE_OPTIONS_TOKEN) private readonly options: IModuleOptions,
    @Inject(PROCESS_TWO_ADAPTER_LOGGER_TOKEN) private readonly logger: ILogger,
  ) {}
  async validateAndParseTransaction(body: unknown): Promise<Result<ITransactionDetails, string[]>> {
    if (!hasProperty(body, 'data') || !isString(body.data)) {
      return Result.error(['Invalid data']);
    }

    let data: unknown;

    try {
      const decryptedData = this.decryptionService.decrypt(body.data);
      data = JSON.parse(decryptedData);
    } catch (error) {
      this.logger.error(error as string);
      return Result.error(['Invalid data']);
    }

    const validatedResult = await processorRequestSchema.safeParseAsync(data);

    if (!validatedResult.success) {
      return Result.error(
        validatedResult.error.errors.map((error) => `${error.path.join('.')}: ${error.message}`),
      );
    }

    const validatedData = validatedResult.data;

    return Result.success({
      billingAmount: validatedData.transaction.details.scheme_billing_amount,
      billingCurrency: validatedData.transaction.details.scheme_billing_currency,
      status: this.mapTypeToStatus(validatedData.type),
      type: this.mapTransactionType(validatedData.type),
      userId: validatedData.transaction.scheme_merchant_id,
      cardId: validatedData.transaction.account_id,
      metadata: this.flattenObject(validatedData),
      authorizationTransactionId: validatedData.transaction.id,
      clearingTransactionId: validatedData.transaction.id,
      transactionCorrelationId: validatedData.transaction.id,
      processorId: PROCESSOR_TWO_ID,
      isSuccessful: this.isSuccessfulTransaction(validatedData.transaction.status),
      processorName: 'Processor Two',
      mcc: validatedData.transaction.details.scheme_mcc,
      referenceNumber: validatedData.transaction.reference,
    });
  }

  //! important note: this assumption ... just to show case different way of handling authorization
  //! in the case of processor two as if we rely only on decryption of the data and api-key for authorization
  authorizeTransaction(_: unknown, headers: RequestHeaders) {
    const apiKey = headers['x-api-key'];

    if (apiKey !== this.options.apiKey) {
      return Result.error('Invalid API key');
    }

    return Result.success({
      data: true,
    });
  }

  private mapTransactionType(transactionType: ProcessorTransactionType): TransactionType {
    if (transactionType === ProcessorTransactionType.ACCOUNT_TRANSACTION_POSTED) {
      return TransactionType.CLEARING;
    }
    return TransactionType.AUTHORIZATION;
  }

  /**
   * ! important note from Abd Allah
   * the following method assumes the way of mapping the transaction type to the transaction status
   * based on the document understanding, transaction is considered settled if it is a clearing transaction
   * and pending if it is an authorization transaction
   */
  private mapTypeToStatus(transactionType: ProcessorTransactionType): TransactionStatus {
    if (transactionType === ProcessorTransactionType.ACCOUNT_TRANSACTION_POSTED) {
      return TransactionStatus.SETTLED;
    }
    return TransactionStatus.PENDING;
  }

  private isSuccessfulTransaction(status: ProcessorTransactionStatus) {
    return (
      status === ProcessorTransactionStatus.POSTED || status === ProcessorTransactionStatus.PENDING
    );
  }

  //TODO: move to a shared utility function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  flattenObject(obj: any, prefix = '', result: any = {}) {
    for (const key in obj) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        this.flattenObject(value, newKey, result);
      } else {
        result[newKey] = value;
      }
    }
    return result;
  }
}
