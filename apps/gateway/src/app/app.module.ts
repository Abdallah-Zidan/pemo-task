import { Module } from '@nestjs/common';
import { GatewayModule } from './gateway/gateway.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', 'info'),
          safe: true,
          timestamp: () => new Date().toISOString(),
          quietReqLogger: true,
          formatters: {
            level: (label) => ({ level: label.toUpperCase() }),
          },
          transport: {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              colorize: true,
            },
          },
          customLogLevel: (req, res) => {
            if (res.statusCode >= 400 && res.statusCode < 500) {
              return 'warn';
            }
            if (res.statusCode >= 500) {
              return 'error';
            }
            return 'info';
          },
          redact: ['req.headers.authorization', 'req.headers["x-api-key"]'],
        },
      }),
    }),
    GatewayModule,
  ],
})
export class AppModule {}
