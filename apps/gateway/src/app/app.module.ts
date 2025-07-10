import { Module } from '@nestjs/common';
import { GatewayModule } from './gateway/gateway.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import {
  SharedUtilitiesModule,
  GlobalExceptionFilter,
  buildPinoOptions,
} from '@pemo-task/shared-utilities';

@Module({
  imports: [
    SharedUtilitiesModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildPinoOptions(config),
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.getOrThrow<number>('THROTTLE_TTL_MS'),
            limit: config.getOrThrow<number>('THROTTLE_LIMIT'),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            getTracker: (req: Record<string, any>) => {
              return (
                // authenticated user
                req.user?.sub ||
                // unauthenticated user
                req.get('x-forwarded-for') ||
                req.ip
              );
            },
          },
        ],
        storage: new ThrottlerStorageRedisService(config.getOrThrow('REDIS_URL')),
      }),
    }),

    GatewayModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
