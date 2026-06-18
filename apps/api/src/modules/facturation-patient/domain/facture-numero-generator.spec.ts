import { genererNumeroFacture } from './facture-numero-generator';

describe('genererNumeroFacture', () => {
  it('formate la séquence sur 6 chiffres', () => {
    expect(genererNumeroFacture('HMS', 2026, 45)).toBe('HMS-FACT-2026-000045');
  });

  it('gère une séquence déjà à 6 chiffres sans la tronquer', () => {
    expect(genererNumeroFacture('HMS', 2026, 123456)).toBe('HMS-FACT-2026-123456');
  });

  it('gère la première séquence de l’année', () => {
    expect(genererNumeroFacture('CLIN', 2026, 1)).toBe('CLIN-FACT-2026-000001');
  });
});
