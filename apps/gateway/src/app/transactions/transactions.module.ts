import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'node:path';
import { TransactionsProcessingService, TransactionsQueryService } from './services';
import { ProcessorAdapterManagerModule } from '@pemo-task/process-adapter-manager';
import { TRANSACTIONS_CLIENT_NAME } from './constants';
import { ProcessorOneAdapterModule } from '@pemo-task/processor-one-adapter';

@Module({
  providers: [TransactionsProcessingService, TransactionsQueryService],
  imports: [
    ProcessorAdapterManagerModule,
    ProcessorOneAdapterModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        publicKey: configService.getOrThrow('PROCESSOR_ONE_PUBLIC_KEY'),
        logger: new Logger(ProcessorOneAdapterModule.name),
      }),
      inject: [ConfigService],
    }),
    ClientsModule.registerAsync({
      clients: [
        {
          name: TRANSACTIONS_CLIENT_NAME,
          useFactory: (configService: ConfigService) => ({
            transport: Transport.GRPC,
            options: {
              url: configService.getOrThrow('TRANSACTIONS_SERVICE_URL'),
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
