import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ProcessorAdapterManager } from '@pemo-task/process-adapter-manager';
import { RequestHeaders } from '@pemo-task/shared-types';
import { TRANSACTIONS_CLIENT_NAME } from '../constants';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ITransactionsGrpcService } from '@pemo-task/shared-types';

@Injectable()
export class TransactionsProcessingService {
  private readonly logger = new Logger(TransactionsProcessingService.name);
  private transactionsGrpcService: ITransactionsGrpcService;

  constructor(
    private readonly processorAdapterManager: ProcessorAdapterManager,
    @Inject(TRANSACTIONS_CLIENT_NAME) private readonly transactionsClient: ClientGrpc,
  ) {
    this.transactionsGrpcService =
      this.transactionsClient.getService<ITransactionsGrpcService>('TransactionsService');
  }

  async processTransaction(processorId: string, body: unknown, headers: RequestHeaders) {
    const validatedData = await this.validateAndParseTransaction(processorId, body);

    //! important note from Abd Allah
    //  we will not process the transaction if it is not successful since the document
    //  doesn't mention anything about what to do with a failed transaction
    if (!validatedData.isSuccessful) {
      this.logger.warn(
        'transaction is not successful, skipping processing for processor: %s',
        processorId,
      );
      return {
        success: false,
      };
    }

    await this.authorizeTransaction(processorId, body, headers);

    const requestData = {
      ...validatedData,
      metadata: validatedData.metadata,
    };

    this.logger.debug('Sending gRPC request with metadata:', JSON.stringify(requestData.metadata));

    return firstValueFrom(this.transactionsGrpcService.ProcessTransaction(requestData));
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
