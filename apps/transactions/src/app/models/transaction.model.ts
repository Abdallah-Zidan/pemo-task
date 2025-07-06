import { ITransactionDetails, TransactionStatus } from '@pemo-task/shared-types';
import { randomUUID } from 'node:crypto';
import {
  Column,
  DataType,
  Default,
  HasMany,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { TransactionEvent } from './transaction-event.model';

//!important note from Abd Allah
// there were no clear definition for the transaction table, so I made some assumptions
// it should be adjusted to the data we need to keep and return to consumers
@Table({
  tableName: 'transactions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['transaction_correlation_id', 'processor_id'],
    },
  ],
})
export class Transaction extends Model {
  @PrimaryKey
  @Default(randomUUID)
  @Column(DataType.UUID)
  id!: string;

  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  processorId!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  processorName!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  transactionCorrelationId!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  authorizationTransactionId!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  clearingTransactionId?: string | null;

  @Column({
    type: DataType.ENUM(...Object.values(TransactionStatus)),
    allowNull: false,
  })
  status!: TransactionStatus;

  @Column({
    type: DataType.DECIMAL(19, 4),
    allowNull: false,
  })
  authAmount!: number;

  @Column({
    type: DataType.DECIMAL(19, 4),
    allowNull: true,
  })
  clearingAmount?: number | null;

  @Column({
    type: DataType.STRING(3),
    allowNull: false,
  })
  currency!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  mcc!: string;

  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  cardId!: string;

  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  userId!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  referenceNumber!: string;

  @Column({
    type: DataType.JSONB,
    defaultValue: {},
  })
  metadata!: unknown;

  @HasMany(() => TransactionEvent)
  events!: TransactionEvent[];

  static createNewModel(data: ITransactionDetails): Partial<Transaction> {
    return {
      processorId: data.processorId,
      processorName: data.processorName,
      transactionCorrelationId: data.transactionCorrelationId,
      authorizationTransactionId: data.authorizationTransactionId,
      status: data.status,
      authAmount: data.billingAmount,
      currency: data.billingCurrency,
      mcc: data.mcc,
      cardId: data.cardId,
      userId: data.userId,
      referenceNumber: data.referenceNumber,
      metadata: data.metadata,
    };
  }
}
