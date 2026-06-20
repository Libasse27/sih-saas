import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { SettingsService } from '../application/settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('Paramètres plateforme')
@ApiBearerAuth()
@Controller('settings')
@Scopes(Scope.PLATFORM)
@RequirePermissions(Permission.SETTING_PLATEFORME_MANAGE)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ResponseMessage('Paramètres plateforme.')
  get() {
    return this.settingsService.getOrCreate();
  }

  @Patch()
  @ResponseMessage('Paramètres mis à jour.')
  update(@Body() dto: UpdateSettingsDto, @CurrentUser() currentUser: JwtPayload) {
    return this.settingsService.update(dto, currentUser.sub);
  }
}
