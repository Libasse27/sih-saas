import { deriverCodeBase } from './code-generator';

describe('deriverCodeBase', () => {
  it('prend les 4 premières lettres en majuscules', () => {
    expect(deriverCodeBase('Clinique du Plateau')).toBe('CLIN');
  });

  it('ignore les chiffres et la ponctuation', () => {
    expect(deriverCodeBase("Hopital Saint-Jean N°2")).toBe('HOPI');
  });

  it('retombe sur ETAB si le nom ne contient aucune lettre ASCII', () => {
    expect(deriverCodeBase('123')).toBe('ETAB');
  });

  it('gère un nom plus court que 4 lettres', () => {
    expect(deriverCodeBase('Dr X')).toBe('DRX');
  });
});
