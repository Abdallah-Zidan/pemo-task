import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { IGetTransactionsRequest, ITransactionDetails } from '@pemo-task/shared-types';
import { TransactionsGrpcService } from '../services';

@Controller()
export class TransactionsGrpcController {
  constructor(private readonly transactionsGrpcService: TransactionsGrpcService) {}
  @GrpcMethod('TransactionsService', 'ProcessTransaction')
  async processTransaction(data: ITransactionDetails) {
    console.log('Received gRPC request with metadata:', JSON.stringify(data.metadata));
    return this.transactionsGrpcService.processTransaction(data);
  }

  @GrpcMethod('TransactionsService', 'GetTransactions')
  async getTransactions(query: IGetTransactionsRequest) {
    return this.transactionsGrpcService.getTransactions(query);
  }
}
