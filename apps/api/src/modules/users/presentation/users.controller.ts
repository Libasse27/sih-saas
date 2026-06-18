import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { UsersService } from '../application/users.service';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('Utilisateurs')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Scopes(Scope.PLATFORM, Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.UTILISATEUR_MANAGE)
  @ResponseMessage('Utilisateur créé avec succès.')
  create(@Body() dto: CreateUserDto, @CurrentUser() currentUser: JwtPayload) {
    // Un compte ETABLISSEMENT ne peut créer des utilisateurs que dans son propre établissement.
    const etablissementId =
      currentUser.scope === Scope.ETABLISSEMENT ? currentUser.etablissementId! : dto.etablissementId;
    return this.usersService.create({ ...dto, etablissementId });
  }

  @Get()
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.UTILISATEUR_MANAGE)
  @ResponseMessage('Liste des utilisateurs de l’établissement.')
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() currentUser: JwtPayload) {
    return this.usersService.findByEtablissement(currentUser.etablissementId!, query.page, query.limit);
  }

  @Get(':id')
  @Scopes(Scope.PLATFORM, Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.UTILISATEUR_MANAGE)
  @ResponseMessage('Utilisateur récupéré.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }
}
