import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const transactionsServiceUrl = configService.get('TRANSACTIONS_SERVICE_URL');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'transactions',
      protoPath: join(__dirname, '../../../shared-proto/proto/transactions.proto'),
      url: transactionsServiceUrl,
    },
  });

  await app.startAllMicroservices();
  await app.init(); //! This is important for BullMQ workers

  Logger.log(`🚀 gRPC microservice is running`);
  Logger.log(`🚀 BullMQ workers are running`);
}

bootstrap();
