import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { PushNotificationsService } from '../../notifications/application/push-notifications.service';
import { RealtimeGateway } from '../../notifications/presentation/realtime.gateway';
import { PatientsService } from '../../patients/application/patients.service';
import { PrescriptionsService } from '../../prescriptions/application/prescriptions.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { DispensationEntity, LigneDispensee } from '../infrastructure/entities/dispensation.entity';
import { CreateDispensationDto } from '../presentation/dto/create-dispensation.dto';
import { StockMedicamentService } from './stock-medicament.service';

/**
 * Circuit du médicament (prompt maître §12) : vérifie que la prescription est `VALIDEE`, décrémente
 * le stock ligne par ligne de façon atomique (`StockMedicamentService.decrementer`), puis passe la
 * prescription à `DISPENSEE`. Simplification MVP : une seule dispensation par prescription (pas de
 * dispensation partielle en plusieurs passages). Notifie le patient (push, générique — jamais de
 * nom de médicament dans le corps, gap identifié à l'audit du 2026-06-21).
 */
@Injectable()
export class DispensationsService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly prescriptionsService: PrescriptionsService,
    private readonly stockMedicamentService: StockMedicamentService,
    private readonly auditService: AuditService,
    private readonly patientsService: PatientsService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  private get repository(): Repository<DispensationEntity> {
    return this.tenantContext.getManager().getRepository(DispensationEntity);
  }

  async create(dto: CreateDispensationDto, pharmacienId: string): Promise<DispensationEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const prescription = await this.prescriptionsService.findById(dto.prescriptionId);

    const lignesDispensees: LigneDispensee[] = [];
    for (const ligne of dto.lignes) {
      const stock = await this.stockMedicamentService.decrementer(ligne.stockMedicamentId, ligne.quantite);
      lignesDispensees.push({
        prescriptionLigneId: ligne.prescriptionLigneId,
        medicamentId: stock.medicamentId,
        stockMedicamentId: stock.id,
        quantite: ligne.quantite,
      });
    }

    // Lève ConflictException si le statut n'était pas VALIDEE — vérifié après le décompte du stock
    // pour échouer sur la même transaction (rollback complet) sans jamais committer un état incohérent.
    await this.prescriptionsService.marquerDispensee(prescription.id);

    const dispensation = await this.repository.save(
      this.repository.create({
        etablissementId,
        prescriptionId: dto.prescriptionId,
        pharmacienId,
        date: new Date(),
        lignesDispensees,
      }),
    );

    await this.auditService.log({
      etablissementId,
      userId: pharmacienId,
      action: 'dispensation.create',
      ressource: 'dispensation',
      ressourceId: dispensation.id,
      metadata: { prescriptionId: dto.prescriptionId, nombreLignes: lignesDispensees.length },
    });

    const patient = await this.patientsService.findById(prescription.patientId);
    this.tenantContext.afterCommit(() => {
      this.realtimeGateway.emitToEtablissement(etablissementId, 'pharmacie:prescription.dispensee', {
        prescriptionId: prescription.id,
        patientId: prescription.patientId,
      });
      if (patient.userId) {
        void this.pushNotificationsService.envoyerATousLesAppareils(patient.userId, {
          titre: 'Médicaments dispensés',
          corps: 'Vos médicaments ont été dispensés par la pharmacie.',
          data: { prescriptionId: prescription.id },
        });
      }
    });

    return dispensation;
  }
}
