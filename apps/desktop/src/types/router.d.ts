import type { Scope } from '@sih-saas/shared';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    scope?: Scope;
  }
}
