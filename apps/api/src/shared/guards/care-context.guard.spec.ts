import { ExecutionContext, ForbiddenException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CareContextGuard } from './care-context.guard';

describe('CareContextGuard', () => {
  let patientsService: { findById: jest.Mock };
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
    auditService = { log: jest.fn() };
    guard = new CareContextGuard(patientsService as any, auditService as any);
    request = {
      user: { sub: 'medecin-1', etablissementId: 'etab-1' },
      params: { patientId: 'patient-1' },
    };
  });

  it('autorise et journalise quand le patient appartient au même établissement', async () => {
    patientsService.findById.mockResolvedValue({ id: 'patient-1', etablissementId: 'etab-1' });

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
});
