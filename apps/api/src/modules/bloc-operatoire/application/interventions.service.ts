import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InterventionStatut, PhaseChecklistOms, RoleEquipeOperatoire, SalleOperationStatut } from '@sih-saas/shared';
import { Not, Repository } from 'typeorm';
import { AdmissionsService } from '../../admissions-lits/application/admissions.service';
import { AuditService } from '../../audit/application/audit.service';
import { DossierMedicalService } from '../../dossier-medical/application/dossier-medical.service';
import { LogistiqueService } from '../../logistique/application/logistique.service';
import { RealtimeGateway } from '../../notifications/presentation/realtime.gateway';
import { PatientsService } from '../../patients/application/patients.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { AjouterMembreEquipeDto } from '../presentation/dto/ajouter-membre-equipe.dto';
import { CreateAnesthesieDto } from '../presentation/dto/create-anesthesie.dto';
import { CreateCompteRenduOperatoireDto } from '../presentation/dto/create-compte-rendu-operatoire.dto';
import { CreateConsommableInterventionDto } from '../presentation/dto/create-consommable-intervention.dto';
import { CreateInterventionDto } from '../presentation/dto/create-intervention.dto';
import { CreateSurveillanceAnesthesieDto } from '../presentation/dto/create-surveillance-anesthesie.dto';
import { UpdateInterventionDto } from '../presentation/dto/update-intervention.dto';
import { ValiderChecklistDto } from '../presentation/dto/valider-checklist.dto';
import { AnesthesieEntity } from '../infrastructure/entities/anesthesie.entity';
import { CompteRenduOperatoireEntity } from '../infrastructure/entities/compte-rendu-operatoire.entity';
import { ConsommableInterventionEntity } from '../infrastructure/entities/consommable-intervention.entity';
import { EquipeOperatoireEntity } from '../infrastructure/entities/equipe-operatoire.entity';
import { CHECKLIST_OMS_INITIALE, InterventionEntity } from '../infrastructure/entities/intervention.entity';
import { PaginatedResult } from './paginated-result';
import { SallesOperationService } from './salles-operation.service';

export interface InterventionDetail extends InterventionEntity {
  equipe: EquipeOperatoireEntity[];
  anesthesie: AnesthesieEntity | null;
  consommables: ConsommableInterventionEntity[];
  compteRendu: CompteRenduOperatoireEntity | null;
}

/**
 * Module "Bloc Opératoire" (prompt maître §10.4). `InterventionsController` (route plate
 * `/interventions`, jamais 🩺 — planification, même raisonnement que ADMISSION_CREATE) consomme
 * create/findAll/findOne/update/annuler/ajouterMembreEquipe/retirerMembreEquipe ;
 * `InterventionsPatientController` (nichée `/patients/:patientId/interventions`, 🩺) consomme
 * demarrer/validerChecklist/creerOuCompleterAnesthesie/ajouterSurveillanceAnesthesie/
 * enregistrerConsommable/terminer/redigerCompteRendu.
 */
@Injectable()
export class InterventionsService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly patientsService: PatientsService,
    private readonly admissionsService: AdmissionsService,
    private readonly sallesOperationService: SallesOperationService,
    private readonly logistiqueService: LogistiqueService,
    private readonly dossierMedicalService: DossierMedicalService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  private get repository(): Repository<InterventionEntity> {
    return this.tenantContext.getManager().getRepository(InterventionEntity);
  }

  private get equipeRepository(): Repository<EquipeOperatoireEntity> {
    return this.tenantContext.getManager().getRepository(EquipeOperatoireEntity);
  }

  private get anesthesieRepository(): Repository<AnesthesieEntity> {
    return this.tenantContext.getManager().getRepository(AnesthesieEntity);
  }

  private get consommablesRepository(): Repository<ConsommableInterventionEntity> {
    return this.tenantContext.getManager().getRepository(ConsommableInterventionEntity);
  }

  private get compteRenduRepository(): Repository<CompteRenduOperatoireEntity> {
    return this.tenantContext.getManager().getRepository(CompteRenduOperatoireEntity);
  }

  async create(dto: CreateInterventionDto, actingUserId: string): Promise<InterventionEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    await this.patientsService.findById(dto.patientId);
    if (dto.admissionId) {
      await this.admissionsService.findById(dto.admissionId);
    }
    await this.sallesOperationService.findById(dto.salleOperationId);

    const dateHeurePrevue = new Date(dto.dateHeurePrevue);
    await this.assertCreneauLibre(dto.salleOperationId, dateHeurePrevue, dto.dureeEstimeeMinutes ?? null);

    const intervention = await this.repository.save(
      this.repository.create({
        etablissementId,
        patientId: dto.patientId,
        admissionId: dto.admissionId ?? null,
        salleOperationId: dto.salleOperationId,
        chirurgienPrincipalId: dto.chirurgienPrincipalId,
        typeIntervention: dto.typeIntervention,
        statut: InterventionStatut.PLANIFIEE,
        dateHeurePrevue,
        dureeEstimeeMinutes: dto.dureeEstimeeMinutes ?? null,
        checklistOms: CHECKLIST_OMS_INITIALE,
      }),
    );

    await this.equipeRepository.save(
      this.equipeRepository.create({
        etablissementId,
        interventionId: intervention.id,
        userId: dto.chirurgienPrincipalId,
        role: RoleEquipeOperatoire.CHIRURGIEN_PRINCIPAL,
      }),
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'intervention.create',
      ressource: 'intervention',
      ressourceId: intervention.id,
      metadata: { patientId: dto.patientId, salleOperationId: dto.salleOperationId },
    });

    return intervention;
  }

  async findAll(
    page: number,
    limit: number,
    filtres: { statut?: InterventionStatut; salleOperationId?: string; patientId?: string } = {},
  ): Promise<PaginatedResult<InterventionEntity>> {
    const [items, total] = await this.repository.findAndCount({
      where: filtres,
      skip: (page - 1) * limit,
      take: limit,
      order: { dateHeurePrevue: 'ASC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<InterventionEntity> {
    const intervention = await this.repository.findOne({ where: { id } });
    if (!intervention) {
      throw new NotFoundException('Intervention introuvable.');
    }
    return intervention;
  }

  async findDetailComplet(id: string): Promise<InterventionDetail> {
    const intervention = await this.findById(id);
    const [equipe, anesthesie, consommables, compteRendu] = await Promise.all([
      this.equipeRepository.find({ where: { interventionId: id } }),
      this.anesthesieRepository.findOne({ where: { interventionId: id } }),
      this.consommablesRepository.find({ where: { interventionId: id } }),
      this.compteRenduRepository.findOne({ where: { interventionId: id } }),
    ]);
    return { ...intervention, equipe, anesthesie: anesthesie ?? null, consommables, compteRendu: compteRendu ?? null };
  }

  async update(id: string, dto: UpdateInterventionDto, actingUserId: string): Promise<InterventionEntity> {
    const intervention = await this.findById(id);
    this.assertPlanifiee(intervention);

    if (dto.salleOperationId) {
      await this.sallesOperationService.findById(dto.salleOperationId);
    }
    const salleOperationId = dto.salleOperationId ?? intervention.salleOperationId;
    const dateHeurePrevue = dto.dateHeurePrevue ? new Date(dto.dateHeurePrevue) : intervention.dateHeurePrevue;
    const dureeEstimeeMinutes = dto.dureeEstimeeMinutes ?? intervention.dureeEstimeeMinutes;
    await this.assertCreneauLibre(salleOperationId, dateHeurePrevue, dureeEstimeeMinutes, id);

    intervention.salleOperationId = salleOperationId;
    intervention.dateHeurePrevue = dateHeurePrevue;
    intervention.dureeEstimeeMinutes = dureeEstimeeMinutes;
    if (dto.typeIntervention) {
      intervention.typeIntervention = dto.typeIntervention;
    }
    const saved = await this.repository.save(intervention);

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.update',
      ressource: 'intervention',
      ressourceId: id,
    });

    return saved;
  }

  async annuler(id: string, actingUserId: string): Promise<InterventionEntity> {
    const intervention = await this.findById(id);
    this.assertPlanifiee(intervention);

    intervention.statut = InterventionStatut.ANNULEE;
    const saved = await this.repository.save(intervention);

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.annuler',
      ressource: 'intervention',
      ressourceId: id,
    });

    return saved;
  }

  async ajouterMembreEquipe(id: string, dto: AjouterMembreEquipeDto, actingUserId: string): Promise<EquipeOperatoireEntity> {
    const intervention = await this.findById(id);

    const membre = await this.equipeRepository.save(
      this.equipeRepository.create({
        etablissementId: intervention.etablissementId,
        interventionId: id,
        userId: dto.userId,
        role: dto.role,
      }),
    );

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.equipe.ajouter',
      ressource: 'intervention',
      ressourceId: id,
      metadata: { userId: dto.userId, role: dto.role },
    });

    return membre;
  }

  async retirerMembreEquipe(id: string, membreId: string, actingUserId: string): Promise<void> {
    const intervention = await this.findById(id);
    const membre = await this.equipeRepository.findOne({ where: { id: membreId, interventionId: id } });
    if (!membre) {
      throw new NotFoundException('Membre de l\'équipe opératoire introuvable.');
    }

    await this.equipeRepository.remove(membre);

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.equipe.retirer',
      ressource: 'intervention',
      ressourceId: id,
      metadata: { membreId },
    });
  }

  async demarrer(id: string, actingUserId: string): Promise<InterventionEntity> {
    const intervention = await this.findById(id);
    if (intervention.statut !== InterventionStatut.PLANIFIEE) {
      throw new ConflictException('Seule une intervention PLANIFIEE peut démarrer.');
    }

    intervention.statut = InterventionStatut.EN_COURS;
    intervention.dateHeureDebutReelle = new Date();
    const saved = await this.repository.save(intervention);
    await this.sallesOperationService.changerStatutOccupation(intervention.salleOperationId, SalleOperationStatut.OCCUPEE);

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.demarrer',
      ressource: 'intervention',
      ressourceId: id,
    });
    this.diffuserSalle(intervention.etablissementId, intervention.salleOperationId, SalleOperationStatut.OCCUPEE);

    return saved;
  }

  async validerChecklist(id: string, dto: ValiderChecklistDto, actingUserId: string): Promise<InterventionEntity> {
    const intervention = await this.findById(id);
    this.assertEnCours(intervention);

    const cle = this.clePhase(dto.phase);
    intervention.checklistOms = {
      ...intervention.checklistOms,
      [cle]: { valide: true, valideParId: actingUserId, valideLe: new Date().toISOString() },
    };
    const saved = await this.repository.save(intervention);

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.checklist.valider',
      ressource: 'intervention',
      ressourceId: id,
      metadata: { phase: dto.phase },
    });

    return saved;
  }

  async creerOuCompleterAnesthesie(id: string, dto: CreateAnesthesieDto, actingUserId: string): Promise<AnesthesieEntity> {
    const intervention = await this.findById(id);
    this.assertEnCours(intervention);

    const existante = await this.anesthesieRepository.findOne({ where: { interventionId: id } });
    if (existante) {
      Object.assign(existante, {
        type: dto.type,
        scoreAsa: dto.scoreAsa ?? existante.scoreAsa,
        produits: dto.produits ?? existante.produits,
      });
      const saved = await this.anesthesieRepository.save(existante);
      await this.auditService.log({
        etablissementId: intervention.etablissementId,
        userId: actingUserId,
        action: 'intervention.anesthesie.update',
        ressource: 'intervention',
        ressourceId: id,
      });
      return saved;
    }

    const anesthesie = await this.anesthesieRepository.save(
      this.anesthesieRepository.create({
        etablissementId: intervention.etablissementId,
        interventionId: id,
        anesthesisteId: actingUserId,
        type: dto.type,
        scoreAsa: dto.scoreAsa ?? null,
        produits: dto.produits ?? [],
        surveillance: [],
      }),
    );

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.anesthesie.create',
      ressource: 'intervention',
      ressourceId: id,
    });

    return anesthesie;
  }

  async ajouterSurveillanceAnesthesie(
    id: string,
    dto: CreateSurveillanceAnesthesieDto,
    actingUserId: string,
  ): Promise<AnesthesieEntity> {
    const intervention = await this.findById(id);
    this.assertEnCours(intervention);

    const anesthesie = await this.anesthesieRepository.findOne({ where: { interventionId: id } });
    if (!anesthesie) {
      throw new NotFoundException('Aucune anesthésie enregistrée pour cette intervention.');
    }

    anesthesie.surveillance = [
      ...anesthesie.surveillance,
      {
        heure: new Date().toISOString(),
        tensionArterielle: dto.tensionArterielle ?? null,
        pouls: dto.pouls ?? null,
        saturationO2: dto.saturationO2 ?? null,
        observation: dto.observation ?? null,
      },
    ];
    const saved = await this.anesthesieRepository.save(anesthesie);

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.anesthesie.surveillance',
      ressource: 'intervention',
      ressourceId: id,
    });

    return saved;
  }

  async enregistrerConsommable(
    id: string,
    dto: CreateConsommableInterventionDto,
    actingUserId: string,
  ): Promise<ConsommableInterventionEntity> {
    const intervention = await this.findById(id);
    this.assertEnCours(intervention);

    await this.logistiqueService.decrementer(dto.articleStockId, dto.quantite);

    const consommable = await this.consommablesRepository.save(
      this.consommablesRepository.create({
        etablissementId: intervention.etablissementId,
        interventionId: id,
        articleStockId: dto.articleStockId,
        quantite: dto.quantite,
      }),
    );

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.consommable.create',
      ressource: 'intervention',
      ressourceId: id,
      metadata: { articleStockId: dto.articleStockId, quantite: dto.quantite },
    });

    return consommable;
  }

  async terminer(id: string, actingUserId: string): Promise<InterventionEntity> {
    const intervention = await this.findById(id);
    this.assertEnCours(intervention);

    intervention.statut = InterventionStatut.TERMINEE;
    intervention.dateHeureFinReelle = new Date();
    const saved = await this.repository.save(intervention);
    await this.sallesOperationService.changerStatutOccupation(intervention.salleOperationId, SalleOperationStatut.LIBRE);

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.terminer',
      ressource: 'intervention',
      ressourceId: id,
    });
    this.diffuserSalle(intervention.etablissementId, intervention.salleOperationId, SalleOperationStatut.LIBRE);

    return saved;
  }

  async redigerCompteRendu(
    id: string,
    dto: CreateCompteRenduOperatoireDto,
    actingUserId: string,
  ): Promise<CompteRenduOperatoireEntity> {
    const intervention = await this.findById(id);
    if (intervention.statut !== InterventionStatut.TERMINEE) {
      throw new ConflictException("Le compte rendu ne peut être rédigé qu'une fois l'intervention TERMINEE.");
    }

    const existant = await this.compteRenduRepository.findOne({ where: { interventionId: id } });
    if (existant) {
      throw new ConflictException('Un compte rendu existe déjà pour cette intervention.');
    }

    const compteRendu = await this.compteRenduRepository.save(
      this.compteRenduRepository.create({
        etablissementId: intervention.etablissementId,
        interventionId: id,
        redacteurId: actingUserId,
        diagnosticPreOperatoire: dto.diagnosticPreOperatoire,
        diagnosticPostOperatoire: dto.diagnosticPostOperatoire,
        techniqueUtilisee: dto.techniqueUtilisee,
        incidents: dto.incidents ?? null,
        contenu: dto.contenu,
      }),
    );

    await this.dossierMedicalService.ajouterCompteRendu(
      intervention.patientId,
      { auteurId: actingUserId, type: 'bloc-operatoire', contenu: dto.contenu },
      intervention.etablissementId,
    );

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.compte-rendu.create',
      ressource: 'intervention',
      ressourceId: id,
    });

    return compteRendu;
  }

  private assertPlanifiee(intervention: InterventionEntity): void {
    if (intervention.statut !== InterventionStatut.PLANIFIEE) {
      throw new ConflictException('Seule une intervention PLANIFIEE peut être modifiée ou annulée.');
    }
  }

  private assertEnCours(intervention: InterventionEntity): void {
    if (intervention.statut !== InterventionStatut.EN_COURS) {
      throw new ConflictException('Cette action exige une intervention EN_COURS.');
    }
  }

  private clePhase(phase: PhaseChecklistOms): 'signIn' | 'timeOut' | 'signOut' {
    if (phase === PhaseChecklistOms.SIGN_IN) return 'signIn';
    if (phase === PhaseChecklistOms.TIME_OUT) return 'timeOut';
    return 'signOut';
  }

  private async assertCreneauLibre(
    salleOperationId: string,
    dateHeurePrevue: Date,
    dureeEstimeeMinutes: number | null,
    excludeInterventionId?: string,
  ): Promise<void> {
    const duree = dureeEstimeeMinutes ?? 60;
    const debut = dateHeurePrevue.getTime();
    const fin = debut + duree * 60_000;

    const existantes = await this.repository.find({
      where: { salleOperationId, statut: Not(InterventionStatut.ANNULEE) },
    });

    const conflit = existantes.some((existante) => {
      if (existante.id === excludeInterventionId) {
        return false;
      }
      const debutExistant = existante.dateHeurePrevue.getTime();
      const finExistante = debutExistant + (existante.dureeEstimeeMinutes ?? 60) * 60_000;
      return debutExistant < fin && debut < finExistante;
    });

    if (conflit) {
      throw new ConflictException('Cette salle est déjà réservée sur ce créneau.');
    }
  }

  private diffuserSalle(etablissementId: string, salleOperationId: string, statut: SalleOperationStatut): void {
    this.tenantContext.afterCommit(() => {
      this.realtimeGateway.emitToEtablissement(etablissementId, 'bloc:salle.updated', { salleOperationId, statut });
    });
  }
}
