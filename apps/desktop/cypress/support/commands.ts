export interface EtablissementDeTest {
  email: string;
  motDePasse: string;
  etablissementId: string;
}

/**
 * Inscrit un établissement + administrateur jetables via l'API réelle (POST /auth/register, voir
 * RegisterDto) — plus rapide et plus fiable que de passer par l'UI pour le SETUP d'un test (les
 * specs ne testent pas l'inscription elle-même, seulement ce qui suit). Email aléatoire à chaque
 * appel : chaque test obtient un établissement neuf, jamais de collision ni de pollution d'un run
 * à l'autre — pas de nettoyage destructif nécessaire en fin de suite.
 */
Cypress.Commands.add('registerEtablissement', () => {
  const suffixe = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `e2e-${suffixe}@sih-saas.local`;
  const motDePasse = 'CypressTest123!';

  return cy
    .request('GET', `${Cypress.env('apiBaseUrl')}/plans`)
    .then((reponsePlans) => {
      // STANDARD (le premier forfait) n'inclut pas le module FACTURATION (@RequirePlanFeature) —
      // les specs qui créent des factures ont besoin d'un forfait qui l'inclut (PROFESSIONNEL/COMPLET).
      const plans = reponsePlans.body.data as Array<{ id: string; modules: string[] }>;
      const plan = plans.find((p) => p.modules.includes('FACTURATION')) ?? plans[0];
      return cy.request('POST', `${Cypress.env('apiBaseUrl')}/auth/register`, {
        nomEtablissement: `Clinique E2E ${suffixe}`,
        typeEtablissement: 'CLINIQUE',
        planId: plan.id,
        periodicite: 'MENSUEL',
        adminNom: 'E2E',
        adminPrenom: 'Test',
        adminEmail: email,
        adminPassword: motDePasse,
      });
    })
    .then((reponseRegister) => {
      const etablissementId = reponseRegister.body.data.etablissement.id as string;
      return { email, motDePasse, etablissementId } satisfies EtablissementDeTest;
    });
});

/**
 * Remplit le formulaire de connexion UI — sert UNIQUEMENT à vérifier le rendu (cypress/e2e/login.cy.ts).
 *
 * Ne soumet PAS le formulaire : `<a-form @finish="soumettre">` (LoginView.vue) ne déclenche jamais
 * son handler quand la soumission est simulée par un outil d'automatisation — confirmé après SIX
 * méthodes indépendantes essayées sans succès (clic Cypress, clic Cypress forcé, touche Entrée, clic
 * via Playwright piloté sur un vrai Edge système, `form.submit()` jQuery, `HTMLFormElement.
 * requestSubmit()`), aucune ne déclenche la moindre requête réseau (vérifié par interception réseau
 * à chaque tentative). Un fetch brut depuis le même contexte de page confirme que le réseau
 * cross-origin fonctionne parfaitement — le problème est donc isolé au déclenchement de l'événement
 * `@finish` lui-même dans ce contexte automatisé, pas à autre chose. Recoupe une limitation déjà
 * documentée en Phase 15 (même symptôme sur LoginView ET CouponFormDrawer, cause jamais identifiée).
 * Pour authentifier une session de test, voir `loginSession` ci-dessous (pattern recommandé par
 * Cypress lui-même : https://docs.cypress.io/guides/end-to-end-testing/testing-your-app#Logging-in).
 */
Cypress.Commands.add('loginUi', (email: string, motDePasse: string) => {
  cy.visit('/');
  // Le fallthrough d'attributs d'Ant Design Vue place `data-cy` directement sur le <input> natif
  // pour un `a-input`/`a-input-password` simple (sans affixe complémentaire) — pas sur un wrapper.
  cy.get('[data-cy=login-email]').type(email);
  cy.get('[data-cy=login-password]').type(motDePasse);
});

/** Connexion API pure (pas de rendu) — uniquement pour obtenir un accessToken servant au SETUP
 * d'un test (créer un compte personnel, une facture...), jamais pour la connexion testée elle-même. */
Cypress.Commands.add('apiLogin', (email: string, motDePasse: string) => {
  return cy
    .request('POST', `${Cypress.env('apiBaseUrl')}/auth/login`, { email, password: motDePasse })
    .then((reponse) => reponse.body.data.accessToken as string);
});

/**
 * Authentifie une session de test SANS passer par le formulaire de connexion (impossible à
 * automatiser de façon fiable ici, voir `loginUi` ci-dessus) — connexion réelle via l'API puis
 * injection des jetons dans `sessionStorage` avant que l'app ne démarre (`onBeforeLoad`), exactement
 * les clés lues par `auth.store.ts` (`sih_access_token`/`sih_refresh_token`) en mode navigateur
 * (`secure-storage.ts`, repli hors Electron). `restaurer()` les reprend au boot et le garde de route
 * redirige automatiquement loin de `/login` (déjà le comportement existant pour une session active).
 * C'est le pattern officiellement recommandé par Cypress pour ne pas retester la connexion UI dans
 * chaque test qui n'en a pas besoin — utilisé ici par nécessité, mais resterait le bon choix même
 * si `loginUi` fonctionnait.
 */
Cypress.Commands.add('loginSession', (email: string, motDePasse: string) => {
  return cy.request('POST', `${Cypress.env('apiBaseUrl')}/auth/login`, { email, password: motDePasse }).then((reponse) => {
    const { accessToken, refreshToken } = reponse.body.data;
    cy.visit('/', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('sih_access_token', accessToken);
        win.sessionStorage.setItem('sih_refresh_token', refreshToken);
      },
    });
  });
});

/**
 * Crée un compte personnel établissement avec un ou plusieurs rôles précis (ex.
 * AGENT_ACCUEIL_ADMISSION pour créer des patients, CAISSIER_FACTURATION pour encaisser —
 * l'ADMIN_ETABLISSEMENT lui-même n'a aucune permission clinique dans la matrice RBAC, voir
 * matrice-rbac.md). `adminToken` doit être le jeton d'un compte ayant `utilisateur:manage` (ex.
 * celui renvoyé par registerEtablissement).
 */
Cypress.Commands.add('createStaffUser', (adminToken: string, roles: string[]) => {
  const suffixe = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `e2e-staff-${suffixe}@sih-saas.local`;
  const motDePasse = 'CypressStaff123!';

  return cy
    .request({
      method: 'POST',
      url: `${Cypress.env('apiBaseUrl')}/users`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { scope: 'ETABLISSEMENT', nom: 'E2E', prenom: 'Staff', email, password: motDePasse, roles },
    })
    .then(() => ({ email, motDePasse }));
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      registerEtablissement(): Chainable<EtablissementDeTest>;
      loginUi(email: string, motDePasse: string): Chainable<void>;
      apiLogin(email: string, motDePasse: string): Chainable<string>;
      loginSession(email: string, motDePasse: string): Chainable<void>;
      createStaffUser(adminToken: string, roles: string[]): Chainable<{ email: string; motDePasse: string }>;
    }
  }
}
