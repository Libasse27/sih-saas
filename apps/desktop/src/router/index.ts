import { Scope } from '@sih-saas/shared';
import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

// createWebHashHistory : recommandé pour Electron packagé (évite les soucis de résolution file://).
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/auth/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/platform',
      component: () => import('../layouts/PlatformLayout.vue'),
      meta: { scope: Scope.PLATFORM },
      children: [
        { path: '', redirect: { name: 'platform-dashboard' } },
        {
          path: 'dashboard',
          name: 'platform-dashboard',
          component: () => import('../views/platform/DashboardView.vue'),
        },
        {
          path: 'etablissements',
          name: 'platform-etablissements',
          component: () => import('../views/platform/EtablissementsListView.vue'),
        },
        {
          path: 'etablissements/:id',
          name: 'platform-etablissement-detail',
          component: () => import('../views/platform/EtablissementDetailView.vue'),
          props: true,
        },
        {
          path: 'plans',
          name: 'platform-plans',
          component: () => import('../views/platform/PlansListView.vue'),
        },
        {
          path: 'audit',
          name: 'platform-audit',
          component: () => import('../views/platform/AuditLogView.vue'),
        },
      ],
    },
    {
      path: '/etablissement',
      component: () => import('../layouts/EtablissementLayout.vue'),
      meta: { scope: Scope.ETABLISSEMENT },
      children: [
        { path: '', redirect: { name: 'etablissement-dashboard' } },
        {
          path: 'dashboard',
          name: 'etablissement-dashboard',
          component: () => import('../views/etablissement/DashboardView.vue'),
        },
      ],
    },
    { path: '/', redirect: { name: 'login' } },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.pret) {
    await auth.restaurer();
  }

  const necessiteAuth = to.meta.requiresAuth !== false;

  if (!necessiteAuth) {
    // Route /login : un utilisateur déjà connecté est redirigé vers sa console.
    if (auth.estConnecte) {
      return { name: auth.scope === Scope.PLATFORM ? 'platform-dashboard' : 'etablissement-dashboard' };
    }
    return true;
  }

  if (!auth.estConnecte) {
    return { name: 'login' };
  }

  const scopeRequis = to.meta.scope as Scope | undefined;
  if (scopeRequis && auth.scope !== scopeRequis) {
    return { name: 'login' };
  }

  return true;
});

export default router;
