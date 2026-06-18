import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantContextService } from './tenant-context.service';

/**
 * Ouvre le scope AsyncLocalStorage pour toute la durée de la requête, avant même
 * l'authentification (les middlewares Nest s'exécutent avant les guards). TenantGuard
 * peuplera ensuite ce même contexte une fois le JWT validé.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContextService) {}

  use(_req: Request, _res: Response, next: NextFunction): void {
    this.tenantContext.run(() => next());
  }
}
