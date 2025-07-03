import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'node:path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const grpcPort = process.env.GRPC_PORT || 5001;
  const grpcHost = process.env.GRPC_HOST || '0.0.0.0';

  console.log(__dirname);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'transaction',
      protoPath: join(__dirname, './proto/transaction.proto'),
      url: `${grpcHost}:${grpcPort}`,
    },
  });

  await app.startAllMicroservices();

  Logger.log(`🚀 gRPC microservice is running`);
}

bootstrap();
