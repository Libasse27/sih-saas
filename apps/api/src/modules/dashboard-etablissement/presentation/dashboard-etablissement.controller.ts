import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission, Scope } from '@sih-saas/shared';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { DashboardEtablissementService } from '../application/dashboard-etablissement.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Scopes(Scope.ETABLISSEMENT)
@RequirePermissions(Permission.ETABLISSEMENT_SETTINGS)
@Controller('dashboard/etablissement')
export class DashboardEtablissementController {
  constructor(private readonly service: DashboardEtablissementService) {}

  @Get()
  @ResponseMessage('Tableau de bord établissement.')
  getStats() {
    return this.service.getStats();
  }
}
