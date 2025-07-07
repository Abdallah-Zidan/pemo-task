import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus } from '@pemo-task/shared-types';

export class GetTransactionsQuery {
  @IsOptional()
  @IsString()
  @IsEnum(TransactionStatus)
  @ApiPropertyOptional({
    enum: TransactionStatus,
    description: 'Filter transactions by status',
  })
  status?: TransactionStatus;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filter transactions by card id',
  })
  cardId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filter transactions by processor id',
  })
  processorId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @ApiPropertyOptional({
    description: 'Page number',
  })
  page?: number;

  @IsOptional()
  @IsNumber()
  @Max(100)
  @Min(1)
  @ApiPropertyOptional({
    description: 'Page size',
  })
  limit?: number;
}
