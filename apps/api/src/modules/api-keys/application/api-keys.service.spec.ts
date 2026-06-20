import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Permission } from '@sih-saas/shared';
import * as bcrypt from 'bcryptjs';
import { ApiKeysService } from './api-keys.service';

describe('ApiKeysService', () => {
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let config: { get: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: ApiKeysService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'key-1', ...entity })),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    config = { get: jest.fn().mockReturnValue(4) }; // rounds bas pour accélérer les tests
    auditService = { log: jest.fn() };
    service = new ApiKeysService(repository as any, config as any, auditService as any);
  });

  describe('create', () => {
    it('refuse une permission non autorisée pour une clé API', async () => {
      await expect(
        service.create('etab-1', { nom: 'Intégration X', permissions: [Permission.UTILISATEUR_MANAGE] }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('génère une clé sk_live_..., la hache et journalise — la clé en clair n’est retournée qu’une fois', async () => {
      const resultat = await service.create('etab-1', { nom: 'Intégration X', permissions: [Permission.FHIR_READ] }, 'admin-1');

      expect(resultat.cle).toMatch(/^sk_live_[a-f0-9]+$/);
      expect(resultat.apiKey.prefixe).toBe(resultat.cle.slice(0, 12));
      expect(resultat.apiKey.secretHash).not.toBe(resultat.cle);
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'api-key.create', etablissementId: 'etab-1' }));
    });
  });

  describe('verifier', () => {
    it('renvoie null si la clé ne commence pas par sk_live_', async () => {
      await expect(service.verifier('clé-invalide')).resolves.toBeNull();
    });

    it('renvoie null si aucune clé active ne correspond au préfixe', async () => {
      repository.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.verifier('sk_live_inconnue000000')).resolves.toBeNull();
    });

    it('renvoie null si le hash ne correspond pas (clé incorrecte malgré un préfixe trouvé)', async () => {
      const hash = await bcrypt.hash('sk_live_autrechose', 4);
      repository.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'key-1', secretHash: hash, expirationDate: null }),
      });

      await expect(service.verifier('sk_live_devine000000')).resolves.toBeNull();
    });

    it('renvoie null si la clé est expirée', async () => {
      const cle = 'sk_live_expiree0000000';
      const hash = await bcrypt.hash(cle, 4);
      repository.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'key-1', secretHash: hash, expirationDate: new Date('2020-01-01') }),
      });

      await expect(service.verifier(cle)).resolves.toBeNull();
    });

    it('renvoie la clé et met à jour derniereUtilisation si tout est valide', async () => {
      const cle = 'sk_live_valide00000000';
      const hash = await bcrypt.hash(cle, 4);
      repository.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'key-1', secretHash: hash, expirationDate: null }),
      });

      const resultat = await service.verifier(cle);

      expect(resultat?.id).toBe('key-1');
      expect(repository.update).toHaveBeenCalledWith('key-1', expect.objectContaining({ derniereUtilisation: expect.any(Date) }));
    });
  });

  describe('revoquer', () => {
    it('refuse une clé introuvable dans cet établissement', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.revoquer('key-x', 'etab-1', 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('passe actif=false et journalise', async () => {
      repository.findOne.mockResolvedValue({ id: 'key-1', etablissementId: 'etab-1', actif: true });

      const resultat = await service.revoquer('key-1', 'etab-1', 'admin-1');

      expect(resultat.actif).toBe(false);
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'api-key.revoquer' }));
    });
  });
});
