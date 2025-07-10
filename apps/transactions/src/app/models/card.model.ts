import { randomUUID } from 'node:crypto';
import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  Unique,
  Index,
} from 'sequelize-typescript';
import { InferAttributes, InferCreationAttributes } from 'sequelize';

@Table({
  tableName: 'cards',
  timestamps: true,
  underscored: true,
})
export class Card extends Model<
  InferAttributes<Card>,
  InferCreationAttributes<
    Card,
    {
      omit: 'id';
    }
  >
> {
  @PrimaryKey
  @Default(randomUUID)
  @Column(DataType.UUID)
  id!: string;

  @Unique
  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  cardId!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  userId!: string;

  @Column({
    type: DataType.DECIMAL(19, 4),
    defaultValue: 0,
  })
  creditLimit!: number;

  @Column({
    type: DataType.DECIMAL(19, 4),
    defaultValue: 0,
  })
  availableCredit!: number;

  @Column({
    type: DataType.DECIMAL(19, 4),
    defaultValue: 0,
  })
  settledBalance!: number;

  @Column({
    type: DataType.DECIMAL(19, 4),
    defaultValue: 0,
  })
  pendingBalance!: number;

  @Column({
    type: DataType.DECIMAL(19, 4),
    defaultValue: 0,
  })
  currentUtilization!: number;
}
