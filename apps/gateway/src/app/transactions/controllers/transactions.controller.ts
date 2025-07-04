import { Controller, Post, Param, Body, Get } from '@nestjs/common';
import { TransactionsProcessingService, TransactionsQueryService } from '../services';

@Controller()
export class TransactionsController {
  constructor(
    private readonly transactionsProcessingService: TransactionsProcessingService,
    private readonly transactionQueryService: TransactionsQueryService,
  ) {}

  @Post('webhook/:processorId')
  handleWebhook(@Param('processorId') processorId: string, @Body() body: unknown) {
    // TODO: Implement webhook logic
    return this.transactionsProcessingService.processTransaction(processorId, body);
  }

  @Get('transactions')
  getTransactions() {
    // TODO: Implement get transactions logic
    return this.transactionQueryService.getTransactions();
  }
}
