import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { AdministrationMedicamentEntity } from '../infrastructure/entities/administration-medicament.entity';
import { CreateAdministrationDto } from '../presentation/dto/create-administration.dto';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** `clinic.administration_medicament` est protégée par RLS — convention tenantContext.getManager(). */
@Injectable()
export class AdministrationService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<AdministrationMedicamentEntity> {
    return this.tenantContext.getManager().getRepository(AdministrationMedicamentEntity);
  }

  async create(
    patientId: string,
    dto: CreateAdministrationDto,
    infirmierId: string,
  ): Promise<AdministrationMedicamentEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const administration = await this.repository.save(
      this.repository.create({
        etablissementId,
        patientId,
        prescriptionLigneId: dto.prescriptionLigneId,
        infirmierId,
        dateHeure: new Date(),
        statut: dto.statut,
        commentaire: dto.commentaire ?? null,
      }),
    );

    await this.auditService.log({
      etablissementId,
      userId: infirmierId,
      action: 'administration.create',
      ressource: 'administration_medicament',
      ressourceId: administration.id,
      metadata: { patientId, statut: dto.statut },
    });

    return administration;
  }

  async findByPatient(patientId: string, page: number, limit: number): Promise<PaginatedResult<AdministrationMedicamentEntity>> {
    const [items, total] = await this.repository.findAndCount({
      where: { patientId },
      skip: (page - 1) * limit,
      take: limit,
      order: { dateHeure: 'DESC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }
}
