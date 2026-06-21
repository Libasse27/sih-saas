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
          path: 'coupons',
          name: 'platform-coupons',
          component: () => import('../views/platform/CouponsListView.vue'),
        },
        {
          path: 'promotions',
          name: 'platform-promotions',
          component: () => import('../views/platform/PromotionsListView.vue'),
        },
        {
          path: 'parametres',
          name: 'platform-parametres',
          component: () => import('../views/platform/SettingsView.vue'),
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
        {
          path: 'patients',
          name: 'etablissement-patients',
          component: () => import('../views/etablissement/PatientsListView.vue'),
        },
        {
          path: 'patients/:id',
          name: 'etablissement-patient-detail',
          component: () => import('../views/etablissement/PatientDetailView.vue'),
          props: true,
        },
        {
          path: 'rendez-vous',
          name: 'etablissement-rendez-vous',
          component: () => import('../views/etablissement/RendezVousListView.vue'),
        },
        {
          path: 'lits',
          name: 'etablissement-lits',
          component: () => import('../views/etablissement/LitsView.vue'),
        },
        {
          path: 'admissions',
          name: 'etablissement-admissions',
          component: () => import('../views/etablissement/AdmissionsListView.vue'),
        },
        {
          path: 'pharmacie',
          name: 'etablissement-pharmacie',
          component: () => import('../views/etablissement/PharmacieView.vue'),
        },
        {
          path: 'prescriptions',
          name: 'etablissement-prescriptions',
          component: () => import('../views/etablissement/PrescriptionsFileView.vue'),
        },
        {
          path: 'laboratoire',
          name: 'etablissement-laboratoire',
          component: () => import('../views/etablissement/LaboratoireFileView.vue'),
        },
        {
          path: 'imagerie',
          name: 'etablissement-imagerie',
          component: () => import('../views/etablissement/ImagerieFileView.vue'),
        },
        {
          path: 'facturation',
          name: 'etablissement-facturation',
          component: () => import('../views/etablissement/FacturationCaisseView.vue'),
        },
        {
          path: 'creances-assurance',
          name: 'etablissement-creances-assurance',
          component: () => import('../views/etablissement/CreancesAssuranceView.vue'),
        },
        {
          path: 'messages',
          name: 'etablissement-messages',
          component: () => import('../views/etablissement/MessagesView.vue'),
        },
        {
          path: 'maintenance',
          name: 'etablissement-maintenance',
          component: () => import('../views/etablissement/MaintenanceListView.vue'),
        },
        {
          path: 'sterilisation',
          name: 'etablissement-sterilisation',
          component: () => import('../views/etablissement/SterilisationListView.vue'),
        },
        {
          path: 'logistique',
          name: 'etablissement-logistique',
          component: () => import('../views/etablissement/LogistiqueListView.vue'),
        },
        {
          path: 'social',
          name: 'etablissement-social',
          component: () => import('../views/etablissement/SocialView.vue'),
        },
        {
          path: 'api-keys',
          name: 'etablissement-api-keys',
          component: () => import('../views/etablissement/ApiKeysListView.vue'),
        },
        {
          path: 'securite',
          name: 'etablissement-securite',
          component: () => import('../views/etablissement/SecuriteView.vue'),
        },
        {
          path: 'conformite',
          name: 'etablissement-conformite',
          component: () => import('../views/etablissement/ConformiteView.vue'),
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
