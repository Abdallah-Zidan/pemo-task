import {
  Injectable,
  Logger,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ProcessorAdapterManager } from '@pemo-task/process-adapter-manager';
import { RequestHeaders } from '@pemo-task/shared-types';

@Injectable()
export class TransactionsProcessingService {
  private readonly logger = new Logger(TransactionsProcessingService.name);

  constructor(private readonly processorAdapterManager: ProcessorAdapterManager) {}

  async processTransaction(processorId: string, body: unknown, headers: RequestHeaders) {
    const validatedData = await this.validateAndParseTransaction(processorId, body);
    await this.authorizeTransaction(processorId, body, headers);

    // TODO: Implement transaction processing
    return { transaction: validatedData };
  }

  private async validateAndParseTransaction(processorId: string, body: unknown) {
    const processorAdapter = this.processorAdapterManager.getProcessorAdapterOrThrow(processorId);

    this.logger.debug('validating and parsing transaction request from processor: %s', processorId);

    const parseResult = await processorAdapter.validateAndParseTransaction(body);

    if (!parseResult.success) {
      this.logger.error(
        'validation and parsing failed for processor %s: %o',
        processorId,
        parseResult.error,
      );

      throw new UnprocessableEntityException({
        message: `Validation and parsing failed for processor ${processorId}`,
        errors: parseResult.error,
      });
    }

    this.logger.debug(
      'transaction request validated and parsed successfully from processor: %s',
      processorId,
    );

    return parseResult.data;
  }

  private async authorizeTransaction(processorId: string, data: unknown, headers: RequestHeaders) {
    const processorAdapter = this.processorAdapterManager.getProcessorAdapterOrThrow(processorId);

    this.logger.debug('authorizing transaction request from processor: %s', processorId);

    const authResult = await processorAdapter.authorizeTransaction(data, headers);

    if (!authResult.success) {
      this.logger.error('authorization failed for processor %s: %s', processorId, authResult.error);
      throw new UnauthorizedException({
        message: `Authorization failed for processor ${processorId} with error: ${authResult.error}`,
      });
    }

    this.logger.debug(
      'transaction request authorized successfully from processor: %s',
      processorId,
    );
  }
}
