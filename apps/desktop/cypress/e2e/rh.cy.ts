describe('Ressources humaines', () => {
  it('admin voit la page RH en lecture seule (sans bouton de création)', () => {
    cy.registerEtablissement().then(({ email, motDePasse }) => {
      cy.loginSession(email, motDePasse);
      cy.url().should('include', '/etablissement/dashboard');
      cy.visit('/#/etablissement/rh');
      cy.contains('h2', 'Ressources Humaines').should('be.visible');
      cy.get('[data-cy=rh-table-employes]').should('be.visible');
      // ADMIN_ETABLISSEMENT a RH_VIEW mais pas RH_MANAGE — le bouton "Nouvel employé" est masqué
      cy.get('[data-cy=rh-btn-nouvel-employe]').should('not.exist');
    });
  });

  it('responsable RH crée un employé qui apparaît dans la table', () => {
    cy.registerEtablissement().then(({ email, motDePasse }) => {
      cy.apiLogin(email, motDePasse).then((adminToken) => {
        cy.createStaffUser(adminToken, ['RH']).then((rhUser) => {
          cy.loginSession(rhUser.email, rhUser.motDePasse);
          cy.url().should('include', '/etablissement/dashboard');
          cy.visit('/#/etablissement/rh');
          cy.contains('h2', 'Ressources Humaines').should('be.visible');

          cy.get('[data-cy=rh-btn-nouvel-employe]').click();
          cy.get('[data-cy=rh-modal-matricule]').type('EMP-001');
          cy.get('[data-cy=rh-modal-nom]').type('Sarr');
          cy.get('[data-cy=rh-modal-prenom]').type('Aminata');
          cy.get('[data-cy=rh-modal-poste]').type('Infirmière');
          cy.get('[data-cy=rh-modal-date-embauche]').type('2024-01-15');
          cy.contains('.ant-modal-footer button', 'OK').click();
          cy.contains('Employé enregistré').should('be.visible');

          cy.get('[data-cy=rh-table-employes] .ant-table-row').should('have.length.at.least', 1);
          cy.contains('[data-cy=rh-table-employes]', 'Sarr').should('be.visible');
        });
      });
    });
  });
});
