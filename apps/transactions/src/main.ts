import { Logger } from 'nestjs-pino';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const logger = app.get(Logger);
  app.useLogger(logger);

  const transactionsServiceUrl = configService.get('TRANSACTIONS_GRPC_URL');

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

  logger.log(`🚀 gRPC microservice is running`);
  logger.log(`🚀 BullMQ workers are running`);
}

bootstrap();
