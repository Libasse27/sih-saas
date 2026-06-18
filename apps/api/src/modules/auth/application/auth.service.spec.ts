import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Scope } from '@sih-saas/shared';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../../audit/application/audit.service';
import { UsersService } from '../../users/application/users.service';
import { UserEntity } from '../../users/infrastructure/entities/user.entity';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, 'findByEmailForAuth' | 'isLocked' | 'recordFailedLogin' | 'recordSuccessfulLogin' | 'findById' | 'getRoles' | 'getEffectivePermissions'>>;
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock; decode: jest.Mock };
  let auditService: jest.Mocked<Pick<AuditService, 'log'>>;
  let refreshTokensRepository: { findOne: jest.Mock; update: jest.Mock; save: jest.Mock; create: jest.Mock };

  const buildUser = (overrides: Partial<UserEntity> = {}): UserEntity =>
    ({
      id: 'user-1',
      scope: Scope.ETABLISSEMENT,
      etablissementId: 'etab-1',
      nom: 'Diop',
      prenom: 'Awa',
      email: 'awa.diop@example.sn',
      telephone: null,
      passwordHash: '',
      mfaEnabled: false,
      mfaSecret: null,
      dernierLogin: null,
      tentativesEchouees: 0,
      verrouilleJusqua: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...overrides,
    }) as UserEntity;

  let bonMotDePasseHash: string;

  beforeAll(async () => {
    // Coût bcrypt volontairement bas (vs 12 en production) pour ne pas ralentir la suite de tests.
    bonMotDePasseHash = await bcrypt.hash('BonMotDePasse123', 4);
  });

  beforeEach(() => {
    usersService = {
      findByEmailForAuth: jest.fn(),
      isLocked: jest.fn().mockReturnValue(false),
      recordFailedLogin: jest.fn(),
      recordSuccessfulLogin: jest.fn(),
      findById: jest.fn(),
      getRoles: jest.fn().mockResolvedValue([]),
      getEffectivePermissions: jest.fn().mockResolvedValue([]),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      verifyAsync: jest.fn(),
      decode: jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    };

    auditService = { log: jest.fn() };

    refreshTokensRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
      create: jest.fn((entity) => entity),
    };

    const config = { get: jest.fn().mockReturnValue('dummy-value') };

    authService = new AuthService(
      usersService as unknown as UsersService,
      jwtService as any,
      config as any,
      auditService as unknown as AuditService,
      refreshTokensRepository as any,
    );
  });

  describe('login', () => {
    it('rejette un email inconnu avec un message générique', async () => {
      usersService.findByEmailForAuth.mockResolvedValue(null);

      await expect(authService.login('inconnu@example.sn', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.login.failed' }),
      );
    });

    it('refuse la connexion si le compte est verrouillé', async () => {
      const user = buildUser();
      usersService.findByEmailForAuth.mockResolvedValue(user);
      usersService.isLocked.mockReturnValue(true);

      await expect(authService.login(user.email, 'password123')).rejects.toThrow(ForbiddenException);
    });

    it('incrémente les tentatives échouées sur un mauvais mot de passe (anti-bruteforce)', async () => {
      const user = buildUser({ passwordHash: bonMotDePasseHash });
      usersService.findByEmailForAuth.mockResolvedValue(user);

      await expect(authService.login(user.email, 'MauvaisMotDePasse')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(usersService.recordFailedLogin).toHaveBeenCalledWith(user);
      expect(usersService.recordSuccessfulLogin).not.toHaveBeenCalled();
    });

    it('connecte avec succès, réinitialise les tentatives et émet les jetons', async () => {
      const user = buildUser({ passwordHash: bonMotDePasseHash });
      usersService.findByEmailForAuth.mockResolvedValue(user);

      const result = await authService.login(user.email, 'BonMotDePasse123');

      expect(usersService.recordSuccessfulLogin).toHaveBeenCalledWith(user);
      expect(result.tokens.accessToken).toBe('signed-token');
      expect(result.tokens.refreshToken).toBe('signed-token');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.login.success' }),
      );
    });
  });

  describe('refresh', () => {
    it("détecte la réutilisation d'un refresh token déjà révoqué et révoque toute la session", async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      refreshTokensRepository.findOne.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revoked: true,
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(authService.refresh('un-refresh-token-vole')).rejects.toThrow(UnauthorizedException);
      expect(refreshTokensRepository.update).toHaveBeenCalledWith(
        { userId: 'user-1', revoked: false },
        { revoked: true },
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.refresh.reuse_detected' }),
      );
    });

    it('rejette un refresh token expiré', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      refreshTokensRepository.findOne.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revoked: false,
        expiresAt: new Date(Date.now() - 60_000),
      });

      await expect(authService.refresh('token-expire')).rejects.toThrow(UnauthorizedException);
    });

    it('effectue la rotation : révoque l’ancien jeton et en émet un nouveau', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      refreshTokensRepository.findOne.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revoked: false,
        expiresAt: new Date(Date.now() + 60_000),
      });
      usersService.findById.mockResolvedValue(buildUser());

      const tokens = await authService.refresh('refresh-valide');

      expect(refreshTokensRepository.update).toHaveBeenCalledWith('rt-1', { revoked: true });
      expect(tokens.accessToken).toBe('signed-token');
    });
  });
});
