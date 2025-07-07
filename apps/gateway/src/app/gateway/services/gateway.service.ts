import { Injectable } from '@nestjs/common';
import {
  TransactionsProcessingService,
  TransactionsQueryService,
} from '../../transactions/services';
import { RequestHeaders } from '@pemo-task/shared-types';
import { GetTransactionsQuery } from '../dtos/request';

@Injectable()
export class GatewayService {
  constructor(
    private readonly transactionProcessingService: TransactionsProcessingService,
    private readonly transactionQueryService: TransactionsQueryService,
  ) {}

  async handleWebhook(processorId: string, body: unknown, headers: RequestHeaders) {
    return this.transactionProcessingService.processTransaction(processorId, body, headers);
  }

  async getTransactions(query: GetTransactionsQuery) {
    return this.transactionQueryService.getTransactions(query);
  }
}
