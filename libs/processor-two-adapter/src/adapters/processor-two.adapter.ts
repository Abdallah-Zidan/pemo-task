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
import { ProcessorRequestData, processorRequestSchema } from '../schemas';
import {
  DecryptionService,
  extractSingleHeader,
  flattenObject,
  SignatureVerificationService,
} from '@pemo-task/shared-utilities';

@ProcessorAdapter(PROCESSOR_TWO_ID)
export class ProcessorTwoAdapter implements IProcessorAdapter {
  private readonly decryptionPrivateKey: string;
  private readonly signaturePublicKey: string;

  constructor(
    private readonly decryptionService: DecryptionService,
    @Inject(MODULE_OPTIONS_TOKEN) private readonly options: IModuleOptions,
    @Inject(PROCESS_TWO_ADAPTER_LOGGER_TOKEN) private readonly logger: ILogger,
    private readonly signatureVerificationService: SignatureVerificationService,
  ) {
    this.decryptionPrivateKey = Buffer.from(
      this.options.decryptionPrivateKeyBase64,
      'base64',
    ).toString('utf8');
    this.signaturePublicKey = Buffer.from(
      this.options.signatureVerificationPublicKeyBase64,
      'base64',
    ).toString('utf8');
  }

  async validateAndParseTransaction(body: unknown): Promise<Result<ITransactionDetails, string[]>> {
    if (!hasProperty(body, 'data') || !isString(body.data)) {
      return Result.error(['Invalid data']);
    }

    let data: unknown;

    try {
      const decryptedData = this.decryptionService.privateDecrypt({
        data: body.data,
        privateKey: this.decryptionPrivateKey,
        algorithm: 'SHA512',
      });
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
      metadata: flattenObject(validatedData),
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

  //! important note: this is an assumption ... just to show case different way of handling authorization
  //! in the case of processor two we have api key and signature verification
  authorizeTransaction(data: ProcessorRequestData, headers: RequestHeaders) {
    const apiKey = extractSingleHeader(headers, 'x-api-key');

    if (apiKey !== this.options.apiKey) {
      return Result.error('Invalid API key');
    }

    const signature = extractSingleHeader(headers, 'x-message-signature');

    if (!signature) {
      return Result.error('Signature is required');
    }

    const payloadToSign = `${data.id}|${data.type}|${data.transaction.details.scheme_billing_amount}|${data.transaction.details.scheme_billing_currency}|${data.transaction.status}`;

    this.logger.debug(`Verifying signature for payload: ${payloadToSign}`);

    const isSignatureValid = this.signatureVerificationService.verifySignature({
      data: payloadToSign,
      signature,
      publicKey: this.signaturePublicKey,
      algorithm: 'SHA512',
    });

    if (!isSignatureValid) {
      return Result.error('Invalid signature');
    }

    return Result.success({
      isSignatureValid,
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
}
