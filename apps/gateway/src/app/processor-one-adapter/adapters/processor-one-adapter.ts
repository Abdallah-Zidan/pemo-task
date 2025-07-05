import { ProcessorAdapter, IProcessorAdapter } from '@pemo-task/process-adapter-manager';
import {
  ITransactionDetails,
  RequestHeaders,
  Result,
  TransactionStatus,
} from '@pemo-task/shared-types';
import { ProcessorRequestData, processorRequestSchema } from '../schemas';
import { SHA256SignatureVerificationService } from '../services';

@ProcessorAdapter('processor-one-adapter')
export class ProcessorOneAdapter implements IProcessorAdapter<ProcessorRequestData> {
  constructor(private readonly signatureVerificationService: SHA256SignatureVerificationService) {}

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

    return Result.success({
      amount: validatedData.billing_amount,
      currency: validatedData.billing_currency,
      status: this.mapStatusCodeToStatus(validatedData.status_code),
      type: validatedData.message_type,
      userId: validatedData.user_id,
      cardIdentifier: validatedData.card_id,
      metadata: validatedData,
      processorTransactionId: validatedData.id,
      processorId: 'processor-one-adapter',
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
   * the following method assumes the status code mapping since it wasn't clear from the task requirements
   * how to map the status code to the transaction status
   */
  private mapStatusCodeToStatus(statusCode: string): TransactionStatus {
    if (statusCode === '0000') {
      return TransactionStatus.APPROVED;
    }

    if (statusCode === '1111') {
      return TransactionStatus.CANCELLED;
    }

    return TransactionStatus.FAILED;
  }

  private extractSignatureFromHeaders(headers: RequestHeaders) {
    const signature = headers['x-message-signature'];

    if (Array.isArray(signature)) {
      return signature[0];
    }

    return signature;
  }
}
