// Le MEDECIN ne peut pas planifier son propre RDV (pas de RDV_CREATE dans la matrice RBAC — seul
// SECRETAIRE_MEDICALE l'a) : on ajoute AGENT_ACCUEIL_ADMISSION à la secrétaire pour qu'elle crée
// aussi le patient elle-même, flux réaliste pour un petit établissement où l'accueil gère l'agenda.
describe('Prise de rendez-vous (console établissement)', () => {
  it('une secrétaire médicale planifie un rendez-vous avec un médecin pour un patient', () => {
    cy.registerEtablissement().then(({ email, motDePasse }) => {
      cy.apiLogin(email, motDePasse).then((adminToken) => {
        // Établissement de test isolé et fraîchement enregistré : ce sera l'UNIQUE médecin de
        // l'annuaire, donc pas besoin de le distinguer par nom dans le menu déroulant praticien.
        cy.createStaffUser(adminToken, ['MEDECIN']).then(() => {
          cy.createStaffUser(adminToken, ['AGENT_ACCUEIL_ADMISSION', 'SECRETAIRE_MEDICALE']).then((secretaire) => {
            cy.apiLogin(secretaire.email, secretaire.motDePasse).then((secretaireToken) => {
              cy.request({
                method: 'POST',
                url: `${Cypress.env('apiBaseUrl')}/patients`,
                headers: { Authorization: `Bearer ${secretaireToken}` },
                body: { nom: 'Sow', prenom: 'Awa', dateNaissance: '1992-02-15', sexe: 'F' },
              }).then((reponsePatient) => {
                const patient = reponsePatient.body.data;

                cy.loginSession(secretaire.email, secretaire.motDePasse);
                cy.url().should('include', '/etablissement/dashboard');

                cy.contains('.ant-menu-item', 'Rendez-vous').click();
                cy.url().should('include', '/etablissement/rendez-vous');

                cy.get('[data-cy=rdv-nouveau]').click();
                cy.get('[data-cy=rdv-recherche-idh]').type(patient.idh);
                cy.get('[data-cy=rdv-recherche-idh]').find('.ant-input-search-button').click();

                cy.contains('Patient :').should('be.visible');

                cy.get('[data-cy=rdv-praticien]').click();
                cy.get('.ant-select-item-option').first().click();

                cy.get('[data-cy=rdv-date-heure]').type('2026-08-15T09:30');
                cy.get('[data-cy=rdv-modal-ok]').click();

                cy.contains('.ant-table', new Date('2026-08-15T09:30').toLocaleDateString('fr-SN')).should('be.visible');
              });
            });
          });
        });
      });
    });
  });
});
