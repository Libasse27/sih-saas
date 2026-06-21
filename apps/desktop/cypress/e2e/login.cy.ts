// Identifiants de dev seedés une seule fois en base (apps/api/src/database/seeds/super-admin.seed.ts,
// apps/api/.env.example) — lecture seule ici, ce test ne modifie jamais ce compte.
const SUPER_ADMIN_EMAIL = 'superadmin@sih-saas.local';
const SUPER_ADMIN_PASSWORD = 'ChangeMe123!';

describe('Connexion', () => {
  // La soumission du formulaire (clic ou Entrée) ne déclenche jamais @finish dans ce contexte
  // automatisé — voir le commentaire détaillé sur `loginUi` dans cypress/support/commands.ts. Ce
  // test couvre donc ce qui est réellement vérifiable : le rendu du formulaire. La connexion
  // elle-même (round-trip API + redirection) est couverte par les autres specs via `loginSession`,
  // qui authentifie réellement contre l'API (pas un mock) sans passer par le clic défaillant.
  it('affiche le formulaire de connexion avec les bons champs', () => {
    cy.loginUi(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);

    cy.get('[data-cy=login-email]').should('have.value', SUPER_ADMIN_EMAIL);
    cy.get('[data-cy=login-password]').should('have.value', SUPER_ADMIN_PASSWORD);
    cy.get('[data-cy=login-submit]').should('be.visible').and('contain', 'Se connecter');
  });

  it('authentifie réellement un super-admin contre l’API et redirige vers son tableau de bord', () => {
    cy.loginSession(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);

    cy.url().should('include', '/platform/dashboard');
  });
});
