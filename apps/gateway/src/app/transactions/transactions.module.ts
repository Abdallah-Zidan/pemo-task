import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'node:path';
import { TransactionsProcessingService, TransactionsQueryService } from './services';
import { ProcessorAdapterManagerModule } from '@pemo-task/process-adapter-manager';
import { TRANSACTIONS_CLIENT_NAME } from './constants';
import { ProcessorOneAdapterModule } from '@pemo-task/processor-one-adapter';
import { ProcessorTwoAdapterModule } from '@pemo-task/processor-two-adapter';

@Module({
  providers: [TransactionsProcessingService, TransactionsQueryService],
  imports: [
    ProcessorAdapterManagerModule,
    ProcessorOneAdapterModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        publicKeyBase64: configService.getOrThrow('PROCESSOR_ONE_PUBLIC_KEY_BASE64'),
        logger: new Logger(ProcessorOneAdapterModule.name),
      }),
      inject: [ConfigService],
    }),
    ProcessorTwoAdapterModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        decryptionPrivateKeyBase64: configService.getOrThrow(
          'PROCESSOR_TWO_DECRYPTION_PRIVATE_KEY_BASE64',
        ),
        signatureVerificationPublicKeyBase64: configService.getOrThrow(
          'PROCESSOR_TWO_SIGNATURE_VERIFICATION_PUBLIC_KEY_BASE64',
        ),
        apiKey: configService.getOrThrow('PROCESSOR_TWO_API_KEY'),
        logger: new Logger(ProcessorTwoAdapterModule.name),
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
              url: configService.getOrThrow('TRANSACTIONS_GRPC_URL'),
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
