import { Injectable, Logger } from '@nestjs/common';
import { Periodicite } from '@sih-saas/shared';
import { ServicesService } from '../../admissions-lits/application/services.service';
import { SitesService } from '../../admissions-lits/application/sites.service';
import { AuditService } from '../../audit/application/audit.service';
import { EtablissementsService } from '../../etablissements/application/etablissements.service';
import { MailService } from '../../mail/application/mail.service';
import { SubscriptionEntity } from '../../subscriptions/infrastructure/entities/subscription.entity';
import { SubscriptionsService } from '../../subscriptions/application/subscriptions.service';
import { UsersService } from '../../users/application/users.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';

/** Services/départements créés par défaut à l'activation (gap audit du 2026-06-21, §11) — vide volontairement de tout `responsableId` (personne à affecter encore). */
const SERVICES_PAR_DEFAUT: ReadonlyArray<{ nom: string; code: string; type: string }> = [
  { nom: 'Consultations générales', code: 'CONSULT', type: 'CONSULTATION' },
  { nom: 'Hospitalisation', code: 'HOSPIT', type: 'HOSPITALISATION' },
  { nom: 'Urgences', code: 'URGENCES', type: 'URGENCES' },
];

/**
 * Provisionnement post-paiement (ou immédiat si essai gratuit) — prompt maître §11.
 *
 * Services/départements par défaut ajoutés en Phase 32 (gap audit). Site « Site principal » créé en
 * Phase 34 (`multiSites`) juste avant ces services — un établissement a toujours au moins un site,
 * que son forfait inclue `multiSites` ou non. Toujours volontairement absents : numérotation des
 * dossiers/factures (déjà gérée à la demande par `EtablissementsService.incrementerCompteur`, pas
 * besoin de seed), structure de LITS (le prompt maître §11 dit explicitement "structure de lits
 * vide à compléter" — contrairement aux services/sites, ce n'est PAS un oubli, juste un choix de
 * scope différent).
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
    private readonly servicesService: ServicesService,
    private readonly sitesService: SitesService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async provisionner(
    etablissementId: string,
    planId: string,
    periodicite: Periodicite,
    options?: { couponApplique?: string; montantOverride?: number },
  ): Promise<SubscriptionEntity> {
    const etablissement = await this.etablissementsService.findById(etablissementId);
    const actingUserId = etablissement.adminId ?? etablissementId;

    const subscription = await this.subscriptionsService.subscribe(
      etablissementId,
      { planId, periodicite, couponApplique: options?.couponApplique, montantOverride: options?.montantOverride },
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

    try {
      // ServicesService/SitesService passent par tenantContext.getManager() (RLS) — aucun contexte
      // tenant n'est normalement ouvert ici (appelé depuis des routes @Public(), register/webhook),
      // d'où runForEtablissement() qui ouvre sa propre transaction RLS pour la durée de cette boucle.
      await this.tenantContext.runForEtablissement(etablissementId, async () => {
        const sitePrincipal = await this.sitesService.create({ nom: 'Site principal', code: 'PRINCIPAL' }, actingUserId);
        for (const service of SERVICES_PAR_DEFAUT) {
          await this.servicesService.create({ ...service, siteId: sitePrincipal.id }, actingUserId);
        }
      });
    } catch (error) {
      // Comme l'email : un échec ici ne doit jamais invalider l'abonnement déjà créé — le site et les
      // services restent créables manuellement ensuite via POST /sites et POST /services.
      this.logger.warn(`Échec de la création du site/services par défaut pour ${etablissement.nom} : ${(error as Error).message}`);
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
