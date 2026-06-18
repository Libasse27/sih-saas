import { SetMetadata } from '@nestjs/common';
import { Scope } from '@sih-saas/shared';

export const SCOPES_KEY = 'scopes';

/** Restreint une route à un ou plusieurs périmètres (PLATFORM / ETABLISSEMENT / PATIENT). */
export const Scopes = (...scopes: Scope[]) => SetMetadata(SCOPES_KEY, scopes);
