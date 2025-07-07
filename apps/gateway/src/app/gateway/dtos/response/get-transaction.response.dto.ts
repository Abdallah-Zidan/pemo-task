import { ApiProperty } from '@nestjs/swagger';
import { IGetTransactionResponse } from '@pemo-task/shared-types';
import { TransactionDetailsResponseDto } from './transaction-details.response.dto';
import { PaginationMetaDto } from './pagination-meta.dto';

export class GetTransactionResponseDto {
  @ApiProperty({
    description: 'The transaction details',
    type: [TransactionDetailsResponseDto],
  })
  data: TransactionDetailsResponseDto[];

  @ApiProperty({
    description: 'The pagination meta data',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;

  constructor(response: IGetTransactionResponse) {
    this.data =
      response.transactions?.map((transaction) => new TransactionDetailsResponseDto(transaction)) ??
      [];
    this.meta = new PaginationMetaDto(response.total, response.page, response.limit);
  }
}
