import { Injectable, Logger } from '@nestjs/common';
import { Periodicite } from '@sih-saas/shared';
import { AuditService } from '../../audit/application/audit.service';
import { EtablissementsService } from '../../etablissements/application/etablissements.service';
import { MailService } from '../../mail/application/mail.service';
import { SubscriptionEntity } from '../../subscriptions/infrastructure/entities/subscription.entity';
import { SubscriptionsService } from '../../subscriptions/application/subscriptions.service';
import { UsersService } from '../../users/application/users.service';

/**
 * Provisionnement post-paiement (ou immédiat si essai gratuit) — prompt maître §11.
 *
 * Volontairement absents pour l'instant : services/départements par défaut, numérotation des
 * dossiers/factures, structure de lits — ces éléments dépendent d'entités du schéma clinique pas
 * encore créées (Patient = Phase 5, Lits = Phase 6, FacturePatient = Phase 8). À compléter alors.
 */
@Injectable()
export class ProvisioningService {
  private readonly logger = new Logger(ProvisioningService.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly etablissementsService: EtablissementsService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  async provisionner(etablissementId: string, planId: string, periodicite: Periodicite): Promise<SubscriptionEntity> {
    const etablissement = await this.etablissementsService.findById(etablissementId);
    const actingUserId = etablissement.adminId ?? etablissementId;

    const subscription = await this.subscriptionsService.subscribe(
      etablissementId,
      { planId, periodicite },
      actingUserId,
    );

    if (etablissement.adminId) {
      try {
        const admin = await this.usersService.findById(etablissement.adminId);
        await this.mailService.envoyerBienvenue(admin.email, etablissement.nom);
      } catch (error) {
        // Un échec d'envoi d'email ne doit jamais faire échouer le provisionnement lui-même.
        this.logger.warn(`Échec de l'email de bienvenue pour ${etablissement.nom} : ${(error as Error).message}`);
      }
    }

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'etablissement.provisionne',
      ressource: 'etablissement',
      ressourceId: etablissementId,
      metadata: { planId, periodicite, subscriptionId: subscription.id },
    });

    return subscription;
  }
}
