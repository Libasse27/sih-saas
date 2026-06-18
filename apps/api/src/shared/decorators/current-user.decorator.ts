import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@sih-saas/shared';

/** Injecte le payload JWT de l'utilisateur authentifié (req.user). */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtPayload => ctx.switchToHttp().getRequest().user,
);
