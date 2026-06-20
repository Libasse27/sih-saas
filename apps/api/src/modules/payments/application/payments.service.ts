import { Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Periodicite, PaymentStatut } from '@sih-saas/shared';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { CouponsService } from '../../coupons/application/coupons.service';
import { PlansService } from '../../plans/application/plans.service';
import { ProvisioningService } from '../../provisioning/application/provisioning.service';
import { SettingsService } from '../../settings/application/settings.service';
import { SandboxPaymentGateway } from '../infrastructure/providers/sandbox-payment-gateway';
import { PaymentEntity } from '../infrastructure/entities/payment.entity';
import { InitierPaymentDto } from '../presentation/dto/initier-payment.dto';
import { WebhookPayloadDto } from '../presentation/dto/webhook-payload.dto';

export interface InitierPaymentResult {
  reference: string;
  redirectUrl: string;
  montant: number;
  devise: string;
}

/** Seule la passerelle SANDBOX est branchée pour l'instant (voir sandbox-payment-gateway.ts). */
const PROVIDER_PARAM_SANDBOX = 'sandbox';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentEntity) private readonly repository: Repository<PaymentEntity>,
    private readonly plansService: PlansService,
    private readonly gateway: SandboxPaymentGateway,
    private readonly provisioningService: ProvisioningService,
    private readonly auditService: AuditService,
    private readonly couponsService: CouponsService,
    private readonly settingsService: SettingsService,
  ) {}

  async initier(dto: InitierPaymentDto): Promise<InitierPaymentResult> {
    const settings = await this.settingsService.getOrCreate();
    if (!settings.paiements.actifs) {
      throw new ServiceUnavailableException('Les paiements d\'abonnement sont temporairement désactivés.');
    }

    const plan = await this.plansService.findById(dto.planId);
    const montantBase = dto.periodicite === Periodicite.MENSUEL ? plan.tarifs.mensuel : plan.tarifs.annuel;

    let montant = montantBase;
    let couponCode: string | null = null;
    if (dto.couponCode) {
      const resultat = await this.couponsService.appliquer(dto.couponCode, dto.planId, montantBase);
      montant = resultat.montant;
      couponCode = resultat.coupon.code;
    }

    const reference = randomUUID();

    await this.repository.save(
      this.repository.create({
        etablissementId: dto.etablissementId,
        planId: dto.planId,
        periodicite: dto.periodicite,
        provider: this.gateway.type,
        reference,
        montant,
        devise: plan.tarifs.devise,
        statut: PaymentStatut.EN_ATTENTE,
        couponCode,
      }),
    );

    const { redirectUrl } = await this.gateway.initier({
      reference,
      montant,
      devise: plan.tarifs.devise,
      etablissementId: dto.etablissementId,
    });

    await this.auditService.log({
      etablissementId: dto.etablissementId,
      action: 'payment.initier',
      ressource: 'payment',
      metadata: { reference, montant, planId: dto.planId, couponCode },
    });

    return { reference, redirectUrl, montant, devise: plan.tarifs.devise };
  }

  async handleWebhook(providerParam: string, rawBody: string, signature: string | undefined, payload: WebhookPayloadDto): Promise<void> {
    if (providerParam.toLowerCase() !== PROVIDER_PARAM_SANDBOX) {
      throw new NotFoundException(`Passerelle "${providerParam}" non configurée.`);
    }

    if (!this.gateway.verifierWebhook(rawBody, signature)) {
      throw new UnauthorizedException('Signature de webhook invalide.');
    }

    const payment = await this.repository.findOne({ where: { reference: payload.reference } });
    if (!payment) {
      throw new NotFoundException('Paiement introuvable.');
    }

    // Idempotence : un webhook déjà traité ne doit jamais déclencher un second provisionnement.
    if (payment.statut !== PaymentStatut.EN_ATTENTE) {
      return;
    }

    payment.statut = payload.statut === 'REUSSI' ? PaymentStatut.REUSSI : PaymentStatut.ECHOUE;
    payment.rawPayload = JSON.parse(rawBody);
    await this.repository.save(payment);

    await this.auditService.log({
      etablissementId: payment.etablissementId,
      action: 'payment.webhook',
      ressource: 'payment',
      ressourceId: payment.id,
      metadata: { statut: payment.statut, reference: payment.reference },
    });

    if (payment.statut === PaymentStatut.REUSSI) {
      const subscription = await this.provisioningService.provisionner(
        payment.etablissementId,
        payment.planId,
        payment.periodicite,
        // montantOverride : le montant du paiement REUSSI est déjà la remise coupon appliquée
        // (calculée dans initier()) — jamais recalculé ici, pour ne jamais désynchroniser le
        // montant réellement payé de celui de l'abonnement créé.
        payment.couponCode ? { couponApplique: payment.couponCode, montantOverride: Number(payment.montant) } : undefined,
      );
      payment.subscriptionId = subscription.id;
      await this.repository.save(payment);
    }
  }

  async getStatut(reference: string): Promise<PaymentEntity> {
    const payment = await this.repository.findOne({ where: { reference } });
    if (!payment) {
      throw new NotFoundException('Paiement introuvable.');
    }
    return payment;
  }
}
