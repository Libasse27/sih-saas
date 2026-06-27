describe('Tableau de bord établissement', () => {
  it("admin voit tous les blocs KPI du tableau de bord", () => {
    cy.registerEtablissement().then(({ email, motDePasse }) => {
      cy.loginSession(email, motDePasse);
      // loginSession redirige vers /etablissement/dashboard (comportement existant)
      cy.url().should('include', '/etablissement/dashboard');

      // Les 8 cartes KPI (DashboardView.vue)
      cy.contains('.ant-card', 'Hospitalisation').should('be.visible');
      cy.contains('.ant-card', 'Urgences').should('be.visible');
      cy.contains('.ant-card', 'Bloc opératoire').should('be.visible');
      cy.contains('.ant-card', 'Laboratoire').should('be.visible');
      cy.contains('.ant-card', 'Imagerie').should('be.visible');
      cy.contains('.ant-card', 'Pharmacie').should('be.visible');
      cy.contains('.ant-card', 'Ressources humaines').should('be.visible');
      cy.contains('.ant-card', 'Facturation du mois').should('be.visible');

      // Statistiques clés visibles (valeur 0 acceptable pour un établissement neuf)
      cy.contains('.ant-statistic-title', "Taux d'occupation").should('be.visible');
      cy.contains('.ant-statistic-title', 'Admissions en cours').should('be.visible');
      cy.contains('.ant-statistic-title', 'Épisodes actifs').should('be.visible');
      cy.contains('.ant-statistic-title', 'Employés actifs').should('be.visible');
      cy.contains('.ant-statistic-title', 'Recettes').should('be.visible');
    });
  });
});
