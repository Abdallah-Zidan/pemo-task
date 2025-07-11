import { ITransactionDetails } from '@pemo-task/shared-types';
import { randomUUID } from 'node:crypto';
import {
  Column,
  DataType,
  Default,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { InferAttributes, InferCreationAttributes } from 'sequelize';

@Table({
  tableName: 'pending_clearing_transactions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['transaction_correlation_id', 'processor_id'],
    },
  ],
})
export class PendingClearingTransaction extends Model<
  InferAttributes<PendingClearingTransaction>,
  InferCreationAttributes<PendingClearingTransaction, { omit: 'id' | 'createdAt' | 'updatedAt' }>
> {
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
  transactionCorrelationId!: string;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
  })
  transactionData!: ITransactionDetails;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  retryCount!: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastRetryAt?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  expiresAt?: Date;
}