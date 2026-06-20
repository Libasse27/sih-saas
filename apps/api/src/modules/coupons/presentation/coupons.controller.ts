import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Public } from '../../../shared/decorators/public.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { CouponsService } from '../application/coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  // Déclarée avant ":id" pour que "valider" ne soit jamais capturé par le paramètre.
  @Public()
  @Get('valider/:code')
  @ResponseMessage('Coupon valide.')
  valider(@Param('code') code: string, @Query('planId') planId?: string) {
    return this.couponsService.valider(code, planId);
  }

  @Get()
  @ApiBearerAuth()
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.COUPON_MANAGE)
  @ResponseMessage('Liste des coupons.')
  findAll() {
    return this.couponsService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.COUPON_MANAGE)
  @ResponseMessage('Coupon récupéré.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponsService.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.COUPON_MANAGE)
  @ResponseMessage('Coupon créé avec succès.')
  create(@Body() dto: CreateCouponDto, @CurrentUser() currentUser: JwtPayload) {
    return this.couponsService.create(dto, currentUser.sub);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.COUPON_MANAGE)
  @ResponseMessage('Coupon mis à jour.')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCouponDto, @CurrentUser() currentUser: JwtPayload) {
    return this.couponsService.update(id, dto, currentUser.sub);
  }

  @Patch(':id/activer')
  @ApiBearerAuth()
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.COUPON_MANAGE)
  @ResponseMessage('Coupon activé.')
  activer(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.couponsService.setActif(id, true, currentUser.sub);
  }

  @Patch(':id/desactiver')
  @ApiBearerAuth()
  @Scopes(Scope.PLATFORM)
  @RequirePermissions(Permission.COUPON_MANAGE)
  @ResponseMessage('Coupon désactivé.')
  desactiver(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.couponsService.setActif(id, false, currentUser.sub);
  }
}
