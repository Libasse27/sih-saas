import { ConflictException } from '@nestjs/common';
import { PrescriptionStatut } from '@sih-saas/shared';
import { DispensationsService } from './dispensations.service';

describe('DispensationsService', () => {
  let repository: { create: jest.Mock; save: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock; afterCommit: jest.Mock };
  let prescriptionsService: { findById: jest.Mock; marquerDispensee: jest.Mock };
  let stockMedicamentService: { decrementer: jest.Mock };
  let auditService: { log: jest.Mock };
  let patientsService: { findById: jest.Mock };
  let realtimeGateway: { emitToEtablissement: jest.Mock };
  let pushNotificationsService: { envoyerATousLesAppareils: jest.Mock };
  let service: DispensationsService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'dispensation-1', ...entity })),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
      afterCommit: jest.fn((callback: () => void) => callback()),
    };
    prescriptionsService = {
      findById: jest.fn().mockResolvedValue({ id: 'prescription-1', patientId: 'patient-1', statut: PrescriptionStatut.VALIDEE }),
      marquerDispensee: jest.fn().mockResolvedValue({ id: 'prescription-1', statut: PrescriptionStatut.DISPENSEE }),
    };
    stockMedicamentService = {
      decrementer: jest.fn().mockResolvedValue({ id: 'stock-1', medicamentId: 'med-1', quantite: 45 }),
    };
    auditService = { log: jest.fn() };
    patientsService = { findById: jest.fn().mockResolvedValue({ id: 'patient-1', userId: 'user-patient-1' }) };
    realtimeGateway = { emitToEtablissement: jest.fn() };
    pushNotificationsService = { envoyerATousLesAppareils: jest.fn().mockResolvedValue(undefined) };

    service = new DispensationsService(
      tenantContext as any,
      prescriptionsService as any,
      stockMedicamentService as any,
      auditService as any,
      patientsService as any,
      realtimeGateway as any,
      pushNotificationsService as any,
    );
  });

  const dto = {
    prescriptionId: 'prescription-1',
    lignes: [{ prescriptionLigneId: 'ligne-1', stockMedicamentId: 'stock-1', quantite: 5 }],
  };

  it('décrémente le stock, marque la prescription DISPENSEE et journalise', async () => {
    const dispensation = await service.create(dto, 'pharmacien-1');

    expect(stockMedicamentService.decrementer).toHaveBeenCalledWith('stock-1', 5);
    expect(prescriptionsService.marquerDispensee).toHaveBeenCalledWith('prescription-1');
    expect(dispensation.lignesDispensees).toEqual([
      { prescriptionLigneId: 'ligne-1', medicamentId: 'med-1', stockMedicamentId: 'stock-1', quantite: 5 },
    ]);
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'dispensation.create' }));
    expect(realtimeGateway.emitToEtablissement).toHaveBeenCalledWith(
      'etab-1',
      'pharmacie:prescription.dispensee',
      expect.objectContaining({ prescriptionId: 'prescription-1', patientId: 'patient-1' }),
    );
    expect(pushNotificationsService.envoyerATousLesAppareils).toHaveBeenCalledWith('user-patient-1', expect.anything());
  });

  it('propage ConflictException si le stock est insuffisant (rollback transactionnel)', async () => {
    stockMedicamentService.decrementer.mockRejectedValue(new ConflictException('Stock insuffisant pour ce lot.'));

    await expect(service.create(dto, 'pharmacien-1')).rejects.toThrow(ConflictException);
    expect(prescriptionsService.marquerDispensee).not.toHaveBeenCalled();
  });

  it('propage ConflictException si la prescription n’est pas VALIDEE', async () => {
    prescriptionsService.marquerDispensee.mockRejectedValue(
      new ConflictException('Seule une prescription VALIDEE peut être dispensée (statut actuel : EN_ATTENTE).'),
    );

    await expect(service.create(dto, 'pharmacien-1')).rejects.toThrow(ConflictException);
  });
});
