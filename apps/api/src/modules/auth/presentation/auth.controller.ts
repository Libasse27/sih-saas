import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Public } from '../../../shared/decorators/public.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { JwtPayload } from '@sih-saas/shared';
import { UsersService } from '../../users/application/users.service';
import { AuthService } from '../application/auth.service';
import { RegistrationService } from '../application/registration.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly registrationService: RegistrationService,
  ) {}

  @Public()
  @Post('register')
  @ResponseMessage('Établissement créé. Connectez-vous pour continuer.')
  register(@Body() dto: RegisterDto) {
    return this.registrationService.register(dto);
  }

  @Public()
  @Post('login')
  @ResponseMessage('Connexion réussie.')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const { tokens, user } = await this.authService.login(dto.email, dto.password, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

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
}
