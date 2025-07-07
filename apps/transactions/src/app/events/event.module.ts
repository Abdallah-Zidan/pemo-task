import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Card, TransactionEvent } from '../models';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthorizationEventHandler } from './handlers/authorization-event.handler';
import { ClearingEventHandler } from './handlers/clearing-event.handler';

@Module({
  imports: [SequelizeModule.forFeature([Card, TransactionEvent]), EventEmitterModule.forRoot()],
  providers: [AuthorizationEventHandler, ClearingEventHandler],
})
export class EventModule {}
