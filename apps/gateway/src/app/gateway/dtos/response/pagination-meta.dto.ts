import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({
    description: 'The total number of items',
  })
  total: number;

  @ApiProperty({
    description: 'The page number',
  })
  page: number;

  @ApiProperty({
    description: 'The page size',
  })
  limit: number;

  @ApiProperty({
    description: 'The total number of pages',
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
  })
  hasPreviousPage: boolean;

  constructor(total: number, page: number, limit: number) {
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
    this.hasNextPage = page < this.totalPages;
    this.hasPreviousPage = page > 1;
  }
}
