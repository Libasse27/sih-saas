import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { EtablissementStatut, SubscriptionStatut } from '@sih-saas/shared';
import { LessThan, Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { EtablissementsService } from '../../etablissements/application/etablissements.service';
import { SubscriptionEntity } from '../infrastructure/entities/subscription.entity';

/** Délai entre la fin de cycle et la suspension effective (prompt maître §9). */
export const PERIODE_GRACE_JOURS = 7;

/**
 * Cron de transition automatique des statuts d'abonnement (prompt maître §9).
 * ESSAI expiré -> EXPIRE · ACTIF expiré -> EN_PERIODE_GRACE · grâce écoulée -> EXPIRE.
 */
@Injectable()
export class SubscriptionLifecycleService {
  private readonly logger = new Logger(SubscriptionLifecycleService.name);

  constructor(
    @InjectRepository(SubscriptionEntity) private readonly repository: Repository<SubscriptionEntity>,
    private readonly etablissementsService: EtablissementsService,
    private readonly auditService: AuditService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async transitionerAbonnementsExpires(maintenant: Date = new Date()): Promise<void> {
    const essaisExpires = await this.repository.find({
      where: { statut: SubscriptionStatut.ESSAI, dateFin: LessThan(maintenant) },
    });
    for (const subscription of essaisExpires) {
      await this.transitionner(subscription, SubscriptionStatut.EXPIRE, EtablissementStatut.EXPIRE, maintenant);
    }

    const actifsExpires = await this.repository.find({
      where: { statut: SubscriptionStatut.ACTIF, dateFin: LessThan(maintenant) },
    });
    for (const subscription of actifsExpires) {
      await this.transitionner(subscription, SubscriptionStatut.EN_PERIODE_GRACE, null, maintenant);
    }

    const enGrace = await this.repository.find({ where: { statut: SubscriptionStatut.EN_PERIODE_GRACE } });
    for (const subscription of enGrace) {
      const finDeGrace = this.ajouterJours(subscription.dateFin, PERIODE_GRACE_JOURS);
      if (finDeGrace < maintenant) {
        await this.transitionner(subscription, SubscriptionStatut.EXPIRE, EtablissementStatut.EXPIRE, maintenant);
      }
    }

    if (essaisExpires.length || actifsExpires.length || enGrace.length) {
      this.logger.log(
        `Transitions abonnements : ${essaisExpires.length} essai(s) expiré(s), ${actifsExpires.length} entrée(s) en période de grâce, ${enGrace.length} vérifié(s) en grâce.`,
      );
    }
  }

  private async transitionner(
    subscription: SubscriptionEntity,
    nouveauStatut: SubscriptionStatut,
    etablissementStatut: EtablissementStatut | null,
    maintenant: Date,
  ): Promise<void> {
    const ancienStatut = subscription.statut;
    subscription.statut = nouveauStatut;
    subscription.historique = [
      ...subscription.historique,
      { date: maintenant.toISOString(), action: 'subscription.auto_transition', details: { ancienStatut, nouveauStatut } },
    ];
    await this.repository.save(subscription);

    if (etablissementStatut) {
      await this.etablissementsService.updateStatut(subscription.etablissementId, etablissementStatut, null);
    }

    await this.auditService.log({
      etablissementId: subscription.etablissementId,
      userId: null,
      action: 'subscription.auto_transition',
      ressource: 'subscription',
      ressourceId: subscription.id,
      metadata: { ancienStatut, nouveauStatut },
    });
  }

  private ajouterJours(date: Date, jours: number): Date {
    const resultat = new Date(date);
    resultat.setDate(resultat.getDate() + jours);
    return resultat;
  }
}
