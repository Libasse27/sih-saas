// Constat fait en écrivant ce test, pas une supposition : un CAISSIER_FACTURATION pur n'a ni
// PATIENT_READ ni accès à la fiche patient (où vit l'onglet Facturation) — il ne peut donc pas
// utiliser l'écran « Encaisser » tel qu'il existe aujourd'hui. On lui ajoute AGENT_ACCUEIL_ADMISSION
// (qui a PATIENT_READ), combinaison réaliste pour un petit établissement où le même agent fait
// accueil + caisse. Lacune UX réelle découverte, hors périmètre de cette phase (tests, pas correctifs).
describe('Paiement caisse d’une facture patient', () => {
  it('encaisse une facture en mode CAISSE et la fait passer au statut Payée', () => {
    cy.registerEtablissement().then(({ email, motDePasse }) => {
      cy.apiLogin(email, motDePasse).then((adminToken) => {
        cy.createStaffUser(adminToken, ['AGENT_ACCUEIL_ADMISSION', 'CAISSIER_FACTURATION']).then((caissier) => {
          cy.apiLogin(caissier.email, caissier.motDePasse).then((caissierToken) => {
            cy.request({
              method: 'POST',
              url: `${Cypress.env('apiBaseUrl')}/patients`,
              headers: { Authorization: `Bearer ${caissierToken}` },
              body: { nom: 'Ndiaye', prenom: 'Moussa', dateNaissance: '1988-07-10', sexe: 'M' },
            }).then((reponsePatient) => {
              const patientId = reponsePatient.body.data.id as string;

              cy.request({
                method: 'POST',
                url: `${Cypress.env('apiBaseUrl')}/patients/${patientId}/factures-patient`,
                headers: { Authorization: `Bearer ${caissierToken}` },
                body: { lignes: [{ libelle: 'Consultation', quantite: 1, prixUnitaire: 5000 }] },
              }).then(() => {
                cy.loginSession(caissier.email, caissier.motDePasse);
                cy.url().should('include', '/etablissement/dashboard');

                cy.visit(`/#/etablissement/patients/${patientId}`);
                cy.contains('.ant-card', 'IDH').should('be.visible');
                cy.wait(500);
                cy.contains('.ant-tabs-tab-btn', 'Facturation').click({ force: true });
                cy.contains('.ant-tabs-tab-active', 'Facturation').should('exist');

                cy.get('[data-cy=facture-paiements]').first().click();
                cy.get('[data-cy=paiement-encaisser]').click();

                cy.contains('Paiement enregistré').should('be.visible');
                cy.get('[data-cy=facture-statut]').first().should('contain', 'Payée');
              });
            });
          });
        });
      });
    });
  });
});
