import { BadRequestException } from '@nestjs/common';
import { authenticator } from 'otplib';
import { UsersService } from '../../users/application/users.service';
import { UserEntity } from '../../users/infrastructure/entities/user.entity';
import { MfaService } from './mfa.service';

describe('MfaService', () => {
  let usersService: jest.Mocked<Pick<UsersService, 'setMfaSecret' | 'enableMfa' | 'disableMfa'>>;
  let service: MfaService;

  const buildUser = (overrides: Partial<UserEntity> = {}): UserEntity =>
    ({ id: 'user-1', email: 'awa.diop@example.sn', mfaSecret: null, ...overrides }) as UserEntity;

  beforeEach(() => {
    usersService = { setMfaSecret: jest.fn(), enableMfa: jest.fn(), disableMfa: jest.fn() };
    service = new MfaService(usersService as unknown as UsersService);
  });

  describe('demarrerActivation', () => {
    it('génère un secret, le persiste et renvoie une URI otpauth pour cet email', async () => {
      const resultat = await service.demarrerActivation(buildUser());

      expect(usersService.setMfaSecret).toHaveBeenCalledWith('user-1', resultat.secret);
      expect(resultat.otpauthUri).toContain('awa.diop%40example.sn');
      expect(resultat.otpauthUri).toContain('SIH-SaaS');
    });
  });

  describe('confirmerActivation', () => {
    it('active le MFA avec un code TOTP valide', async () => {
      const secret = authenticator.generateSecret();
      const code = authenticator.generate(secret);

      await service.confirmerActivation(buildUser({ mfaSecret: secret }), code);

      expect(usersService.enableMfa).toHaveBeenCalledWith('user-1');
    });

    it('rejette un code invalide sans activer le MFA', async () => {
      const user = buildUser({ mfaSecret: authenticator.generateSecret() });

      await expect(service.confirmerActivation(user, '000000')).rejects.toThrow(BadRequestException);
      expect(usersService.enableMfa).not.toHaveBeenCalled();
    });

    it('rejette si aucun secret en attente', async () => {
      await expect(service.confirmerActivation(buildUser({ mfaSecret: null }), '123456')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('desactiver', () => {
    it('désactive le MFA avec un code valide', async () => {
      const secret = authenticator.generateSecret();
      const code = authenticator.generate(secret);

      await service.desactiver(buildUser({ mfaSecret: secret }), code);

      expect(usersService.disableMfa).toHaveBeenCalledWith('user-1');
    });

    it('rejette un code invalide', async () => {
      const user = buildUser({ mfaSecret: authenticator.generateSecret() });

      await expect(service.desactiver(user, '000000')).rejects.toThrow(BadRequestException);
      expect(usersService.disableMfa).not.toHaveBeenCalled();
    });
  });

  describe('verifierCode', () => {
    it('renvoie true pour un code valide, false sinon', () => {
      const secret = authenticator.generateSecret();
      const code = authenticator.generate(secret);
      const user = buildUser({ mfaSecret: secret });

      expect(service.verifierCode(user, code)).toBe(true);
      expect(service.verifierCode(user, '000000')).toBe(false);
    });

    it('renvoie false si aucun secret', () => {
      expect(service.verifierCode(buildUser({ mfaSecret: null }), '123456')).toBe(false);
    });
  });
});
