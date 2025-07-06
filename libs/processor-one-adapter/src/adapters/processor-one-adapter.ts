import { ProcessorAdapter, IProcessorAdapter } from '@pemo-task/process-adapter-manager';
import {
  ITransactionDetails,
  RequestHeaders,
  Result,
  TransactionStatus,
  TransactionType,
} from '@pemo-task/shared-types';
import { ProcessorRequestData, processorRequestSchema } from '../schemas';
import { SHA256SignatureVerificationService } from '../services';
import { PROCESS_ONE_ADAPTER_LOGGER_TOKEN, PROCESSOR_ONE_ID } from '../constants';
import { Inject, Logger } from '@nestjs/common';

@ProcessorAdapter(PROCESSOR_ONE_ID)
export class ProcessorOneAdapter implements IProcessorAdapter<ProcessorRequestData> {
  constructor(
    private readonly signatureVerificationService: SHA256SignatureVerificationService,
    @Inject(PROCESS_ONE_ADAPTER_LOGGER_TOKEN) private readonly logger: Logger,
  ) {}

  validateAndParseTransaction(
    data: unknown,
  ):
    | Promise<Result<ITransactionDetails, string[]>>
    | Result<ITransactionDetails<{ id: string }>, string[]> {
    const validatedResult = processorRequestSchema.safeParse(data);

    if (!validatedResult.success) {
      return Result.error(
        validatedResult.error.errors.map((error) => `${error.path.join('.')}: ${error.message}`),
      );
    }

    const validatedData = validatedResult.data;

    //! important note
    // this applies in the case of processor one, where the authorization transaction id
    // is the same as the clearing parent transaction id
    const authorizationTransactionId =
      validatedData.message_type === TransactionType.CLEARING
        ? validatedData.parent_transaction_id
        : validatedData.id;

    return Result.success({
      billingAmount: validatedData.billing_amount,
      billingCurrency: validatedData.billing_currency,
      status: this.mapTypeToStatus(validatedData.message_type),
      type: validatedData.message_type,
      userId: validatedData.user_id,
      cardId: validatedData.card_id,
      metadata: validatedData,
      authorizationTransactionId: authorizationTransactionId,
      clearingTransactionId:
        validatedData.message_type === TransactionType.CLEARING ? validatedData.id : undefined,
      //* we will authorization transaction id as the correlation id for both authorization and clearing transactions
      transactionCorrelationId: authorizationTransactionId,
      processorId: PROCESSOR_ONE_ID,
      isSuccessful: this.isSuccessfulTransaction(validatedData.status_code),
      processorName: 'Processor One',
      mcc: validatedData.mcc,
      referenceNumber: validatedData.rrn,
    });
  }

  /**
   * ! important note from Abd Allah
   * the following method assumes the way of signature verification since it wasn't clear from the task requirements
   * how to verify the signature, so I implemented the SHA256 signature verification with the public key of processor one
   * and assumed that the signature is the x-message-signature header
   * also assumed that the payload to sign is the following:
   * ${data.id}|${data.message_type}|${data.user_id}|${data.card_id}|${data.billing_amount}|${data.billing_currency}|${data.status_code}
   * any changes can be applied if requirements change
   */
  authorizeTransaction(data: ProcessorRequestData, headers: RequestHeaders) {
    const signature = this.extractSignatureFromHeaders(headers);

    if (!signature) {
      return Result.error('Signature is required');
    }

    const payloadToSign = `${data.id}|${data.message_type}|${data.user_id}|${data.card_id}|${data.billing_amount}|${data.billing_currency}|${data.status_code}`;

    this.logger.debug(`Verifying signature for payload: ${payloadToSign}`);

    const isSignatureValid = this.signatureVerificationService.verifySignature(
      payloadToSign,
      signature,
    );

    if (!isSignatureValid) {
      return Result.error('Invalid signature');
    }

    return Result.success({ isSignatureValid });
  }

  /**
   * ! important note from Abd Allah
   * the following method assumes the way of mapping the transaction type to the transaction status
   * based on the document understanding, transaction is considered settled if it is a clearing transaction
   * and pending if it is an authorization transaction
   */
  private mapTypeToStatus(transactionType: TransactionType): TransactionStatus {
    if (transactionType === TransactionType.CLEARING) {
      return TransactionStatus.SETTLED;
    }
    return TransactionStatus.PENDING;
  }

  /**
   * ! important note from Abd Allah
   * the following method assumes the status code mapping since it wasn't clear from the task requirements
   * how to map the status code to the transaction status so I assumed that the status code 0000 is a success status code
   */
  private isSuccessfulTransaction(statusCode: string) {
    return statusCode === '0000';
  }

  private extractSignatureFromHeaders(headers: RequestHeaders) {
    const signature = headers['x-message-signature'];

    if (Array.isArray(signature)) {
      return signature[0];
    }

    return signature;
  }
}
