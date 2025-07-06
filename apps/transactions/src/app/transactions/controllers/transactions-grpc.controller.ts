import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ITransactionDetails } from '@pemo-task/shared-types';
import { TransactionsGrpcService } from '../services';

@Controller()
export class TransactionsGrpcController {
  constructor(private readonly transactionsGrpcService: TransactionsGrpcService) {}
  @GrpcMethod('TransactionsService', 'ProcessTransaction')
  async processTransaction(data: ITransactionDetails) {
    return this.transactionsGrpcService.processTransaction(data);
  }
}
