import { ConflictException } from '@nestjs/common';
import { ComptesRendusImagerieService } from './comptes-rendus-imagerie.service';

describe('ComptesRendusImagerieService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock; afterCommit: jest.Mock };
  let demandesImagerieService: { marquerEnCours: jest.Mock; marquerTerminee: jest.Mock };
  let dossierMedicalService: { ajouterCompteRendu: jest.Mock };
  let realtimeGateway: { emitToEtablissement: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: ComptesRendusImagerieService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'cr-1', ...entity })),
      findOne: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
      afterCommit: jest.fn((cb) => cb()),
    };
    demandesImagerieService = {
      marquerEnCours: jest.fn().mockResolvedValue(undefined),
      marquerTerminee: jest.fn().mockResolvedValue({
        id: 'demande-1',
        patientId: 'patient-1',
        prescripteurId: 'medecin-1',
        etablissementId: 'etab-1',
        typeExamen: 'Radiographie thoracique',
      }),
    };
    dossierMedicalService = { ajouterCompteRendu: jest.fn().mockResolvedValue(undefined) };
    realtimeGateway = { emitToEtablissement: jest.fn() };
    auditService = { log: jest.fn() };

    service = new ComptesRendusImagerieService(
      tenantContext as any,
      demandesImagerieService as any,
      dossierMedicalService as any,
      realtimeGateway as any,
      auditService as any,
    );
  });

  it('ecrire() passe la demande EN_COURS', async () => {
    const compteRendu = await service.ecrire('demande-1', { fichierDicomUrl: 'https://x/img.dcm' }, 'manip-1');

    expect(demandesImagerieService.marquerEnCours).toHaveBeenCalledWith('demande-1');
    expect(compteRendu.demandeId).toBe('demande-1');
  });

  it('valider() refuse sans conclusion (ni fournie, ni déjà présente)', async () => {
    repository.findOne.mockResolvedValue({ id: 'cr-1', demandeId: 'demande-1', conclusion: null, dateValidation: null });

    await expect(service.valider('demande-1', {}, 'radiologue-1')).rejects.toThrow(ConflictException);
  });

  it('valider() clôture la demande, ajoute au DME et notifie', async () => {
    repository.findOne.mockResolvedValue({
      id: 'cr-1',
      demandeId: 'demande-1',
      conclusion: null,
      fichierDicomUrl: null,
      dateValidation: null,
    });

    await service.valider('demande-1', { conclusion: 'RAS' }, 'radiologue-1');

    expect(demandesImagerieService.marquerTerminee).toHaveBeenCalledWith('demande-1');
    expect(dossierMedicalService.ajouterCompteRendu).toHaveBeenCalledWith(
      'patient-1',
      expect.objectContaining({ auteurId: 'radiologue-1', type: 'compte_rendu_imagerie', contenu: 'RAS' }),
      'etab-1',
    );
    expect(realtimeGateway.emitToEtablissement).toHaveBeenCalledWith(
      'etab-1',
      'imagerie:rapport.disponible',
      expect.objectContaining({ demandeId: 'demande-1' }),
    );
  });
});
