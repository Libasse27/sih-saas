import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission, Scope } from '@sih-saas/shared';
import { Public } from '../../../shared/decorators/public.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PlansService } from '../application/plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@ApiTags('Plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Public()
  @Get()
  @ResponseMessage('Catalogue des forfaits.')
  findPublic() {
    return this.plansService.findPublic();
  }

  @Get('admin')
  @ApiBearerAuth()
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.PLAN_MANAGE)
  @ResponseMessage('Catalogue complet des forfaits.')
  findAllAdmin() {
    return this.plansService.findAllAdmin();
  }

  @Get(':id')
  @ApiBearerAuth()
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.PLAN_MANAGE)
  @ResponseMessage('Plan récupéré.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.plansService.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.PLAN_MANAGE)
  @ResponseMessage('Plan créé avec succès.')
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.PLAN_MANAGE)
  @ResponseMessage('Plan mis à jour.')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  @Patch(':id/activer')
  @ApiBearerAuth()
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.PLAN_MANAGE)
  @ResponseMessage('Plan activé.')
  activer(@Param('id', ParseUUIDPipe) id: string) {
    return this.plansService.setActif(id, true);
  }

  @Patch(':id/desactiver')
  @ApiBearerAuth()
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.PLAN_MANAGE)
  @ResponseMessage('Plan désactivé.')
  desactiver(@Param('id', ParseUUIDPipe) id: string) {
    return this.plansService.setActif(id, false);
  }
}
