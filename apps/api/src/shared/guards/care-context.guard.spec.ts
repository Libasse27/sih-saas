import { ExecutionContext, ForbiddenException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CareContextGuard } from './care-context.guard';

describe('CareContextGuard', () => {
  let patientsService: { findById: jest.Mock };
  let admissionsService: { findAdmissionEnCoursPourPatient: jest.Mock };
  let rendezVousService: { existeRdvEntrePraticienEtPatient: jest.Mock };
  let auditService: { log: jest.Mock };
  let guard: CareContextGuard;
  let request: any;

  function buildContext(): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    patientsService = { findById: jest.fn() };
    admissionsService = { findAdmissionEnCoursPourPatient: jest.fn().mockResolvedValue(null) };
    rendezVousService = { existeRdvEntrePraticienEtPatient: jest.fn().mockResolvedValue(false) };
    auditService = { log: jest.fn() };
    guard = new CareContextGuard(
      patientsService as any,
      admissionsService as any,
      rendezVousService as any,
      auditService as any,
    );
    request = {
      user: { sub: 'medecin-1', etablissementId: 'etab-1', serviceId: null },
      params: { patientId: 'patient-1' },
    };
    patientsService.findById.mockResolvedValue({ id: 'patient-1', etablissementId: 'etab-1' });
  });

  it('autorise et journalise quand le patient appartient au même établissement et n’a aucune admission en cours', async () => {
    await expect(guard.canActivate(buildContext())).resolves.toBe(true);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'dossier.access.allowed', userId: 'medecin-1' }),
    );
    expect(request.patient).toEqual({ id: 'patient-1', etablissementId: 'etab-1' });
  });

  it('refuse et journalise si le patient appartient à un autre établissement (défense en profondeur)', async () => {
    patientsService.findById.mockResolvedValue({ id: 'patient-1', etablissementId: 'etab-AUTRE' });

    await expect(guard.canActivate(buildContext())).rejects.toThrow(ForbiddenException);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'dossier.access.denied', metadata: { raison: 'etablissement_different' } }),
    );
  });

  it('journalise le refus si le patient est introuvable puis relaie l’erreur d’origine', async () => {
    patientsService.findById.mockRejectedValue(new NotFoundException('Patient introuvable.'));

    await expect(guard.canActivate(buildContext())).rejects.toThrow(NotFoundException);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'dossier.access.denied', metadata: { raison: 'patient_introuvable' } }),
    );
  });

  it("lève une erreur de configuration si la route n'a ni :patientId ni :id", async () => {
    request.params = {};

    await expect(guard.canActivate(buildContext())).rejects.toThrow(InternalServerErrorException);
  });

  describe('lien de soin (admission en cours)', () => {
    beforeEach(() => {
      admissionsService.findAdmissionEnCoursPourPatient.mockResolvedValue({
        id: 'admission-1',
        medecinReferentId: 'medecin-referent',
        serviceId: 'service-1',
      });
    });

    it('autorise le médecin référent de l’admission', async () => {
      request.user.sub = 'medecin-referent';

      await expect(guard.canActivate(buildContext())).resolves.toBe(true);
    });

    it('autorise le personnel affecté au service où le patient est hospitalisé', async () => {
      request.user.sub = 'infirmier-1';
      request.user.serviceId = 'service-1';

      await expect(guard.canActivate(buildContext())).resolves.toBe(true);
    });

    it('autorise s’il existe un rendez-vous entre ce praticien et ce patient', async () => {
      request.user.sub = 'medecin-2';
      rendezVousService.existeRdvEntrePraticienEtPatient.mockResolvedValue(true);

      await expect(guard.canActivate(buildContext())).resolves.toBe(true);
      expect(rendezVousService.existeRdvEntrePraticienEtPatient).toHaveBeenCalledWith('medecin-2', 'patient-1');
    });

    it('refuse et journalise (lien_de_soin_absent) si aucune des conditions n’est remplie', async () => {
      request.user.sub = 'medecin-2';
      request.user.serviceId = 'AUTRE_SERVICE';

      await expect(guard.canActivate(buildContext())).rejects.toThrow(ForbiddenException);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'dossier.access.denied', metadata: { raison: 'lien_de_soin_absent' } }),
      );
    });
  });
});
