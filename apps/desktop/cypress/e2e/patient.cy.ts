// L'ADMIN_ETABLISSEMENT créé par l'inscription n'a lui-même aucune permission clinique (matrice
// RBAC) — on lui fait créer un compte AGENT_ACCUEIL_ADMISSION (a `patient:create`), exactement le
// flux réel d'un établissement qui onboarde son personnel d'accueil.
describe('Création de patient (console établissement)', () => {
  it('un agent d’accueil crée un patient et le retrouve dans la liste', () => {
    cy.registerEtablissement().then(({ email, motDePasse }) => {
      cy.apiLogin(email, motDePasse).then((adminToken) => {
        cy.createStaffUser(adminToken, ['AGENT_ACCUEIL_ADMISSION']).then((agent) => {
          cy.loginSession(agent.email, agent.motDePasse);
          cy.url().should('include', '/etablissement/dashboard');

          cy.contains('.ant-menu-item', 'Patients').click();
          cy.url().should('include', '/etablissement/patients');

          cy.get('[data-cy=patient-nouveau]').click();
          cy.get('[data-cy=patient-nom]').type('Diop');
          cy.get('[data-cy=patient-prenom]').type('Fatou');
          cy.get('[data-cy=patient-date-naissance]').type('1995-03-20');
          cy.get('[data-cy=patient-modal-ok]').click();

          cy.get('[data-cy=patients-table]').should('contain', 'Fatou Diop');
        });
      });
    });
  });
});
