import { TransactionStatus } from '@pemo-task/shared-types';
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

@Table({
  tableName: 'transactions',
  timestamps: true,
  underscored: true,
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

  @Index
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
  clearingTransactionId!: string;

  @Column({
    type: DataType.ENUM(...Object.values(TransactionStatus)),
    allowNull: false,
  })
  status!: TransactionStatus;

  @Column({
    type: DataType.DECIMAL(19, 4),
    allowNull: false,
  })
  amount!: number;

  @Column({
    type: DataType.STRING(3),
    allowNull: false,
  })
  currency!: string;

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
    type: DataType.JSONB,
    defaultValue: {},
  })
  metadata!: object;

  @HasMany(() => TransactionEvent)
  events!: TransactionEvent[];
}
