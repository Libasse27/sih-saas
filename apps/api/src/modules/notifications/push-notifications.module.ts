import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PUSH_PROVIDER, PushNotificationsService } from './application/push-notifications.service';
import { DeviceTokenEntity } from './infrastructure/entities/device-token.entity';
import { SandboxPushProvider } from './infrastructure/providers/sandbox-push-provider';
import { PushNotificationsController } from './presentation/push-notifications.controller';

/** Séparé de `NotificationsModule` (Phase 14) — voir le commentaire de ce dernier. */
@Module({
  imports: [TypeOrmModule.forFeature([DeviceTokenEntity])],
  controllers: [PushNotificationsController],
  providers: [PushNotificationsService, { provide: PUSH_PROVIDER, useClass: SandboxPushProvider }],
  exports: [PushNotificationsService],
})
export class PushNotificationsModule {}
