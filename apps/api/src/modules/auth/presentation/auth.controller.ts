import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Public } from '../../../shared/decorators/public.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { JwtPayload } from '@sih-saas/shared';
import { UsersService } from '../../users/application/users.service';
import { AuthService } from '../application/auth.service';
import { MfaService } from '../application/mfa.service';
import { RegistrationService } from '../application/registration.service';
import { LoginDto } from './dto/login.dto';
import { MfaCodeDto } from './dto/mfa-code.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

/** Limites plus strictes que la limite globale (Phase 11) : ces routes sont `@Public()` (pas de JWT) et donc les cibles privilégiées du brute-force/credential stuffing. */
@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly registrationService: RegistrationService,
    private readonly mfaService: MfaService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('register')
  @ResponseMessage('Établissement créé. Connectez-vous pour continuer.')
  register(@Body() dto: RegisterDto) {
    return this.registrationService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @ResponseMessage('Connexion réussie.')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const { tokens, user } = await this.authService.login(
      dto.email,
      dto.password,
      { ip: req.ip, userAgent: req.headers['user-agent'] },
      dto.mfaCode,
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        scope: user.scope,
        etablissementId: user.etablissementId,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
      },
    };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  @ResponseMessage('Jetons rafraîchis avec succès.')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Déconnexion réussie.')
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
    return null;
  }

  @Get('me')
  @ApiBearerAuth()
  @ResponseMessage('Profil utilisateur courant.')
  me(@CurrentUser() currentUser: JwtPayload) {
    return this.usersService.findById(currentUser.sub);
  }

  /** Étape 1/2 — génère un secret TOTP (en attente de confirmation, `mfaEnabled` reste `false`). */
  @Post('mfa/activer')
  @ApiBearerAuth()
  @ResponseMessage('Scannez le QR code puis confirmez avec un code pour activer le MFA.')
  async activerMfa(@CurrentUser() currentUser: JwtPayload) {
    const user = await this.usersService.findById(currentUser.sub);
    return this.mfaService.demarrerActivation(user);
  }

  /** Étape 2/2 — confirme le premier code TOTP, active réellement le MFA. Throttle dédié : brute-force d'un code à 6 chiffres. */
  @Post('mfa/verifier')
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ResponseMessage('MFA activé avec succès.')
  async verifierMfa(@CurrentUser() currentUser: JwtPayload, @Body() dto: MfaCodeDto) {
    const user = await this.usersService.findByIdWithMfaSecret(currentUser.sub);
    await this.mfaService.confirmerActivation(user, dto.code);
    return null;
  }

  @Post('mfa/desactiver')
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ResponseMessage('MFA désactivé.')
  async desactiverMfa(@CurrentUser() currentUser: JwtPayload, @Body() dto: MfaCodeDto) {
    const user = await this.usersService.findByIdWithMfaSecret(currentUser.sub);
    await this.mfaService.desactiver(user, dto.code);
    return null;
  }
}
