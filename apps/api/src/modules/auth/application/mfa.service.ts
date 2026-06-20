import { BadRequestException, Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { UsersService } from '../../users/application/users.service';
import { UserEntity } from '../../users/infrastructure/entities/user.entity';

export interface MfaActivationResult {
  secret: string;
  otpauthUri: string;
}

/**
 * TOTP personnel (Phase 11, prompt maître §17 — jamais imposé au patient, qui utilise la
 * biométrie côté mobile). `mfaSecret` reste écrit mais `mfaEnabled=false` tant que
 * `confirmerActivation` n'a pas vérifié un premier code valide — évite qu'un secret généré
 * mais jamais scanné verrouille le compte.
 */
@Injectable()
export class MfaService {
  constructor(private readonly usersService: UsersService) {}

  async demarrerActivation(user: UserEntity): Promise<MfaActivationResult> {
    const secret = authenticator.generateSecret();
    await this.usersService.setMfaSecret(user.id, secret);
    return { secret, otpauthUri: authenticator.keyuri(user.email, 'SIH-SaaS', secret) };
  }

  async confirmerActivation(user: UserEntity, code: string): Promise<void> {
    if (!user.mfaSecret || !authenticator.check(code, user.mfaSecret)) {
      throw new BadRequestException('Code MFA invalide.');
    }
    await this.usersService.enableMfa(user.id);
  }

  async desactiver(user: UserEntity, code: string): Promise<void> {
    if (!user.mfaSecret || !authenticator.check(code, user.mfaSecret)) {
      throw new BadRequestException('Code MFA invalide.');
    }
    await this.usersService.disableMfa(user.id);
  }

  verifierCode(user: UserEntity, code: string): boolean {
    return !!user.mfaSecret && authenticator.check(code, user.mfaSecret);
  }
}
