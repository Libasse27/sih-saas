import { ForbiddenException } from '@nestjs/common';
import { Permission, Scope } from '@sih-saas/shared';
import { PatientsController } from './patients.controller';

describe('PatientsController — findByIdh (Phase 12)', () => {
  let patientsService: { findByIdh: jest.Mock };
  let controller: PatientsController;

  beforeEach(() => {
    patientsService = { findByIdh: jest.fn() };
    controller = new PatientsController(patientsService as any);
  });

  it('autorise un appelant avec uniquement SOCIAL_MANAGE (assistant social)', async () => {
    patientsService.findByIdh.mockResolvedValue({ id: 'patient-1', idh: 'IDH-001' });
    const currentUser = {
      sub: 'assistant-1',
      scope: Scope.ETABLISSEMENT,
      etablissementId: 'etab-1',
      roles: [],
      permissions: [Permission.SOCIAL_MANAGE],
      serviceId: null,
    };

    await expect(controller.findByIdh('IDH-001', currentUser as any)).resolves.toEqual({
      id: 'patient-1',
      idh: 'IDH-001',
    });
  });

  it('autorise un appelant avec uniquement PATIENT_READ', async () => {
    patientsService.findByIdh.mockResolvedValue({ id: 'patient-1', idh: 'IDH-001' });
    const currentUser = {
      sub: 'medecin-1',
      scope: Scope.ETABLISSEMENT,
      etablissementId: 'etab-1',
      roles: [],
      permissions: [Permission.PATIENT_READ],
      serviceId: null,
    };

    await expect(controller.findByIdh('IDH-001', currentUser as any)).resolves.toBeDefined();
  });

  it('refuse un appelant sans PATIENT_READ ni SOCIAL_MANAGE', async () => {
    const currentUser = {
      sub: 'technicien-1',
      scope: Scope.ETABLISSEMENT,
      etablissementId: 'etab-1',
      roles: [],
      permissions: [],
      serviceId: null,
    };

    expect(() => controller.findByIdh('IDH-001', currentUser as any)).toThrow(ForbiddenException);
    expect(patientsService.findByIdh).not.toHaveBeenCalled();
  });
});
