import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { ScopesGuard } from './guards/scopes.guard';
import { ResponseInterceptor } from './interceptors/response.interceptor';

/**
 * Regroupe les éléments transversaux appliqués à toute l'API.
 * Pipeline de guards (voir docs/phase-0/architecture-modules-nestjs.md §3) :
 * JwtAuthGuard -> [TenantGuard, Phase 2] -> ScopesGuard -> PermissionsGuard -> [CareContextGuard, Phase 5].
 */
@Global()
@Module({
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ScopesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class SharedModule {}
