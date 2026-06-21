import { Scope, StatutAutorisationCdp } from '@sih-saas/shared';
import { EtablissementCdpController } from './etablissement-cdp.controller';

describe('EtablissementCdpController — auto-service établissement (Phase 24)', () => {
  let etablissementsService: { findById: jest.Mock; updateCdp: jest.Mock };
  let controller: EtablissementCdpController;

  const currentUser = {
    sub: 'admin-1',
    scope: Scope.ETABLISSEMENT,
    etablissementId: 'etab-1',
    roles: [],
    permissions: [],
    serviceId: null,
  };

  beforeEach(() => {
    etablissementsService = { findById: jest.fn(), updateCdp: jest.fn() };
    controller = new EtablissementCdpController(etablissementsService as any);
  });

  it('findMine résout toujours MON établissement depuis le JWT, jamais un :id arbitraire', async () => {
    await controller.findMine(currentUser as any);

    expect(etablissementsService.findById).toHaveBeenCalledWith('etab-1');
  });

  it('updateMine transmet le dto et résout l’établissement courant + l’auteur depuis le JWT', async () => {
    const dto = { statut: StatutAutorisationCdp.DEMANDE_SOUMISE, numeroRecepisse: 'CDP-2026-042' };

    await controller.updateMine(dto as any, currentUser as any);

    expect(etablissementsService.updateCdp).toHaveBeenCalledWith('etab-1', dto, 'admin-1');
  });
});
