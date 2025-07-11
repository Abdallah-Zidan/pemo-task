import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { IGetTransactionsRequest, ITransactionDetails } from '@pemo-task/shared-types';
import { TransactionsGrpcService } from '../services';

@Controller()
export class TransactionsGrpcController {
  private readonly logger = new Logger(TransactionsGrpcController.name);
  constructor(private readonly transactionsGrpcService: TransactionsGrpcService) {}
  @GrpcMethod('TransactionsService', 'ProcessTransaction')
  async processTransaction(data: ITransactionDetails) {
    this.logger.debug('Received gRPC request with metadata: %o', data.metadata);
    return this.transactionsGrpcService.processTransaction(data);
  }

  @GrpcMethod('TransactionsService', 'GetTransactions')
  async getTransactions(query: IGetTransactionsRequest) {
    return this.transactionsGrpcService.getTransactions(query);
  }
}
