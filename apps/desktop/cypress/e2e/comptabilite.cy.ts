describe('Comptabilité SYSCOHADA', () => {
  it('admin voit le journal et saisit une écriture OD équilibrée', () => {
    cy.registerEtablissement().then(({ email, motDePasse }) => {
      cy.loginSession(email, motDePasse);
      cy.url().should('include', '/etablissement/dashboard');
      cy.visit('/#/etablissement/comptabilite');

      // Journal vide visible au chargement
      cy.contains('.ant-tabs-tab-btn', 'Journal des écritures').should('be.visible');
      cy.get('[data-cy=compta-table-journal]').should('be.visible');

      // Ouvrir le modal OD
      cy.get('[data-cy=compta-btn-saisir-od]').click();

      // Remplir le formulaire OD (montantDebit doit être === montantCredit, validé par @MontantsCroisesEgaux)
      cy.get('[data-cy=od-libelle]').type('Apport initial de trésorerie');
      cy.get('[data-cy=od-compte-debit]').type('521');
      // a-input-number : data-cy sur le wrapper div, input via .find('input')
      cy.get('[data-cy=od-montant-debit]').find('input').clear().type('100000');
      cy.get('[data-cy=od-compte-credit]').type('101');
      cy.get('[data-cy=od-montant-credit]').find('input').clear().type('100000');

      // Soumettre
      cy.contains('.ant-modal-footer button', 'OK').click();
      cy.contains('Écriture OD enregistrée').should('be.visible');

      // L'écriture apparaît dans le journal
      cy.get('[data-cy=compta-table-journal] .ant-table-row').should('have.length.at.least', 1);
      cy.contains('[data-cy=compta-table-journal]', 'Apport initial de trésorerie').should('be.visible');
    });
  });

  it('onglet Balance des comptes se rend sans erreur', () => {
    cy.registerEtablissement().then(({ email, motDePasse }) => {
      cy.loginSession(email, motDePasse);
      cy.visit('/#/etablissement/comptabilite');

      // Naviguer vers l'onglet Balance
      cy.contains('.ant-tabs-tab-btn', 'Balance des comptes').click({ force: true });
      // La table se rend même si la balance est vide (creerEcritureOD ne peuple pas plan_comptable)
      cy.get('[data-cy=compta-table-balance]').should('be.visible');
    });
  });
});
