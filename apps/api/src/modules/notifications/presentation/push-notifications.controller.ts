import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtPayload } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { PushNotificationsService } from '../application/push-notifications.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';

/** Pas de @Scopes/@RequirePermissions : tout compte authentifié gère ses propres jetons d'appareil (Phase 14). */
@ApiTags('Notifications push')
@ApiBearerAuth()
@Controller('notifications/device-tokens')
export class PushNotificationsController {
  constructor(private readonly pushNotificationsService: PushNotificationsService) {}

  @Post()
  @ResponseMessage('Appareil enregistré pour les notifications push.')
  enregistrer(@Body() dto: RegisterDeviceTokenDto, @CurrentUser() currentUser: JwtPayload) {
    return this.pushNotificationsService.enregistrer(currentUser.sub, dto.token, dto.plateforme);
  }

  @Delete(':token')
  @ResponseMessage('Appareil désinscrit des notifications push.')
  supprimer(@Param('token') token: string) {
    return this.pushNotificationsService.supprimer(token);
  }
}
