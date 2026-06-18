import { Injectable, NotFoundException } from '@nestjs/common';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { AssuranceEntity } from '../infrastructure/entities/assurance.entity';
import { CreateAssuranceDto } from '../presentation/dto/create-assurance.dto';

/** `clinic.assurances` est protégée par RLS — convention tenantContext.getManager(). */
@Injectable()
export class AssurancesService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<AssuranceEntity> {
    return this.tenantContext.getManager().getRepository(AssuranceEntity);
  }

  async create(patientId: string, dto: CreateAssuranceDto, actingUserId: string): Promise<AssuranceEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const assurance = await this.repository.save(this.repository.create({ ...dto, etablissementId, patientId }));

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'assurance.create',
      ressource: 'assurance',
      ressourceId: assurance.id,
      metadata: { patientId, organisme: dto.organisme },
    });

    return assurance;
  }

  async findById(id: string): Promise<AssuranceEntity> {
    const assurance = await this.repository.findOne({ where: { id } });
    if (!assurance) {
      throw new NotFoundException('Assurance introuvable.');
    }
    return assurance;
  }

  async findByPatient(patientId: string): Promise<AssuranceEntity[]> {
    return this.repository.find({ where: { patientId }, order: { valideDu: 'DESC' } });
  }

  /** Lue par FacturesPatientService au calcul de la part assurance/reste à charge (decisions du plan Phase 8). */
  async findActivePourPatient(patientId: string): Promise<AssuranceEntity | null> {
    const aujourdhui = new Date().toISOString().slice(0, 10);
    return this.repository.findOne({
      where: { patientId, valideDu: LessThanOrEqual(aujourdhui), valideAu: MoreThanOrEqual(aujourdhui) },
      order: { valideDu: 'DESC' },
    });
  }
}
