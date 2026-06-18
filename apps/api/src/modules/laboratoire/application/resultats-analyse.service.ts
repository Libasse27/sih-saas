import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { DossierMedicalService } from '../../dossier-medical/application/dossier-medical.service';
import { RealtimeGateway } from '../../notifications/presentation/realtime.gateway';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { ResultatAnalyseEntity } from '../infrastructure/entities/resultat-analyse.entity';
import { CreateResultatAnalyseDto } from '../presentation/dto/create-resultat-analyse.dto';
import { DemandesAnalyseService } from './demandes-analyse.service';

/**
 * Diagnostic (prompt maître §12) : écrire un résultat passe la demande à EN_COURS ; la valider la
 * passe à TERMINEE, ajoute un compte rendu au DME (DossierMedicalService, Phase 5) et notifie le
 * prescripteur en temps réel (RealtimeGateway, Phase 6) — réutilise uniquement de l'existant.
 */
@Injectable()
export class ResultatsAnalyseService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly demandesAnalyseService: DemandesAnalyseService,
    private readonly dossierMedicalService: DossierMedicalService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<ResultatAnalyseEntity> {
    return this.tenantContext.getManager().getRepository(ResultatAnalyseEntity);
  }

  async ecrire(demandeId: string, dto: CreateResultatAnalyseDto, biologisteId: string): Promise<ResultatAnalyseEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    await this.demandesAnalyseService.marquerEnCours(demandeId);

    const resultat = await this.repository.save(
      this.repository.create({
        etablissementId,
        demandeId,
        biologisteId,
        resultats: dto.resultats,
        valeursCritiques: dto.valeursCritiques ?? false,
        fichierUrl: dto.fichierUrl ?? null,
        dateValidation: null,
      }),
    );

    await this.auditService.log({
      etablissementId,
      userId: biologisteId,
      action: 'labo.resultat.ecrire',
      ressource: 'resultat_analyse',
      ressourceId: resultat.id,
      metadata: { demandeId },
    });

    return resultat;
  }

  async findByDemande(demandeId: string): Promise<ResultatAnalyseEntity> {
    const resultat = await this.repository.findOne({ where: { demandeId } });
    if (!resultat) {
      throw new NotFoundException('Résultat introuvable pour cette demande.');
    }
    return resultat;
  }

  async valider(demandeId: string, actingUserId: string): Promise<ResultatAnalyseEntity> {
    const resultat = await this.findByDemande(demandeId);
    if (resultat.dateValidation) {
      throw new ConflictException('Ce résultat est déjà validé.');
    }

    const demande = await this.demandesAnalyseService.marquerTerminee(demandeId);

    resultat.dateValidation = new Date();
    const saved = await this.repository.save(resultat);

    await this.dossierMedicalService.ajouterCompteRendu(
      demande.patientId,
      {
        auteurId: actingUserId,
        type: 'resultat_labo',
        contenu: `Résultat d'analyse (${demande.typeAnalyse}) validé.`,
        fichierUrl: resultat.fichierUrl ?? undefined,
      },
      demande.etablissementId,
    );

    this.tenantContext.afterCommit(() => {
      this.realtimeGateway.emitToEtablissement(demande.etablissementId, 'labo:resultat.disponible', {
        demandeId: demande.id,
        patientId: demande.patientId,
        prescripteurId: demande.prescripteurId,
        valeursCritiques: resultat.valeursCritiques,
      });
    });

    await this.auditService.log({
      etablissementId: demande.etablissementId,
      userId: actingUserId,
      action: 'labo.resultat.valider',
      ressource: 'resultat_analyse',
      ressourceId: resultat.id,
      metadata: { demandeId },
    });

    return saved;
  }
}
