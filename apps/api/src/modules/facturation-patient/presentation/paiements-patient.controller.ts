import { Body, Controller, ForbiddenException, Get, Headers, Param, ParseUUIDPipe, Post, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClinicalModule, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { Request } from 'express';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Public } from '../../../shared/decorators/public.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PatientsService } from '../../patients/application/patients.service';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { FacturesPatientService } from '../application/factures-patient.service';
import { PaiementsPatientService } from '../application/paiements-patient.service';
import { CreatePaiementPatientDto } from './dto/create-paiement-patient.dto';

/**
 * `/paiements-patient/webhook/:provider` est volontairement séparée de `/payments/webhook/:provider`
 * (flux abonnement, Phase 4) — jamais le même endpoint, jamais le même modèle (prompt maître §15).
 * `PlanFeatureGuard` n'est posé qu'au niveau méthode (pas classe) : les routes `@Public()`
 * (webhook, statut) n'ont pas de `request.user` et planteraient sur `user.etablissementId`.
 */
@ApiTags('Facturation patient — Paiements')
@ApiBearerAuth()
@Controller()
export class PaiementsPatientController {
  constructor(
    private readonly paiementsPatientService: PaiementsPatientService,
    private readonly facturesPatientService: FacturesPatientService,
    private readonly patientsService: PatientsService,
  ) {}

  @Post('factures-patient/:id/paiements')
  @Scopes(Scope.ETABLISSEMENT, Scope.PATIENT)
  @UseGuards(PlanFeatureGuard)
  @RequirePlanFeature(ClinicalModule.FACTURATION)
  @RequirePermissions(Permission.PAIEMENT_PATIENT_CREATE)
  @ResponseMessage('Paiement enregistré.')
  async create(
    @Param('id', ParseUUIDPipe) facturePatientId: string,
    @Body() dto: CreatePaiementPatientDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    if (currentUser.scope === Scope.PATIENT) {
      const patient = await this.patientsService.findByUserId(currentUser.sub);
      const facture = await this.facturesPatientService.findById(facturePatientId);
      if (!patient || facture.patientId !== patient.id) {
        throw new ForbiddenException('Vous ne pouvez payer que vos propres factures.');
      }
      return this.paiementsPatientService.create(facturePatientId, dto, null, currentUser.sub);
    }

    return this.paiementsPatientService.create(facturePatientId, dto, currentUser.sub, currentUser.sub);
  }

  @Get('factures-patient/:id/paiements')
  @Scopes(Scope.ETABLISSEMENT)
  @UseGuards(PlanFeatureGuard)
  @RequirePlanFeature(ClinicalModule.FACTURATION)
  @RequirePermissions(Permission.PAIEMENT_PATIENT_CREATE)
  @ResponseMessage('Paiements de la facture.')
  findAll(@Param('id', ParseUUIDPipe) facturePatientId: string) {
    return this.paiementsPatientService.findByFacture(facturePatientId);
  }

  // @Body() volontairement absent : chaque fournisseur a son propre format de payload (voir
  // payments.controller.ts, même convention).
  @Public()
  @Post('paiements-patient/webhook/:provider')
  @ResponseMessage('Webhook traité.')
  async webhook(@Param('provider') provider: string, @Req() req: RawBodyRequest<Request>, @Headers() headers: Record<string, string>) {
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    await this.paiementsPatientService.handleWebhook(provider, rawBody, headers);
    return { recu: true };
  }

  @Public()
  @Get('paiements-patient/statut/:reference')
  @ResponseMessage('Statut du paiement.')
  statut(@Param('reference') reference: string) {
    return this.paiementsPatientService.getStatut(reference);
  }
}
