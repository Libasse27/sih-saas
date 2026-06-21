// Constat fait en écrivant ce test (même pattern que CAISSIER_FACTURATION en Phase 25) : un
// PHARMACIEN pur n'a pas PATIENT_READ et ne peut donc pas ouvrir la fiche patient où vit l'onglet
// Prescriptions. Combinaison réaliste pour un petit établissement : le même agent fait accueil et
// pharmacie. La création de la prescription elle-même (PRESCRIPTION_CREATE, 🩺 CareContextGuard)
// exige un lien de soin réel — on planifie d'abord un RDV entre le médecin et le patient, qui
// satisfait la condition « RDV existant entre ce praticien et ce patient » de CareContextGuard.
describe('Dispensation pharmacie', () => {
  it('un pharmacien dispense une prescription validée et son statut passe à Dispensée', () => {
    cy.registerEtablissement().then(({ email, motDePasse }) => {
      cy.apiLogin(email, motDePasse).then((adminToken) => {
        cy.createStaffUser(adminToken, ['MEDECIN']).then((medecin) => {
          cy.createStaffUser(adminToken, ['AGENT_ACCUEIL_ADMISSION', 'SECRETAIRE_MEDICALE']).then((secretaire) => {
            cy.createStaffUser(adminToken, ['AGENT_ACCUEIL_ADMISSION', 'PHARMACIEN']).then((pharmacien) => {
              cy.apiLogin(secretaire.email, secretaire.motDePasse).then((secretaireToken) => {
                cy.request({
                  method: 'POST',
                  url: `${Cypress.env('apiBaseUrl')}/patients`,
                  headers: { Authorization: `Bearer ${secretaireToken}` },
                  body: { nom: 'Diallo', prenom: 'Ibrahima', dateNaissance: '1975-11-03', sexe: 'M' },
                }).then((reponsePatient) => {
                  const patientId = reponsePatient.body.data.id as string;

                  cy.request({
                    method: 'POST',
                    url: `${Cypress.env('apiBaseUrl')}/rendez-vous`,
                    headers: { Authorization: `Bearer ${secretaireToken}` },
                    body: {
                      patientId,
                      praticienId: medecin.id,
                      dateHeure: '2026-08-01T09:00:00.000Z',
                      canal: 'SUR_SITE',
                    },
                  }).then(() => {
                    cy.apiLogin(medecin.email, medecin.motDePasse).then((medecinToken) => {
                      cy.apiLogin(pharmacien.email, pharmacien.motDePasse).then((pharmacienToken) => {
                        cy.request({
                          method: 'POST',
                          url: `${Cypress.env('apiBaseUrl')}/medicaments-catalogue`,
                          headers: { Authorization: `Bearer ${pharmacienToken}` },
                          body: { dci: 'Paracétamol', forme: 'comprimé', dosage: '500mg' },
                        }).then((reponseMedicament) => {
                          const medicamentId = reponseMedicament.body.data.id as string;

                          cy.request({
                            method: 'POST',
                            url: `${Cypress.env('apiBaseUrl')}/stock-medicament`,
                            headers: { Authorization: `Bearer ${pharmacienToken}` },
                            body: {
                              medicamentId,
                              lot: 'LOT-E2E-001',
                              quantite: 100,
                              seuilAlerte: 10,
                              dateExpiration: '2027-12-31',
                            },
                          }).then(() => {
                            cy.request({
                              method: 'POST',
                              url: `${Cypress.env('apiBaseUrl')}/patients/${patientId}/prescriptions`,
                              headers: { Authorization: `Bearer ${medecinToken}` },
                              body: {
                                lignes: [{ medicamentId, posologie: '1 comprimé matin et soir', duree: '5 jours', voie: 'orale' }],
                              },
                            }).then((reponsePrescription) => {
                              const prescriptionId = reponsePrescription.body.data.id as string;

                              cy.request({
                                method: 'PATCH',
                                url: `${Cypress.env('apiBaseUrl')}/patients/${patientId}/prescriptions/${prescriptionId}/valider`,
                                headers: { Authorization: `Bearer ${medecinToken}` },
                              }).then(() => {
                                cy.loginSession(pharmacien.email, pharmacien.motDePasse);
                                cy.url().should('include', '/etablissement/dashboard');

                                cy.visit(`/#/etablissement/patients/${patientId}`);
                                cy.contains('.ant-card', 'IDH').should('be.visible');
                                cy.contains('.ant-tabs-tab-btn', 'Prescriptions').click({ force: true });
                                cy.contains('.ant-tabs-tab-active', 'Prescriptions').should('exist');

                                cy.get('[data-cy=prescription-ouvrir]').first().click();
                                cy.get('[data-cy=dispensation-lot]').click();
                                cy.contains('.ant-select-item-option', 'LOT-E2E-001').click();
                                cy.get('[data-cy=prescription-dispenser]').click();

                                cy.contains('Prescription dispensée').should('be.visible');
                                cy.get('[data-cy=prescription-statut]').first().should('contain', 'Dispensée');
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
