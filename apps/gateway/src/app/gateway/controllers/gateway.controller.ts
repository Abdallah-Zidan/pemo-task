import { Controller, Post, Param, Body, Get, Headers } from '@nestjs/common';
import { GatewayService } from '../services';
import { RequestHeaders } from '@pemo-task/shared-types';

@Controller('gateway')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Post('webhook/:processorId')
  handleWebhook(
    @Param('processorId') processorId: string,
    @Body() body: unknown,
    @Headers() headers: RequestHeaders,
  ) {
    return this.gatewayService.handleWebhook(processorId, body, headers);
  }

  @Get('transactions')
  getTransactions() {
    return this.gatewayService.getTransactions();
  }
}
