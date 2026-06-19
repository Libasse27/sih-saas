import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, Scope } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { EtablissementsService } from '../../etablissements/application/etablissements.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { UsersService } from '../../users/application/users.service';
import { genererIdh } from '../domain/idh-generator';
import { PatientEntity } from '../infrastructure/entities/patient.entity';
import { CreatePatientAccesDto } from '../presentation/dto/create-patient-acces.dto';
import { CreatePatientDto } from '../presentation/dto/create-patient.dto';
import { UpdatePatientDto } from '../presentation/dto/update-patient.dto';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * `clinic.patients` est protégée par RLS (voir la migration de ce module) : toute requête doit
 * passer par le manager de la transaction ouverte par TenantRlsInterceptor
 * (tenantContext.getManager()), jamais par un Repository injecté classiquement — sans quoi
 * Postgres ne verrait aucune ligne (fail-closed) ou, pire, toutes les lignes si le rôle utilisé
 * bypassait RLS. Référence : docs/phase-0/strategie-isolation.md §2.
 */
@Injectable()
export class PatientsService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly etablissementsService: EtablissementsService,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<PatientEntity> {
    return this.tenantContext.getManager().getRepository(PatientEntity);
  }

  async create(dto: CreatePatientDto, actingUserId: string): Promise<PatientEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const etablissement = await this.etablissementsService.findById(etablissementId);
    const sequence = await this.etablissementsService.incrementerCompteur(etablissementId, 'patient');
    const idh = genererIdh(etablissement.code, new Date().getFullYear(), sequence);

    const patient = await this.repository.save(
      this.repository.create({
        ...dto,
        etablissementId,
        idh,
        contactUrgence: dto.contactUrgence ?? null,
        assuranceId: dto.assuranceId ?? null,
      }),
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'patient.create',
      ressource: 'patient',
      ressourceId: patient.id,
      metadata: { idh },
    });

    return patient;
  }

  async findAll(page: number, limit: number): Promise<PaginatedResult<PatientEntity>> {
    const [items, total] = await this.repository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<PatientEntity> {
    const patient = await this.repository.findOne({ where: { id } });
    if (!patient) {
      throw new NotFoundException('Patient introuvable.');
    }
    return patient;
  }

  /** Utilisé par /patients/me/dossier (le patient consulte son propre dossier). */
  async findByUserId(userId: string): Promise<PatientEntity | null> {
    return this.repository.findOne({ where: { userId } });
  }

  async update(id: string, dto: UpdatePatientDto, actingUserId: string): Promise<PatientEntity> {
    const patient = await this.findById(id);
    Object.assign(patient, dto);
    const saved = await this.repository.save(patient);

    await this.auditService.log({
      etablissementId: patient.etablissementId,
      userId: actingUserId,
      action: 'patient.update',
      ressource: 'patient',
      ressourceId: patient.id,
    });

    return saved;
  }

  /** Crée le compte de connexion du patient au portail mobile (Phase 10) — sur demande, pas systématique. */
  async creerCompteAcces(id: string, dto: CreatePatientAccesDto, actingUserId: string): Promise<PatientEntity> {
    const patient = await this.findById(id);
    if (patient.userId) {
      throw new ConflictException('Ce patient possède déjà un compte d’accès.');
    }

    const user = await this.usersService.create({
      scope: Scope.PATIENT,
      etablissementId: patient.etablissementId,
      roles: [Role.PATIENT],
      nom: patient.nom,
      prenom: patient.prenom,
      email: dto.email,
      password: dto.password,
    });

    patient.userId = user.id;
    const saved = await this.repository.save(patient);

    await this.auditService.log({
      etablissementId: patient.etablissementId,
      userId: actingUserId,
      action: 'patient.compte_acces.create',
      ressource: 'patient',
      ressourceId: patient.id,
    });

    return saved;
  }
}
