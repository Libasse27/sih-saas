import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { FacturePatientStatut, ModePaiementPatient, PaymentProviderType, PaymentStatut } from '@sih-saas/shared';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { PaymentGatewayRegistry } from '../../payments/infrastructure/providers/payment-gateway-registry';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { PaiementPatientEntity } from '../infrastructure/entities/paiement-patient.entity';
import { CreatePaiementPatientDto } from '../presentation/dto/create-paiement-patient.dto';
import { FacturesPatientService } from './factures-patient.service';

export interface CreatePaiementPatientResult {
  paiement: PaiementPatientEntity;
  redirectUrl?: string;
}

/** Segments d'URL (kebab-case) -> enum — même convention que payments.service.ts (Flux A). */
export const PROVIDER_PARAM_VERS_TYPE: Record<string, PaymentProviderType> = {
  sandbox: PaymentProviderType.SANDBOX,
  wave: PaymentProviderType.WAVE,
  'orange-money': PaymentProviderType.ORANGE_MONEY,
};

/** Mode de paiement choisi par le patient/caissier -> passerelle technique (Phase 17, pas de Settings ici : le choix est par transaction, pas une configuration plateforme). */
const MODE_VERS_PROVIDER: Partial<Record<ModePaiementPatient, PaymentProviderType>> = {
  [ModePaiementPatient.ORANGE_MONEY]: PaymentProviderType.ORANGE_MONEY,
  [ModePaiementPatient.WAVE]: PaymentProviderType.WAVE,
  [ModePaiementPatient.CARTE]: PaymentProviderType.CARTE,
};

/**
 * Flux soins (patient -> établissement) — réutilise PaymentGatewayRegistry (infra partagée avec le
 * flux abonnement, PaymentsModule Phase 4/17) mais reste strictement séparé en modèle/endpoint/reporting
 * (prompt maître §15). `clinic.paiements_patient` est protégée par RLS.
 */
@Injectable()
export class PaiementsPatientService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly facturesPatientService: FacturesPatientService,
    private readonly gatewayRegistry: PaymentGatewayRegistry,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<PaiementPatientEntity> {
    return this.tenantContext.getManager().getRepository(PaiementPatientEntity);
  }

  async create(
    facturePatientId: string,
    dto: CreatePaiementPatientDto,
    caissierId: string | null,
    actingUserId: string,
  ): Promise<CreatePaiementPatientResult> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const facture = await this.facturesPatientService.findById(facturePatientId);

    if (facture.statut === FacturePatientStatut.ANNULEE) {
      throw new ConflictException('Cette facture est annulée.');
    }
    if (facture.statut === FacturePatientStatut.PAYEE) {
      throw new ConflictException('Cette facture est déjà entièrement payée.');
    }

    const estEspece = dto.mode === ModePaiementPatient.CAISSE;
    if (estEspece && !caissierId) {
      throw new BadRequestException('Un encaissement au comptant requiert un caissier identifié.');
    }

    const reference = randomUUID();
    const paiement = await this.repository.save(
      this.repository.create({
        etablissementId,
        facturePatientId,
        montant: dto.montant,
        mode: dto.mode,
        reference,
        statut: estEspece ? PaymentStatut.REUSSI : PaymentStatut.EN_ATTENTE,
        caissierId,
        date: new Date(),
      }),
    );

    if (estEspece) {
      await this.recalculerFacture(facturePatientId);
      return { paiement };
    }

    const providerType = MODE_VERS_PROVIDER[dto.mode];
    if (!providerType) {
      throw new BadRequestException(`Mode de paiement "${dto.mode}" non pris en charge.`);
    }
    const gateway = this.gatewayRegistry.get(providerType);

    const { redirectUrl, providerReference } = await gateway.initier({
      reference,
      montant: dto.montant,
      devise: 'XOF',
      etablissementId,
    });
    await this.repository.update({ reference }, { providerReference });

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'paiement-patient.create',
      ressource: 'paiement_patient',
      ressourceId: paiement.id,
      metadata: { facturePatientId, montant: dto.montant, mode: dto.mode },
    });

    return { paiement, redirectUrl };
  }

  async handleWebhook(providerParam: string, rawBody: string, headers: Record<string, string | undefined>): Promise<void> {
    const providerType = PROVIDER_PARAM_VERS_TYPE[providerParam.toLowerCase()];
    if (!providerType) {
      throw new NotFoundException(`Passerelle "${providerParam}" non configurée.`);
    }
    const gateway = this.gatewayRegistry.get(providerType);

    if (!(await gateway.verifierWebhook(rawBody, headers))) {
      throw new UnauthorizedException('Signature de webhook invalide.');
    }

    const { reference, statut } = await gateway.extraireStatutPaiement(rawBody, headers);

    const paiement = await this.repository.findOne({ where: { reference } });
    if (!paiement) {
      throw new NotFoundException('Paiement introuvable.');
    }

    // Idempotence : un webhook déjà traité ne doit jamais recompter le paiement.
    if (paiement.statut !== PaymentStatut.EN_ATTENTE) {
      return;
    }

    paiement.statut = statut === 'REUSSI' ? PaymentStatut.REUSSI : PaymentStatut.ECHOUE;
    paiement.rawPayload = JSON.parse(rawBody);
    await this.repository.save(paiement);

    await this.auditService.log({
      etablissementId: paiement.etablissementId,
      action: 'paiement-patient.webhook',
      ressource: 'paiement_patient',
      ressourceId: paiement.id,
      metadata: { statut: paiement.statut, reference: paiement.reference },
    });

    if (paiement.statut === PaymentStatut.REUSSI) {
      await this.recalculerFacture(paiement.facturePatientId);
    }
  }

  async findByFacture(facturePatientId: string): Promise<PaiementPatientEntity[]> {
    return this.repository.find({ where: { facturePatientId }, order: { date: 'DESC' } });
  }

  async getStatut(reference: string): Promise<PaiementPatientEntity> {
    const paiement = await this.repository.findOne({ where: { reference } });
    if (!paiement) {
      throw new NotFoundException('Paiement introuvable.');
    }
    return paiement;
  }

  private async recalculerFacture(facturePatientId: string): Promise<void> {
    const paiementsReussis = await this.repository.find({
      where: { facturePatientId, statut: PaymentStatut.REUSSI },
    });
    const sommeTotalePayee = paiementsReussis.reduce((total, p) => total + Number(p.montant), 0);
    await this.facturesPatientService.appliquerPaiement(facturePatientId, sommeTotalePayee);
  }
}
