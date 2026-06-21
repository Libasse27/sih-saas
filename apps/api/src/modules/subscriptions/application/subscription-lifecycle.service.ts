import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { EtablissementStatut, SubscriptionStatut } from '@sih-saas/shared';
import { LessThan, Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { EtablissementsService } from '../../etablissements/application/etablissements.service';
import { MailService } from '../../mail/application/mail.service';
import { UsersService } from '../../users/application/users.service';
import { SubscriptionEntity } from '../infrastructure/entities/subscription.entity';

/** Délai entre la fin de cycle et la suspension effective (prompt maître §9). */
export const PERIODE_GRACE_JOURS = 7;

/**
 * Délai entre le passage en EXPIRE (grâce écoulée ou essai jamais converti) et la SUSPENSION
 * effective de l'établissement — ajouté en Phase 32 (gap audit du 2026-06-21 : EXPIRE/SUSPENDU
 * existaient depuis la Phase 1/4 mais le cron ne produisait jamais SUSPENDU, et aucun guard ne
 * vérifiait l'un ou l'autre — voir SubscriptionStatusGuard). EXPIRE = accès encore possible mais
 * abonnement à renouveler ; SUSPENDU = accès clinique/métier coupé jusqu'au renouvellement.
 */
export const PERIODE_AVANT_SUSPENSION_JOURS = 14;

/**
 * Cron de transition automatique des statuts d'abonnement (prompt maître §9).
 * ESSAI expiré -> EXPIRE · ACTIF expiré -> EN_PERIODE_GRACE · grâce écoulée -> EXPIRE ·
 * EXPIRE depuis longtemps -> SUSPENDU. Chaque transition envoie une relance (dunning) à l'admin de
 * l'établissement — best-effort, ne bloque jamais le cron en cas d'échec d'envoi.
 */
@Injectable()
export class SubscriptionLifecycleService {
  private readonly logger = new Logger(SubscriptionLifecycleService.name);

  constructor(
    @InjectRepository(SubscriptionEntity) private readonly repository: Repository<SubscriptionEntity>,
    private readonly etablissementsService: EtablissementsService,
    private readonly auditService: AuditService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
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
    let graceEcoulee = 0;
    for (const subscription of enGrace) {
      const finDeGrace = this.ajouterJours(subscription.dateFin, PERIODE_GRACE_JOURS);
      if (finDeGrace < maintenant) {
        await this.transitionner(subscription, SubscriptionStatut.EXPIRE, EtablissementStatut.EXPIRE, maintenant);
        graceEcoulee++;
      }
    }

    const expires = await this.repository.find({ where: { statut: SubscriptionStatut.EXPIRE } });
    let suspensions = 0;
    for (const subscription of expires) {
      const depuis = this.dateDerniereTransition(subscription) ?? subscription.dateFin;
      if (this.ajouterJours(depuis, PERIODE_AVANT_SUSPENSION_JOURS) < maintenant) {
        await this.transitionner(subscription, SubscriptionStatut.SUSPENDU, EtablissementStatut.SUSPENDU, maintenant);
        suspensions++;
      }
    }

    if (essaisExpires.length || actifsExpires.length || graceEcoulee || suspensions) {
      this.logger.log(
        `Transitions abonnements : ${essaisExpires.length} essai(s) expiré(s), ${actifsExpires.length} entrée(s) en période de grâce, ${graceEcoulee} grâce(s) écoulée(s), ${suspensions} suspension(s).`,
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

    await this.relancer(subscription.etablissementId, nouveauStatut);
  }

  /** Dunning best-effort : un échec d'envoi ne doit jamais faire échouer la transition elle-même. */
  private async relancer(etablissementId: string, statut: SubscriptionStatut): Promise<void> {
    try {
      const etablissement = await this.etablissementsService.findById(etablissementId);
      if (!etablissement.adminId) {
        return;
      }
      const admin = await this.usersService.findById(etablissement.adminId);
      await this.mailService.envoyerRelanceAbonnement(admin.email, etablissement.nom, statut);
    } catch (error) {
      this.logger.warn(`Échec de l'email de relance (${statut}) pour ${etablissementId} : ${(error as Error).message}`);
    }
  }

  /** Date de la dernière entrée d'historique (= date de la transition la plus récente), si présente. */
  private dateDerniereTransition(subscription: SubscriptionEntity): Date | null {
    const derniere = subscription.historique[subscription.historique.length - 1];
    return derniere ? new Date(derniere.date) : null;
  }

  private ajouterJours(date: Date, jours: number): Date {
    const resultat = new Date(date);
    resultat.setDate(resultat.getDate() + jours);
    return resultat;
  }
}
