import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JournalCode, ModuleMetier, Permission, Scope } from '@sih-saas/shared';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { ComptabiliteService } from '../application/comptabilite.service';
import { CreateEcritureOdDto } from './dto/create-ecriture-od.dto';

@ApiTags('Comptabilité')
@ApiBearerAuth()
@Controller('comptabilite')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.COMPTABILITE_FACTURATION)
export class ComptabiliteController {
  constructor(private readonly service: ComptabiliteService) {}

  @Get('journal')
  @RequirePermissions(Permission.COMPTA_JOURNAL_READ)
  @ResponseMessage('Journal comptable.')
  @ApiQuery({ name: 'dateDebut', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'dateFin', required: false, example: '2026-12-31' })
  @ApiQuery({ name: 'journalCode', required: false, enum: JournalCode })
  getJournal(
    @Query('dateDebut') dateDebut?: string,
    @Query('dateFin') dateFin?: string,
    @Query('journalCode') journalCode?: JournalCode,
  ) {
    return this.service.getJournal({ dateDebut, dateFin, journalCode });
  }

  @Get('balance')
  @RequirePermissions(Permission.COMPTA_BILAN_READ)
  @ResponseMessage('Balance des comptes SYSCOHADA.')
  getBalance() {
    return this.service.getBalance();
  }

  @Post('ecritures/od')
  @RequirePermissions(Permission.COMPTA_JOURNAL_WRITE)
  @ResponseMessage('Écriture OD créée.')
  creerOD(@Body() dto: CreateEcritureOdDto, @Request() req: { user: { sub: string } }) {
    return this.service.creerEcritureOD(dto, req.user.sub);
  }
}
