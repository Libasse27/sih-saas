import { genererIdh } from './idh-generator';

describe('genererIdh', () => {
  it('formate la séquence sur 6 chiffres', () => {
    expect(genererIdh('HMS', 2026, 123)).toBe('HMS-2026-000123');
  });

  it('gère une séquence déjà à 6 chiffres sans la tronquer', () => {
    expect(genererIdh('HMS', 2026, 123456)).toBe('HMS-2026-123456');
  });

  it('gère la première séquence de l’année', () => {
    expect(genererIdh('CLIN', 2026, 1)).toBe('CLIN-2026-000001');
  });
});
