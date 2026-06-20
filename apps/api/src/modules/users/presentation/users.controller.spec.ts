import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Permission, Role, Scope } from '@sih-saas/shared';
import { UsersController } from './users.controller';

describe('UsersController — sécurité (Phase 11)', () => {
  let usersService: { create: jest.Mock; findById: jest.Mock; setAffectation: jest.Mock; findByEtablissement: jest.Mock };
  let controller: UsersController;

  beforeEach(() => {
    usersService = {
      create: jest.fn(),
      findById: jest.fn(),
      setAffectation: jest.fn(),
      findByEtablissement: jest.fn(),
    };
    controller = new UsersController(usersService as any);
  });

  describe('create — mass assignment scope/roles', () => {
    const currentUserEtablissement = {
      sub: 'admin-1',
      scope: Scope.ETABLISSEMENT,
      etablissementId: 'etab-1',
      roles: [],
      permissions: [],
      serviceId: null,
    };

    it('force scope=ETABLISSEMENT et son propre etablissementId, ignore dto.scope/dto.etablissementId', async () => {
      const dto = {
        scope: Scope.PLATFORM,
        etablissementId: 'etab-attaquant',
        nom: 'X',
        prenom: 'Y',
        email: 'x@y.sn',
        password: 'Password123!',
      } as any;

      await controller.create(dto, currentUserEtablissement as any);

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ scope: Scope.ETABLISSEMENT, etablissementId: 'etab-1' }),
      );
    });

    it('refuse roles=[SUPER_ADMIN] pour un appelant ETABLISSEMENT', async () => {
      const dto = {
        scope: Scope.ETABLISSEMENT,
        roles: [Role.SUPER_ADMIN],
        nom: 'X',
        prenom: 'Y',
        email: 'x@y.sn',
        password: 'Password123!',
      } as any;

      expect(() => controller.create(dto, currentUserEtablissement as any)).toThrow(BadRequestException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('laisse passer dto.scope tel quel pour un appelant PLATFORM', async () => {
      const currentUserPlatform = { sub: 'super-1', scope: Scope.PLATFORM, etablissementId: null, roles: [], permissions: [], serviceId: null };
      const dto = { scope: Scope.ETABLISSEMENT, etablissementId: 'etab-2', nom: 'X', prenom: 'Y', email: 'x@y.sn', password: 'Password123!' } as any;

      await controller.create(dto, currentUserPlatform as any);

      expect(usersService.create).toHaveBeenCalledWith(expect.objectContaining({ etablissementId: 'etab-2' }));
    });
  });

  describe('findOne — BOLA cross-tenant', () => {
    it('refuse (404) un utilisateur d’un autre établissement pour un appelant ETABLISSEMENT', async () => {
      usersService.findById.mockResolvedValue({ id: 'user-b', etablissementId: 'etab-b' });
      const currentUser = {
        sub: 'admin-a',
        scope: Scope.ETABLISSEMENT,
        etablissementId: 'etab-a',
        roles: [],
        permissions: [Permission.UTILISATEUR_MANAGE],
        serviceId: null,
      };

      await expect(controller.findOne('user-b', currentUser as any)).rejects.toThrow(NotFoundException);
    });

    it('autorise un utilisateur du même établissement', async () => {
      usersService.findById.mockResolvedValue({ id: 'user-a', etablissementId: 'etab-a' });
      const currentUser = {
        sub: 'admin-a',
        scope: Scope.ETABLISSEMENT,
        etablissementId: 'etab-a',
        roles: [],
        permissions: [Permission.UTILISATEUR_MANAGE],
        serviceId: null,
      };

      await expect(controller.findOne('user-a', currentUser as any)).resolves.toEqual({ id: 'user-a', etablissementId: 'etab-a' });
    });

    it('autorise un appelant PLATFORM à lire n’importe quel établissement', async () => {
      usersService.findById.mockResolvedValue({ id: 'user-b', etablissementId: 'etab-b' });
      const currentUser = {
        sub: 'super-1',
        scope: Scope.PLATFORM,
        etablissementId: null,
        roles: [],
        permissions: [Permission.UTILISATEUR_MANAGE],
        serviceId: null,
      };

      await expect(controller.findOne('user-b', currentUser as any)).resolves.toEqual({ id: 'user-b', etablissementId: 'etab-b' });
    });
  });

  describe('setAffectation — BOLA cross-tenant', () => {
    it('refuse (404) d’affecter un utilisateur d’un autre établissement', async () => {
      usersService.findById.mockResolvedValue({ id: 'user-b', etablissementId: 'etab-b' });
      const currentUser = { sub: 'admin-a', scope: Scope.ETABLISSEMENT, etablissementId: 'etab-a', roles: [], permissions: [], serviceId: null };

      await expect(controller.setAffectation('user-b', { serviceId: 'service-1' } as any, currentUser as any)).rejects.toThrow(
        NotFoundException,
      );
      expect(usersService.setAffectation).not.toHaveBeenCalled();
    });

    it('délègue au service pour un utilisateur du même établissement', async () => {
      usersService.findById.mockResolvedValue({ id: 'user-a', etablissementId: 'etab-a' });
      const currentUser = { sub: 'admin-a', scope: Scope.ETABLISSEMENT, etablissementId: 'etab-a', roles: [], permissions: [], serviceId: null };

      await controller.setAffectation('user-a', { serviceId: 'service-1' } as any, currentUser as any);

      expect(usersService.setAffectation).toHaveBeenCalledWith('user-a', 'service-1', 'admin-a');
    });
  });

  describe('findAll / findOne — OR (UTILISATEUR_MANAGE | RH_MANAGE), Phase 11', () => {
    it('findAll autorise un appelant avec uniquement RH_MANAGE', async () => {
      usersService.findByEtablissement.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0, totalPages: 0 });
      const currentUser = {
        sub: 'rh-1',
        scope: Scope.ETABLISSEMENT,
        etablissementId: 'etab-a',
        roles: [],
        permissions: [Permission.RH_MANAGE],
        serviceId: null,
      };

      await expect(controller.findAll({ page: 1, limit: 20 } as any, currentUser as any)).resolves.toBeDefined();
    });

    it('findAll refuse un appelant sans UTILISATEUR_MANAGE ni RH_MANAGE', async () => {
      const currentUser = {
        sub: 'agent-1',
        scope: Scope.ETABLISSEMENT,
        etablissementId: 'etab-a',
        roles: [],
        permissions: [],
        serviceId: null,
      };

      expect(() => controller.findAll({ page: 1, limit: 20 } as any, currentUser as any)).toThrow(ForbiddenException);
      expect(usersService.findByEtablissement).not.toHaveBeenCalled();
    });

    it('findOne autorise un appelant avec uniquement RH_MANAGE (même établissement)', async () => {
      usersService.findById.mockResolvedValue({ id: 'user-a', etablissementId: 'etab-a' });
      const currentUser = {
        sub: 'rh-1',
        scope: Scope.ETABLISSEMENT,
        etablissementId: 'etab-a',
        roles: [],
        permissions: [Permission.RH_MANAGE],
        serviceId: null,
      };

      await expect(controller.findOne('user-a', currentUser as any)).resolves.toEqual({ id: 'user-a', etablissementId: 'etab-a' });
    });

    it('findOne refuse un appelant sans UTILISATEUR_MANAGE ni RH_MANAGE', async () => {
      const currentUser = {
        sub: 'agent-1',
        scope: Scope.ETABLISSEMENT,
        etablissementId: 'etab-a',
        roles: [],
        permissions: [],
        serviceId: null,
      };

      await expect(controller.findOne('user-a', currentUser as any)).rejects.toThrow(ForbiddenException);
      expect(usersService.findById).not.toHaveBeenCalled();
    });
  });
});
