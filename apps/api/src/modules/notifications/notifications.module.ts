import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './presentation/realtime.gateway';

@Module({
  // secrets/expiry passés explicitement à chaque verifyAsync, voir auth.module.ts pour la même convention.
  imports: [JwtModule.register({})],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class NotificationsModule {}
