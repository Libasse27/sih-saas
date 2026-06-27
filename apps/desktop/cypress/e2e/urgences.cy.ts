describe('Urgences — triage et prise en charge', () => {
  it('crée un épisode aux urgences et le prend en charge', () => {
    cy.registerEtablissement().then(({ email, motDePasse }) => {
      cy.apiLogin(email, motDePasse).then((adminToken) => {
        cy.createStaffUser(adminToken, ['AGENT_ACCUEIL_ADMISSION', 'MEDECIN']).then((urgentiste) => {
          cy.apiLogin(urgentiste.email, urgentiste.motDePasse).then((urgentisteToken) => {
            // Créer un patient via API (AGENT_ACCUEIL_ADMISSION a PATIENT_CREATE)
            cy.request({
              method: 'POST',
              url: `${Cypress.env('apiBaseUrl')}/patients`,
              headers: { Authorization: `Bearer ${urgentisteToken}` },
              body: { nom: 'Diallo', prenom: 'Fatou', dateNaissance: '1990-03-15', sexe: 'F' },
            }).then((reponsePatient) => {
              const idh = reponsePatient.body.data.idh as string;

              cy.loginSession(urgentiste.email, urgentiste.motDePasse);
              cy.url().should('include', '/etablissement/dashboard');
              cy.visit('/#/etablissement/urgences');
              cy.contains('h2', 'Urgences').should('be.visible');

              // Ouvrir le modal de création
              cy.get('[data-cy=urgence-nouvelle]').click();

              // Étape 1 : recherche patient par IDH
              cy.get('[data-cy=urgence-idh-search]').find('input').type(idh);
              cy.get('[data-cy=urgence-idh-search]').find('button').click();

              // Étape 2 : formulaire motif + triage
              cy.get('[data-cy=urgence-modal-motif]').type('Douleur thoracique');
              cy.get('[data-cy=urgence-modal-niveau]').click();
              // 'Urgent' avec U majuscule est unique (vs 'Très urgent' qui a 'u' minuscule)
              cy.contains('.ant-select-item-option-content', 'Urgent').click();

              // Soumettre
              cy.contains('.ant-modal-footer button', 'OK').click();
              cy.contains('Épisode aux urgences créé').should('be.visible');

              // Vérifier l'épisode dans la table et ouvrir le détail
              cy.get('[data-cy=urgence-ouvrir]').first().click();
              cy.contains('.ant-modal-body', 'Douleur thoracique').should('be.visible');

              // Prendre en charge (MEDECIN role — URGENCE_PRISE_EN_CHARGE)
              cy.get('[data-cy=urgence-prise-en-charge]').click();
              cy.contains('Patient pris en charge').should('be.visible');
            });
          });
        });
      });
    });
  });
});
