import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'node:path';
import { TransactionsProcessingService, TransactionsQueryService } from './services';
import { ProcessorAdapterManagerModule } from '@pemo-task/process-adapter-manager';
import { ProcessorOneAdapterModule } from '../processor-one-adapter/processor-one-adapter.module';
import { TRANSACTIONS_CLIENT_NAME } from './constants';

@Module({
  providers: [TransactionsProcessingService, TransactionsQueryService],
  imports: [
    ProcessorAdapterManagerModule,
    ProcessorOneAdapterModule,
    ClientsModule.registerAsync({
      clients: [
        {
          name: TRANSACTIONS_CLIENT_NAME,
          useFactory: (configService: ConfigService) => ({
            transport: Transport.GRPC,
            options: {
              url: configService.get('TRANSACTIONS_SERVICE_URL'),
              package: 'transactions',
              protoPath: join(__dirname, '../../../shared-proto/proto/transactions.proto'),
            },
          }),
          inject: [ConfigService],
        },
      ],
    }),
  ],
  exports: [TransactionsProcessingService, TransactionsQueryService],
})
export class TransactionsModule {}
