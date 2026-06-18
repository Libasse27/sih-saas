import { calculerProrata } from './proration';

describe('calculerProrata', () => {
  it('facture la différence pour un upgrade à mi-cycle (50% restant)', () => {
    const montant = calculerProrata({
      ancienMontant: 50000,
      nouveauMontant: 100000,
      joursRestants: 15,
      joursTotal: 30,
    });

    // (100000 - 50000) * 0.5
    expect(montant).toBe(25000);
  });

  it('crédite (montant négatif) pour un downgrade à mi-cycle', () => {
    const montant = calculerProrata({
      ancienMontant: 100000,
      nouveauMontant: 50000,
      joursRestants: 15,
      joursTotal: 30,
    });

    expect(montant).toBe(-25000);
  });

  it('ne facture rien si le changement intervient le dernier jour du cycle', () => {
    const montant = calculerProrata({
      ancienMontant: 50000,
      nouveauMontant: 100000,
      joursRestants: 0,
      joursTotal: 30,
    });

    expect(montant).toBe(0);
  });

  it('facture le plein différentiel si le changement intervient au premier jour du cycle', () => {
    const montant = calculerProrata({
      ancienMontant: 50000,
      nouveauMontant: 100000,
      joursRestants: 30,
      joursTotal: 30,
    });

    expect(montant).toBe(50000);
  });

  it('borne les jours restants négatifs ou supérieurs au cycle total', () => {
    expect(
      calculerProrata({ ancienMontant: 0, nouveauMontant: 100000, joursRestants: -5, joursTotal: 30 }),
    ).toBe(0);
    expect(
      calculerProrata({ ancienMontant: 0, nouveauMontant: 100000, joursRestants: 90, joursTotal: 30 }),
    ).toBe(100000);
  });

  it('rejette un cycle total nul ou négatif', () => {
    expect(() =>
      calculerProrata({ ancienMontant: 0, nouveauMontant: 0, joursRestants: 0, joursTotal: 0 }),
    ).toThrow();
  });
});
