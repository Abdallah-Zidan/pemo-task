import { Controller, Post, Param, Body, Get, Headers } from '@nestjs/common';
import { TransactionsProcessingService, TransactionsQueryService } from '../services';
import { RequestHeaders } from '@pemo-task/shared-types';

@Controller()
export class TransactionsController {
  constructor(
    private readonly transactionsProcessingService: TransactionsProcessingService,
    private readonly transactionQueryService: TransactionsQueryService,
  ) {}

  @Post('webhook/:processorId')
  handleWebhook(
    @Param('processorId') processorId: string,
    @Body() body: unknown,
    @Headers() headers: RequestHeaders,
  ) {
    return this.transactionsProcessingService.processTransaction(processorId, body, headers);
  }

  @Get('transactions')
  getTransactions() {
    // TODO: Implement get transactions logic
    return this.transactionQueryService.getTransactions();
  }
}
