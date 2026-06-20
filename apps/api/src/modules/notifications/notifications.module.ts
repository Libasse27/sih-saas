import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './presentation/realtime.gateway';

/**
 * Volontairement minimal (aucune dépendance TypeORM) : un test d'intégration existant
 * (realtime.gateway.integration.spec.ts) démarre une `TestAppModule` n'important QUE ce module,
 * sans connexion base de données — voir docs/phase-0/plan-de-phases.md Phase 6. Les notifications
 * push (Phase 14, dépendantes de TypeORM) vivent dans `PushNotificationsModule`, séparé exprès.
 */
@Module({
  // secrets/expiry passés explicitement à chaque verifyAsync, voir auth.module.ts pour la même convention.
  imports: [JwtModule.register({})],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class NotificationsModule {}
