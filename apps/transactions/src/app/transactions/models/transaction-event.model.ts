import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';

import { Transaction } from './transaction.model';
import { randomUUID } from 'node:crypto';

@Table({
  tableName: 'transaction_events',
  timestamps: false,
  underscored: true,
})
export class TransactionEvent extends Model {
  @PrimaryKey
  @Default(randomUUID)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => Transaction)
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  transactionId!: string;

  @BelongsTo(() => Transaction)
  transaction!: Transaction;

  @Column({
    type: DataType.STRING(75),
    allowNull: false,
  })
  eventType!: string;

  @Column({
    type: DataType.JSONB,
    defaultValue: {},
  })
  data!: unknown;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  createdAt!: Date;
}
