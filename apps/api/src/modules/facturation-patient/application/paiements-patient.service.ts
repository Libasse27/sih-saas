import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { FacturePatientStatut, ModePaiementPatient, PaymentStatut } from '@sih-saas/shared';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { SandboxPaymentGateway } from '../../payments/infrastructure/providers/sandbox-payment-gateway';
import { WebhookPayloadDto } from '../../payments/presentation/dto/webhook-payload.dto';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { PaiementPatientEntity } from '../infrastructure/entities/paiement-patient.entity';
import { CreatePaiementPatientDto } from '../presentation/dto/create-paiement-patient.dto';
import { FacturesPatientService } from './factures-patient.service';

export interface CreatePaiementPatientResult {
  paiement: PaiementPatientEntity;
  redirectUrl?: string;
}

const PROVIDER_PARAM_SANDBOX = 'sandbox';

/**
 * Flux soins (patient -> établissement) — réutilise SandboxPaymentGateway (infra partagée avec le
 * flux abonnement, PaymentsModule Phase 4) mais reste strictement séparé en modèle/endpoint/reporting
 * (prompt maître §15). `clinic.paiements_patient` est protégée par RLS.
 */
@Injectable()
export class PaiementsPatientService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly facturesPatientService: FacturesPatientService,
    private readonly gateway: SandboxPaymentGateway,
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

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'paiement-patient.create',
      ressource: 'paiement_patient',
      ressourceId: paiement.id,
      metadata: { facturePatientId, montant: dto.montant, mode: dto.mode },
    });

    if (estEspece) {
      await this.recalculerFacture(facturePatientId);
      return { paiement };
    }

    const { redirectUrl } = await this.gateway.initier({
      reference,
      montant: dto.montant,
      devise: 'XOF',
      etablissementId,
    });

    return { paiement, redirectUrl };
  }

  async handleWebhook(
    providerParam: string,
    rawBody: string,
    signature: string | undefined,
    payload: WebhookPayloadDto,
  ): Promise<void> {
    if (providerParam.toLowerCase() !== PROVIDER_PARAM_SANDBOX) {
      throw new NotFoundException(`Passerelle "${providerParam}" non configurée.`);
    }
    if (!this.gateway.verifierWebhook(rawBody, signature)) {
      throw new UnauthorizedException('Signature de webhook invalide.');
    }

    const paiement = await this.repository.findOne({ where: { reference: payload.reference } });
    if (!paiement) {
      throw new NotFoundException('Paiement introuvable.');
    }

    // Idempotence : un webhook déjà traité ne doit jamais recompter le paiement.
    if (paiement.statut !== PaymentStatut.EN_ATTENTE) {
      return;
    }

    paiement.statut = payload.statut === 'REUSSI' ? PaymentStatut.REUSSI : PaymentStatut.ECHOUE;
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
