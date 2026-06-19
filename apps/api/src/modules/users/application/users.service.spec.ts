import { Role } from '@sih-saas/shared';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let usersRepository: { findOne: jest.Mock; find: jest.Mock };
  let userRolesRepository: { find: jest.Mock };
  let service: UsersService;

  beforeEach(() => {
    usersRepository = { findOne: jest.fn(), find: jest.fn() };
    userRolesRepository = { find: jest.fn() };

    service = new UsersService(
      usersRepository as any,
      userRolesRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  describe('findPraticiensByEtablissement', () => {
    it('ne retourne que les utilisateurs de l’établissement parmi les rôles soignants', async () => {
      userRolesRepository.find.mockResolvedValue([
        { userId: 'medecin-1', role: Role.MEDECIN },
        { userId: 'infirmier-1', role: Role.INFIRMIER },
      ]);
      usersRepository.find.mockResolvedValue([
        { id: 'medecin-1', nom: 'Ndiaye', prenom: 'Awa' },
        { id: 'infirmier-1', nom: 'Sow', prenom: 'Moussa' },
      ]);

      const praticiens = await service.findPraticiensByEtablissement('etab-1');

      expect(usersRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: expect.anything(), etablissementId: 'etab-1' } }),
      );
      expect(praticiens).toEqual([
        { id: 'medecin-1', nom: 'Ndiaye', prenom: 'Awa', roles: [Role.MEDECIN] },
        { id: 'infirmier-1', nom: 'Sow', prenom: 'Moussa', roles: [Role.INFIRMIER] },
      ]);
    });

    it('renvoie une liste vide sans interroger les utilisateurs si aucun rôle soignant n’existe', async () => {
      userRolesRepository.find.mockResolvedValue([]);

      const praticiens = await service.findPraticiensByEtablissement('etab-1');

      expect(praticiens).toEqual([]);
      expect(usersRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('estPraticienValide', () => {
    it('renvoie true pour un utilisateur du même établissement ayant un rôle soignant', async () => {
      usersRepository.findOne.mockResolvedValue({ id: 'medecin-1', etablissementId: 'etab-1' });
      userRolesRepository.find.mockResolvedValue([{ userId: 'medecin-1', role: Role.MEDECIN }]);

      await expect(service.estPraticienValide('medecin-1', 'etab-1')).resolves.toBe(true);
    });

    it('renvoie false si l’utilisateur n’existe pas dans cet établissement', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.estPraticienValide('inconnu', 'etab-1')).resolves.toBe(false);
    });

    it('renvoie false si l’utilisateur n’a aucun rôle soignant (ex: secrétaire médicale)', async () => {
      usersRepository.findOne.mockResolvedValue({ id: 'secretaire-1', etablissementId: 'etab-1' });
      userRolesRepository.find.mockResolvedValue([{ userId: 'secretaire-1', role: Role.SECRETAIRE_MEDICALE }]);

      await expect(service.estPraticienValide('secretaire-1', 'etab-1')).resolves.toBe(false);
    });
  });
});
