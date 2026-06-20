import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { JwtPayload, Permission, Role, Scope } from '@sih-saas/shared';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { UsersService } from '../application/users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateAffectationDto } from './dto/update-affectation.dto';

@ApiTags('Utilisateurs')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Sécurité (Phase 11) : `scope`/`roles` ne viennent JAMAIS tels quels du corps de requête pour un
   * appelant ETABLISSEMENT — sinon un admin établissement peut se créer un compte PLATFORM/SUPER_ADMIN
   * (mass assignment / élévation de privilèges, OWASP API3:2023).
   */
  @Post()
  @Scopes(Scope.PLATFORM, Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.UTILISATEUR_MANAGE)
  @ResponseMessage('Utilisateur créé avec succès.')
  create(@Body() dto: CreateUserDto, @CurrentUser() currentUser: JwtPayload) {
    if (currentUser.scope === Scope.ETABLISSEMENT) {
      if (dto.roles?.includes(Role.SUPER_ADMIN)) {
        throw new BadRequestException('Rôle non autorisé pour un compte établissement.');
      }
      return this.usersService.create({ ...dto, scope: Scope.ETABLISSEMENT, etablissementId: currentUser.etablissementId! });
    }
    return this.usersService.create({ ...dto, etablissementId: dto.etablissementId });
  }

  /** Pas de @RequirePermissions : OR (UTILISATEUR_MANAGE | RH_MANAGE) impossible à exprimer avec ce décorateur (ET logique, voir permissions.guard.ts) — vérifié manuellement ci-dessous. RH_MANAGE = lecture seule de l'annuaire (matrice-rbac.md : « aucun accès clinique ni administratif établissement »). */
  @Get()
  @Scopes(Scope.ETABLISSEMENT)
  @ResponseMessage('Liste des utilisateurs de l’établissement.')
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() currentUser: JwtPayload) {
    this.assertAnnuairePersonnelAccess(currentUser);
    return this.usersService.findByEtablissement(currentUser.etablissementId!, query.page, query.limit);
  }

  /** Déclarée avant `:id` pour ne pas être capturée par le paramètre (même précaution que /patients/me). */
  @Get('praticiens')
  @Scopes(Scope.PATIENT)
  @RequirePermissions(Permission.RDV_CREATE)
  @ResponseMessage('Praticiens de mon établissement.')
  findPraticiens(@CurrentUser() currentUser: JwtPayload) {
    return this.usersService.findPraticiensByEtablissement(currentUser.etablissementId!);
  }

  /**
   * Sécurité (Phase 11) : `platform.users` n'a pas de RLS — un appelant ETABLISSEMENT ne doit jamais lire un utilisateur d'un autre établissement (BOLA, OWASP API1:2023). `NotFoundException` plutôt que `Forbidden` pour ne pas révéler l'existence du compte.
   * Pas de @RequirePermissions : même OR (UTILISATEUR_MANAGE | RH_MANAGE) que `findAll`, vérifié manuellement.
   */
  @Get(':id')
  @Scopes(Scope.PLATFORM, Scope.ETABLISSEMENT)
  @ResponseMessage('Utilisateur récupéré.')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    this.assertAnnuairePersonnelAccess(currentUser);
    const user = await this.usersService.findById(id);
    if (currentUser.scope === Scope.ETABLISSEMENT && user.etablissementId !== currentUser.etablissementId) {
      throw new NotFoundException('Utilisateur introuvable.');
    }
    return user;
  }

  /** OR (UTILISATEUR_MANAGE | RH_MANAGE), impossible à exprimer avec @RequirePermissions (ET logique). */
  private assertAnnuairePersonnelAccess(user: JwtPayload): void {
    if (!user.permissions.includes(Permission.UTILISATEUR_MANAGE) && !user.permissions.includes(Permission.RH_MANAGE)) {
      throw new ForbiddenException('Accès refusé : permission manquante pour cette action.');
    }
  }

  /** Sécurité (Phase 11) : même garde cross-tenant que `findOne`, + `serviceId` vérifié appartenir au même établissement (UsersService.setAffectation). */
  @Patch(':id/affectation')
  @Scopes(Scope.ETABLISSEMENT)
  @RequirePermissions(Permission.UTILISATEUR_MANAGE)
  @ResponseMessage('Affectation mise à jour.')
  async setAffectation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAffectationDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const user = await this.usersService.findById(id);
    if (user.etablissementId !== currentUser.etablissementId) {
      throw new NotFoundException('Utilisateur introuvable.');
    }
    return this.usersService.setAffectation(id, dto.serviceId ?? null, currentUser.sub);
  }
}
