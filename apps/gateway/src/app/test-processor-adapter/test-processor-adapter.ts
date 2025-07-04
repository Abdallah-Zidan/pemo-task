import { ProcessorAdapter, IProcessorAdapter } from '@pemo-task/process-adapter-manager';
import {
  ITransactionDetails,
  Result,
  success,
  TransactionStatus,
  TransactionType,
} from '@pemo-task/shared-types';

@ProcessorAdapter('test-processor-adapter')
export class TestProcessorAdapter implements IProcessorAdapter {
  validateAndParseTransaction(
    data: unknown,
  ): Promise<Result<ITransactionDetails, string[]>> | Result<ITransactionDetails, string[]> {
    return success({
      amount: 100,
      currency: 'USD',
      status: TransactionStatus.PENDING,
      type: TransactionType.AUTHORIZATION,
      userId: '123',
      cardIdentifier: '123',
      metadata: data as Record<string, unknown>,
      processorTransactionId: '123',
    });
  }

  authorizeTransaction(transaction: unknown) {
    return success(transaction);
  }
}
