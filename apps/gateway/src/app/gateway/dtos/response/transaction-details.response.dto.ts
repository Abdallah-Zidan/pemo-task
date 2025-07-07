import { ApiProperty } from '@nestjs/swagger';
import { ITransactionDetailsResponse, TransactionStatus } from '@pemo-task/shared-types';

export class TransactionDetailsResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the transaction',
    example: '5eaa0dfb-9d29-4621-8549-5e4181430118',
  })
  id: string;

  @ApiProperty({
    description: 'The authorization transaction ID',
    example: '2035ed99-38ab-4a42-8125-fcbd906dba7a',
  })
  authorizationTransactionId: string;

  @ApiProperty({
    description: 'The transaction correlation ID for linking related transactions',
    example: '2035ed99-38ab-4a42-8125-fcbd906dba7a',
  })
  transactionCorrelationId: string;

  @ApiProperty({
    description: 'The processor ID that handled the transaction',
    example: 'processor-one',
  })
  processorId: string;

  @ApiProperty({
    description: 'The current status of the transaction',
    enum: TransactionStatus,
    example: 'PENDING',
  })
  status: TransactionStatus;

  @ApiProperty({
    description: 'The card ID associated with the transaction',
    example: '21407f60-ff6d-40b9-9798-3c77496982f6',
  })
  cardId: string;

  @ApiProperty({
    description: 'The user ID who owns the transaction',
    example: '7398d3a1-cf56-469b-ade8-cb86263560b2',
  })
  userId: string;

  @ApiProperty({
    description: 'Additional metadata for the transaction',
    example: { key: 'value' },
  })
  metadata: unknown;

  @ApiProperty({
    description: 'The display name of the processor',
    example: 'Processor One',
  })
  processorName: string;

  @ApiProperty({
    description: 'The Merchant Category Code (MCC)',
    example: '5734',
  })
  mcc: string;

  @ApiProperty({
    description: 'The reference number for the transaction',
    example: '060400875949',
  })
  referenceNumber: string;

  @ApiProperty({
    description: 'The timestamp when the transaction was created',
    example: '2025-07-07T16:55:56.154Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'The timestamp when the transaction was last updated',
    example: '2025-07-07T16:55:56.154Z',
  })
  updatedAt: string;

  constructor(transaction: ITransactionDetailsResponse) {
    this.id = transaction.id;
    this.authorizationTransactionId = transaction.authorizationTransactionId;
    this.transactionCorrelationId = transaction.transactionCorrelationId;
    this.processorId = transaction.processorId;
    this.status = transaction.status;
    this.cardId = transaction.cardId;
    this.userId = transaction.userId;
    this.metadata = transaction.metadata;
    this.processorName = transaction.processorName;
    this.mcc = transaction.mcc;
    this.referenceNumber = transaction.referenceNumber;
    this.createdAt = transaction.createdAt;
    this.updatedAt = transaction.updatedAt;
  }
}
