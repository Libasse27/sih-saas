import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ApiKeysModule } from '../modules/api-keys/api-keys.module';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { ScopesGuard } from './guards/scopes.guard';
import { TenantGuard } from './guards/tenant.guard';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { TenantRlsInterceptor } from './interceptors/tenant-rls.interceptor';
import { RedisModule } from './redis/redis.module';
import { RedisService } from './redis/redis.service';
import { TenantContextMiddleware } from './tenant/tenant-context.middleware';
import { TenantContextService } from './tenant/tenant-context.service';

/**
 * Regroupe les éléments transversaux appliqués à toute l'API.
 * Pipeline de guards (voir docs/phase-0/architecture-modules-nestjs.md §3) :
 * ThrottlerGuard -> JwtAuthGuard -> TenantGuard -> ScopesGuard -> PermissionsGuard -> [CareContextGuard, Phase 5].
 * ThrottlerGuard passe en premier (Phase 11) : limiter même les requêtes non authentifiées
 * (brute-force login) avant qu'elles n'atteignent JwtAuthGuard.
 */
@Global()
@Module({
  imports: [
    RedisModule,
    // Store partagé Redis (Phase 27) — jusqu'ici en mémoire par instance (Phase 11), ce qui
    // laisserait chaque instance API compter ses propres requêtes si l'app tournait un jour sur
    // plusieurs instances derrière un load balancer (un attaquant pourrait alors contourner la
    // limite en répartissant ses requêtes). Un seul conteneur api en production à ce jour (voir
    // docker-compose.prod.yml), mais Redis est déjà provisionné précisément pour cet usage.
    ThrottlerModule.forRootAsync({
      inject: [RedisService],
      useFactory: (redisService: RedisService) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
        storage: new ThrottlerStorageRedisService(redisService.getClient()),
      }),
    }),
    ApiKeysModule,
  ],
  providers: [
    TenantContextService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: ScopesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TenantRlsInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
  exports: [TenantContextService],
})
export class SharedModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
