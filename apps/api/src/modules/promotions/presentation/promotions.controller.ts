import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Public } from '../../../shared/decorators/public.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PromotionsService } from '../application/promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  // Déclarée avant ":id" pour que "actives" ne soit jamais capturé par le paramètre.
  @Public()
  @Get('actives')
  @ResponseMessage('Promotions en cours.')
  findActives() {
    return this.promotionsService.findActives();
  }

  @Get()
  @ApiBearerAuth()
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.COUPON_MANAGE)
  @ResponseMessage('Liste des promotions.')
  findAll() {
    return this.promotionsService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.COUPON_MANAGE)
  @ResponseMessage('Promotion récupérée.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotionsService.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.COUPON_MANAGE)
  @ResponseMessage('Promotion créée avec succès.')
  create(@Body() dto: CreatePromotionDto, @CurrentUser() currentUser: JwtPayload) {
    return this.promotionsService.create(dto, currentUser.sub);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.COUPON_MANAGE)
  @ResponseMessage('Promotion mise à jour.')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePromotionDto, @CurrentUser() currentUser: JwtPayload) {
    return this.promotionsService.update(id, dto, currentUser.sub);
  }

  @Patch(':id/activer')
  @ApiBearerAuth()
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.COUPON_MANAGE)
  @ResponseMessage('Promotion activée.')
  activer(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.promotionsService.setActif(id, true, currentUser.sub);
  }

  @Patch(':id/desactiver')
  @ApiBearerAuth()
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.COUPON_MANAGE)
  @ResponseMessage('Promotion désactivée.')
  desactiver(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.promotionsService.setActif(id, false, currentUser.sub);
  }
}
