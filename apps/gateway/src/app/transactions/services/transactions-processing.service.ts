import {
  Injectable,
  Logger,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ProcessorAdapterManager } from '@pemo-task/process-adapter-manager';

@Injectable()
export class TransactionsProcessingService {
  private readonly logger = new Logger(TransactionsProcessingService.name);

  constructor(private readonly processorAdapterManager: ProcessorAdapterManager) {}

  async processTransaction(processorId: string, body: unknown) {
    const processorAdapter = this.processorAdapterManager.getProcessorAdapterOrThrow(processorId);

    this.logger.debug('authorizing transaction request from processor processor: %s', processorId);
    const authResult = await processorAdapter.authorizeTransaction(body);

    if (!authResult.success) {
      this.logger.error('authorization failed for processor %s: %s', processorId, authResult.error);
      throw new UnauthorizedException({
        message: `Authorization failed for processor ${processorId}`,
      });
    }

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

    // TODO: Implement transaction processing
    return { transaction: parseResult.data };
  }
}
