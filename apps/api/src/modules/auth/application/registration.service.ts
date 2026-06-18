import { Injectable } from '@nestjs/common';
import { Role, Scope } from '@sih-saas/shared';
import { EtablissementsService } from '../../etablissements/application/etablissements.service';
import { EtablissementEntity } from '../../etablissements/infrastructure/entities/etablissement.entity';
import { PlansService } from '../../plans/application/plans.service';
import { ProvisioningService } from '../../provisioning/application/provisioning.service';
import { UsersService } from '../../users/application/users.service';
import { RegisterDto } from '../presentation/dto/register.dto';

export interface RegisterResult {
  etablissement: EtablissementEntity;
  requiresPayment: boolean;
}

/**
 * POST /api/auth/register (prompt maître §10.1) : crée l'établissement (EN_ATTENTE_PAIEMENT) et
 * son ADMIN_ETABLISSEMENT. Pas d'activation sans paiement réussi — sauf si le plan choisi offre un
 * essai gratuit, auquel cas le provisionnement est immédiat (pas de jeton émis : l'appelant doit
 * ensuite appeler /api/auth/login).
 */
@Injectable()
export class RegistrationService {
  constructor(
    private readonly plansService: PlansService,
    private readonly etablissementsService: EtablissementsService,
    private readonly usersService: UsersService,
    private readonly provisioningService: ProvisioningService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResult> {
    const plan = await this.plansService.findById(dto.planId);

    const etablissement = await this.etablissementsService.create(
      {
        nom: dto.nomEtablissement,
        type: dto.typeEtablissement,
      },
      null,
    );

    const admin = await this.usersService.create(
      {
        scope: Scope.ETABLISSEMENT,
        etablissementId: etablissement.id,
        nom: dto.adminNom,
        prenom: dto.adminPrenom,
        email: dto.adminEmail,
        telephone: dto.adminTelephone,
        password: dto.adminPassword,
        roles: [Role.ADMIN_ETABLISSEMENT],
      },
      { skipLimitCheck: true }, // bootstrap : aucun abonnement n'existe encore à ce stade
    );

    await this.etablissementsService.setAdmin(etablissement.id, admin.id);

    // Sans essai gratuit, l'établissement reste EN_ATTENTE_PAIEMENT (valeur par défaut de l'entité)
    // jusqu'à ce que POST /api/payments/initier puis le webhook confirment le paiement.
    const enEssai = plan.essaiGratuitJours > 0;
    if (enEssai) {
      await this.provisioningService.provisionner(etablissement.id, plan.id, dto.periodicite);
    }

    const etablissementFinal = await this.etablissementsService.findById(etablissement.id);

    return { etablissement: etablissementFinal, requiresPayment: !enEssai };
  }
}
