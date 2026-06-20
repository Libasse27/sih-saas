import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtPayload } from '@sih-saas/shared';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { UsersService } from '../../users/application/users.service';
import { UserEntity } from '../../users/infrastructure/entities/user.entity';
import { RefreshTokenEntity } from '../infrastructure/entities/refresh-token.entity';
import { MfaService } from './mfa.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly mfaService: MfaService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokensRepository: Repository<RefreshTokenEntity>,
  ) {}

  async login(
    email: string,
    password: string,
    context: LoginContext = {},
    mfaCode?: string,
  ): Promise<{ tokens: AuthTokens; user: UserEntity }> {
    const user = await this.usersService.findByEmailForAuth(email);

    if (!user) {
      await this.auditService.log({
        action: 'auth.login.failed',
        metadata: { email, raison: 'utilisateur_inconnu' },
        ip: context.ip,
        userAgent: context.userAgent,
      });
      throw new UnauthorizedException('Identifiants invalides.');
    }

    if (this.usersService.isLocked(user)) {
      await this.auditService.log({
        etablissementId: user.etablissementId,
        userId: user.id,
        action: 'auth.login.blocked',
        ip: context.ip,
        userAgent: context.userAgent,
      });
      throw new ForbiddenException('Compte temporairement verrouillé après plusieurs tentatives échouées.');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      await this.usersService.recordFailedLogin(user);
      await this.auditService.log({
        etablissementId: user.etablissementId,
        userId: user.id,
        action: 'auth.login.failed',
        ip: context.ip,
        userAgent: context.userAgent,
      });
      throw new UnauthorizedException('Identifiants invalides.');
    }

    if (user.mfaEnabled) {
      if (!mfaCode) {
        throw new ForbiddenException('Code MFA requis.');
      }
      if (!this.mfaService.verifierCode(user, mfaCode)) {
        await this.usersService.recordFailedLogin(user);
        await this.auditService.log({
          etablissementId: user.etablissementId,
          userId: user.id,
          action: 'auth.mfa.code_invalide',
          ip: context.ip,
          userAgent: context.userAgent,
        });
        throw new UnauthorizedException('Code MFA invalide.');
      }
    }

    await this.usersService.recordSuccessfulLogin(user);
    await this.auditService.log({
      etablissementId: user.etablissementId,
      userId: user.id,
      action: 'auth.login.success',
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return { tokens: await this.issueTokens(user), user };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshTokensRepository.findOne({ where: { tokenHash } });

    if (!stored || stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Jeton de rafraîchissement invalide ou expiré.');
    }

    if (stored.revoked) {
      // Réutilisation d'un refresh token déjà consommé : signe probable de vol -> on révoque toute la session.
      await this.refreshTokensRepository.update({ userId: stored.userId, revoked: false }, { revoked: true });
      await this.auditService.log({ userId: stored.userId, action: 'auth.refresh.reuse_detected' });
      throw new UnauthorizedException('Jeton de rafraîchissement déjà utilisé. Toutes les sessions ont été révoquées.');
    }

    await this.refreshTokensRepository.update(stored.id, { revoked: true });

    const user = await this.usersService.findById(payload.sub);
    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.refreshTokensRepository.update({ tokenHash }, { revoked: true });
  }

  private async issueTokens(user: UserEntity): Promise<AuthTokens> {
    const roles = await this.usersService.getRoles(user.id);
    const permissions = await this.usersService.getEffectivePermissions(user.id, roles);

    const payload: JwtPayload = {
      sub: user.id,
      scope: user.scope,
      etablissementId: user.etablissementId,
      roles,
      permissions,
      serviceId: user.serviceId,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
      },
    );

    await this.storeRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const decoded = this.jwtService.decode(refreshToken) as { exp: number };
    await this.refreshTokensRepository.save(
      this.refreshTokensRepository.create({
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(decoded.exp * 1000),
      }),
    );
  }

  private async verifyRefreshToken(refreshToken: string): Promise<JwtPayload & { sub: string }> {
    try {
      return await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Jeton de rafraîchissement invalide ou expiré.');
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
