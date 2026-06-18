import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RendezVousStatut } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { RendezVousService } from '../../rendez-vous/application/rendez-vous.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { ConsultationEntity } from '../infrastructure/entities/consultation.entity';
import { CreateConsultationDto } from '../presentation/dto/create-consultation.dto';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly rendezVousService: RendezVousService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<ConsultationEntity> {
    return this.tenantContext.getManager().getRepository(ConsultationEntity);
  }

  async create(patientId: string, dto: CreateConsultationDto, praticienId: string): Promise<ConsultationEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;

    if (dto.rendezVousId) {
      const rdv = await this.rendezVousService.findById(dto.rendezVousId);
      if (rdv.patientId !== patientId) {
        throw new BadRequestException("Le rendez-vous indiqué ne concerne pas ce patient.");
      }
    }

    const consultation = await this.repository.save(
      this.repository.create({
        etablissementId,
        patientId,
        praticienId,
        rendezVousId: dto.rendezVousId ?? null,
        admissionId: dto.admissionId ?? null,
        date: new Date(),
        motif: dto.motif,
        examenClinique: dto.examenClinique ?? null,
        diagnosticCim10: dto.diagnosticCim10 ?? null,
        conclusion: dto.conclusion ?? null,
      }),
    );

    if (dto.rendezVousId) {
      await this.rendezVousService.changerStatut(dto.rendezVousId, RendezVousStatut.TERMINE, praticienId);
    }

    await this.auditService.log({
      etablissementId,
      userId: praticienId,
      action: 'consultation.create',
      ressource: 'consultation',
      ressourceId: consultation.id,
      metadata: { patientId },
    });

    return consultation;
  }

  async findAll(page: number, limit: number, patientId?: string): Promise<PaginatedResult<ConsultationEntity>> {
    const [items, total] = await this.repository.findAndCount({
      where: patientId ? { patientId } : {},
      skip: (page - 1) * limit,
      take: limit,
      order: { date: 'DESC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<ConsultationEntity> {
    const consultation = await this.repository.findOne({ where: { id } });
    if (!consultation) {
      throw new NotFoundException('Consultation introuvable.');
    }
    return consultation;
  }
}
