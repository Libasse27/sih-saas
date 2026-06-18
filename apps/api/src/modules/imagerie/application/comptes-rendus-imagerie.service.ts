import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { DossierMedicalService } from '../../dossier-medical/application/dossier-medical.service';
import { RealtimeGateway } from '../../notifications/presentation/realtime.gateway';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { CompteRenduImagerieEntity } from '../infrastructure/entities/compte-rendu-imagerie.entity';
import { CreateCompteRenduImagerieDto } from '../presentation/dto/create-compte-rendu-imagerie.dto';
import { ValiderCompteRenduImagerieDto } from '../presentation/dto/valider-compte-rendu-imagerie.dto';
import { DemandesImagerieService } from './demandes-imagerie.service';

/**
 * Diagnostic (prompt maître §12) : écrire un compte rendu (typiquement le manipulateur radio, à
 * l'acquisition) passe la demande à EN_COURS ; le valider (radiologue) la passe à TERMINEE, ajoute
 * un compte rendu au DME (Phase 5) et notifie le prescripteur en temps réel (Phase 6).
 */
@Injectable()
export class ComptesRendusImagerieService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly demandesImagerieService: DemandesImagerieService,
    private readonly dossierMedicalService: DossierMedicalService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<CompteRenduImagerieEntity> {
    return this.tenantContext.getManager().getRepository(CompteRenduImagerieEntity);
  }

  async ecrire(demandeId: string, dto: CreateCompteRenduImagerieDto, radiologueId: string): Promise<CompteRenduImagerieEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    await this.demandesImagerieService.marquerEnCours(demandeId);

    const compteRendu = await this.repository.save(
      this.repository.create({
        etablissementId,
        demandeId,
        radiologueId,
        conclusion: dto.conclusion ?? null,
        fichierDicomUrl: dto.fichierDicomUrl ?? null,
        dateValidation: null,
      }),
    );

    await this.auditService.log({
      etablissementId,
      userId: radiologueId,
      action: 'imagerie.compte_rendu.ecrire',
      ressource: 'compte_rendu_imagerie',
      ressourceId: compteRendu.id,
      metadata: { demandeId },
    });

    return compteRendu;
  }

  async findByDemande(demandeId: string): Promise<CompteRenduImagerieEntity> {
    const compteRendu = await this.repository.findOne({ where: { demandeId } });
    if (!compteRendu) {
      throw new NotFoundException('Compte rendu introuvable pour cette demande.');
    }
    return compteRendu;
  }

  async valider(demandeId: string, dto: ValiderCompteRenduImagerieDto, actingUserId: string): Promise<CompteRenduImagerieEntity> {
    const compteRendu = await this.findByDemande(demandeId);
    if (compteRendu.dateValidation) {
      throw new ConflictException('Ce compte rendu est déjà validé.');
    }
    if (!dto.conclusion && !compteRendu.conclusion) {
      throw new ConflictException('Une conclusion est requise pour valider ce compte rendu.');
    }

    const demande = await this.demandesImagerieService.marquerTerminee(demandeId);

    compteRendu.conclusion = dto.conclusion ?? compteRendu.conclusion;
    compteRendu.dateValidation = new Date();
    const saved = await this.repository.save(compteRendu);

    await this.dossierMedicalService.ajouterCompteRendu(
      demande.patientId,
      {
        auteurId: actingUserId,
        type: 'compte_rendu_imagerie',
        contenu: saved.conclusion ?? `Compte rendu d'imagerie (${demande.typeExamen}) validé.`,
        fichierUrl: saved.fichierDicomUrl ?? undefined,
      },
      demande.etablissementId,
    );

    this.tenantContext.afterCommit(() => {
      this.realtimeGateway.emitToEtablissement(demande.etablissementId, 'imagerie:rapport.disponible', {
        demandeId: demande.id,
        patientId: demande.patientId,
        prescripteurId: demande.prescripteurId,
      });
    });

    await this.auditService.log({
      etablissementId: demande.etablissementId,
      userId: actingUserId,
      action: 'imagerie.compte_rendu.valider',
      ressource: 'compte_rendu_imagerie',
      ressourceId: compteRendu.id,
      metadata: { demandeId },
    });

    return saved;
  }
}
