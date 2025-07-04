import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TransactionsProcessingService {
  private readonly logger = new Logger(TransactionsProcessingService.name);
  processTransaction(processorId: string, body: unknown) {
    this.logger.log(`Processing transaction for processor ${processorId}`);
    this.logger.debug(`Transaction body: %o`, body);
    // TODO: Implement processing logic
    return { message: `Webhook received for processor ${processorId}` };
  }
}
