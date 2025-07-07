import { Controller, Post, Param, Body, Get, Headers, Query, HttpCode } from '@nestjs/common';
import { GatewayService } from '../services';
import { RequestHeaders } from '@pemo-task/shared-types';
import { GetTransactionsQuery } from '../dtos/request/get-transactions.query';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetTransactionResponseDto } from '../dtos/response';

@Controller('gateway')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @ApiOperation({ summary: 'Handle payment processors webhook' })
  @ApiResponse({
    status: 202,
    description: 'Webhook received successfully',
  })
  @HttpCode(202)
  @Post('webhook/:processorId')
  handleWebhook(
    @Param('processorId') processorId: string,
    @Body() body: unknown,
    @Headers() headers: RequestHeaders,
  ) {
    return this.gatewayService.handleWebhook(processorId, body, headers);
  }

  @ApiOperation({ summary: 'Get transactions' })
  @ApiResponse({
    status: 200,
    description: 'Transactions fetched successfully',
    type: GetTransactionResponseDto,
  })
  @Get('transactions')
  getTransactions(@Query() query: GetTransactionsQuery) {
    return this.gatewayService.getTransactions(query);
  }
}
