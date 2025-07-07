import { Inject, Injectable } from '@nestjs/common';
import { GetTransactionsQuery } from '../../gateway/dtos/request';
import { TRANSACTIONS_CLIENT_NAME } from '../constants';
import { ClientGrpc } from '@nestjs/microservices';
import { ITransactionsGrpcService } from '@pemo-task/shared-types';

@Injectable()
export class TransactionsQueryService {
  private transactionsGrpcService: ITransactionsGrpcService;

  constructor(@Inject(TRANSACTIONS_CLIENT_NAME) private readonly transactionsClient: ClientGrpc) {
    this.transactionsGrpcService =
      this.transactionsClient.getService<ITransactionsGrpcService>('TransactionsService');
  }

  getTransactions(query: GetTransactionsQuery) {
    const { cardId, processorId, status, page = 1, limit = 10 } = query;

    return this.transactionsGrpcService.GetTransactions({
      cardId,
      processorId,
      status,
      page,
      limit,
    });
  }
}
