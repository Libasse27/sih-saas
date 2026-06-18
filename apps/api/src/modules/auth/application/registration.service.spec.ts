import { EtablissementStatut, EtablissementType, Periodicite, Role, Scope } from '@sih-saas/shared';
import { RegistrationService } from './registration.service';

describe('RegistrationService', () => {
  let plansService: { findById: jest.Mock };
  let etablissementsService: { create: jest.Mock; setAdmin: jest.Mock; findById: jest.Mock };
  let usersService: { create: jest.Mock };
  let provisioningService: { provisionner: jest.Mock };
  let service: RegistrationService;

  const baseDto = {
    nomEtablissement: 'Clinique Test',
    typeEtablissement: EtablissementType.CLINIQUE,
    planId: 'plan-1',
    periodicite: Periodicite.MENSUEL,
    adminNom: 'Diop',
    adminPrenom: 'Awa',
    adminEmail: 'awa.diop@clinique-test.sn',
    adminPassword: 'MotDePasse123!',
  };

  beforeEach(() => {
    plansService = { findById: jest.fn() };
    etablissementsService = {
      create: jest.fn().mockResolvedValue({ id: 'etab-1', statut: EtablissementStatut.EN_ATTENTE_PAIEMENT }),
      setAdmin: jest.fn(),
      findById: jest.fn().mockResolvedValue({ id: 'etab-1', statut: EtablissementStatut.ESSAI }),
    };
    usersService = { create: jest.fn().mockResolvedValue({ id: 'admin-1' }) };
    provisioningService = { provisionner: jest.fn() };

    service = new RegistrationService(
      plansService as any,
      etablissementsService as any,
      usersService as any,
      provisioningService as any,
    );
  });

  it("crée l'établissement et son ADMIN_ETABLISSEMENT sans vérifier de limite (bootstrap)", async () => {
    plansService.findById.mockResolvedValue({ id: 'plan-1', essaiGratuitJours: 0 });

    await service.register(baseDto);

    expect(etablissementsService.create).toHaveBeenCalledWith(
      { nom: 'Clinique Test', type: EtablissementType.CLINIQUE },
      null,
    );
    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: Scope.ETABLISSEMENT,
        etablissementId: 'etab-1',
        roles: [Role.ADMIN_ETABLISSEMENT],
      }),
      { skipLimitCheck: true },
    );
    expect(etablissementsService.setAdmin).toHaveBeenCalledWith('etab-1', 'admin-1');
  });

  it('provisionne immédiatement si le plan offre un essai gratuit (pas de paiement requis)', async () => {
    plansService.findById.mockResolvedValue({ id: 'plan-1', essaiGratuitJours: 14 });

    const result = await service.register(baseDto);

    expect(provisioningService.provisionner).toHaveBeenCalledWith('etab-1', 'plan-1', Periodicite.MENSUEL);
    expect(result.requiresPayment).toBe(false);
  });

  it("ne provisionne pas et signale qu'un paiement est requis si le plan n'offre pas d'essai", async () => {
    plansService.findById.mockResolvedValue({ id: 'plan-1', essaiGratuitJours: 0 });

    const result = await service.register(baseDto);

    expect(provisioningService.provisionner).not.toHaveBeenCalled();
    expect(result.requiresPayment).toBe(true);
  });
});
