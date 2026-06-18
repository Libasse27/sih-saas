import { ConflictException } from '@nestjs/common';
import { ResultatsAnalyseService } from './resultats-analyse.service';

describe('ResultatsAnalyseService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock; afterCommit: jest.Mock };
  let demandesAnalyseService: { marquerEnCours: jest.Mock; marquerTerminee: jest.Mock };
  let dossierMedicalService: { ajouterCompteRendu: jest.Mock };
  let realtimeGateway: { emitToEtablissement: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: ResultatsAnalyseService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'resultat-1', ...entity })),
      findOne: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
      afterCommit: jest.fn((cb) => cb()),
    };
    demandesAnalyseService = {
      marquerEnCours: jest.fn().mockResolvedValue(undefined),
      marquerTerminee: jest.fn().mockResolvedValue({
        id: 'demande-1',
        patientId: 'patient-1',
        prescripteurId: 'medecin-1',
        etablissementId: 'etab-1',
        typeAnalyse: 'NFS',
      }),
    };
    dossierMedicalService = { ajouterCompteRendu: jest.fn().mockResolvedValue(undefined) };
    realtimeGateway = { emitToEtablissement: jest.fn() };
    auditService = { log: jest.fn() };

    service = new ResultatsAnalyseService(
      tenantContext as any,
      demandesAnalyseService as any,
      dossierMedicalService as any,
      realtimeGateway as any,
      auditService as any,
    );
  });

  it('ecrire() passe la demande EN_COURS et journalise', async () => {
    const resultat = await service.ecrire('demande-1', { resultats: { hb: 13.2 } }, 'biologiste-1');

    expect(demandesAnalyseService.marquerEnCours).toHaveBeenCalledWith('demande-1');
    expect(resultat.demandeId).toBe('demande-1');
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'labo.resultat.ecrire' }));
  });

  it('valider() refuse un résultat déjà validé', async () => {
    repository.findOne.mockResolvedValue({ id: 'resultat-1', demandeId: 'demande-1', dateValidation: new Date() });
    await expect(service.valider('demande-1', 'biologiste-1')).rejects.toThrow(ConflictException);
  });

  it('valider() clôture la demande, ajoute un compte rendu au DME et notifie le prescripteur', async () => {
    repository.findOne.mockResolvedValue({ id: 'resultat-1', demandeId: 'demande-1', dateValidation: null, valeursCritiques: true, fichierUrl: null });

    await service.valider('demande-1', 'biologiste-1');

    expect(demandesAnalyseService.marquerTerminee).toHaveBeenCalledWith('demande-1');
    expect(dossierMedicalService.ajouterCompteRendu).toHaveBeenCalledWith(
      'patient-1',
      expect.objectContaining({ auteurId: 'biologiste-1', type: 'resultat_labo' }),
      'etab-1',
    );
    expect(realtimeGateway.emitToEtablissement).toHaveBeenCalledWith(
      'etab-1',
      'labo:resultat.disponible',
      expect.objectContaining({ demandeId: 'demande-1', patientId: 'patient-1' }),
    );
  });
});
