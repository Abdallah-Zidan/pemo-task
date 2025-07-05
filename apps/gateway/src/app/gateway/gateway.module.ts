import { Module } from '@nestjs/common';
import { HealthController, GatewayController } from './controllers';
import { TransactionsModule } from '../transactions/transactions.module';
import { GatewayService } from './services';

@Module({
  imports: [TransactionsModule],
  controllers: [GatewayController, HealthController],
  providers: [GatewayService],
})
export class GatewayModule {}
