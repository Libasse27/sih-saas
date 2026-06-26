import { NotFoundException } from '@nestjs/common';
import { EmployeStatut } from '@sih-saas/shared';
import { EmployesService } from './employes.service';

describe('EmployesService', () => {
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    softRemove: jest.Mock;
  };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: EmployesService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'employe-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      softRemove: jest.fn((entity) => ({ ...entity, deletedAt: new Date() })),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    auditService = { log: jest.fn() };

    service = new EmployesService(tenantContext as any, auditService as any);
  });

  it('crée un employé rattaché au tenant courant, journalise', async () => {
    const employe = await service.create(
      { matricule: 'EMP-001', nom: 'Diop', prenom: 'Awa', poste: 'Infirmière', dateEmbauche: '2026-01-15' },
      'user-1',
    );

    expect(employe.etablissementId).toBe('etab-1');
    expect(employe.matricule).toBe('EMP-001');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'rh.employe.create', etablissementId: 'etab-1' }),
    );
  });

  it('findById lève NotFoundException si l’employé est introuvable (RLS scope déjà au tenant courant)', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findById('inconnu')).rejects.toThrow(NotFoundException);
  });

  it('update applique le DTO et journalise le nouveau statut', async () => {
    repository.findOne.mockResolvedValue({
      id: 'employe-1',
      etablissementId: 'etab-1',
      statut: EmployeStatut.ACTIF,
    });

    const updated = await service.update('employe-1', { statut: EmployeStatut.SUSPENDU }, 'admin-1');

    expect(updated.statut).toBe(EmployeStatut.SUSPENDU);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'rh.employe.update', metadata: { statut: EmployeStatut.SUSPENDU } }),
    );
  });

  it('remove fait un soft-delete (softRemove) et journalise', async () => {
    repository.findOne.mockResolvedValue({ id: 'employe-1', etablissementId: 'etab-1' });

    await service.remove('employe-1', 'admin-1');

    expect(repository.softRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 'employe-1' }));
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'rh.employe.delete' }));
  });
});
