import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { PatientsService } from '../../patients/application/patients.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { NoteSocialeEntity } from '../infrastructure/entities/note-sociale.entity';
import { CreateNoteSocialeDto } from '../presentation/dto/create-note-sociale.dto';

/** `clinic.notes_sociales` est protégée par RLS — voir services.service.ts pour la convention tenantContext.getManager(). */
@Injectable()
export class SocialService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly patientsService: PatientsService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<NoteSocialeEntity> {
    return this.tenantContext.getManager().getRepository(NoteSocialeEntity);
  }

  /**
   * Pas de CareContextGuard sur cette écriture (`social:manage` non 🩺, voir SocialController) —
   * cette vérification reste indispensable : sans elle, rien n'empêcherait de créer une note
   * rattachée à un `patientId` inexistant ou d'un autre tenant (RLS scope déjà `findById`).
   */
  async create(patientId: string, dto: CreateNoteSocialeDto, auteurId: string): Promise<NoteSocialeEntity> {
    await this.patientsService.findById(patientId);
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const note = await this.repository.save(
      this.repository.create({ ...dto, etablissementId, patientId, auteurId }),
    );

    await this.auditService.log({
      etablissementId,
      userId: auteurId,
      action: 'social.note.create',
      ressource: 'note_sociale',
      ressourceId: note.id,
    });

    return note;
  }

  async findAllForPatient(patientId: string): Promise<NoteSocialeEntity[]> {
    return this.repository.find({ where: { patientId }, order: { createdAt: 'DESC' } });
  }
}
