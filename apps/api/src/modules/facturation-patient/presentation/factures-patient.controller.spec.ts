import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Permission, Scope } from '@sih-saas/shared';
import { FacturesPatientController } from './factures-patient.controller';

describe('FacturesPatientController', () => {
  let facturesPatientService: { findByPatient: jest.Mock };
  let patientsService: { findByUserId: jest.Mock };
  let controller: FacturesPatientController;

  beforeEach(() => {
    facturesPatientService = { findByPatient: jest.fn().mockResolvedValue({ items: [], page: 1, limit: 20, total: 0, totalPages: 0 }) };
    patientsService = { findByUserId: jest.fn() };
    controller = new FacturesPatientController(facturesPatientService as any, patientsService as any);
  });

  describe('findAll — patient self-service', () => {
    const currentUser = {
      sub: 'user-1',
      scope: Scope.PATIENT,
      etablissementId: 'etab-1',
      roles: [],
      permissions: [],
      serviceId: null,
    };

    it('résout le patient via son userId et ignore le `patientId` du chemin', async () => {
      patientsService.findByUserId.mockResolvedValue({ id: 'patient-1' });

      await controller.findAll('me', { page: 1, limit: 20 } as any, currentUser as any);

      expect(patientsService.findByUserId).toHaveBeenCalledWith('user-1');
      expect(facturesPatientService.findByPatient).toHaveBeenCalledWith('patient-1', 1, 20);
    });

    it('refuse si aucun dossier patient n’est associé au compte', async () => {
      patientsService.findByUserId.mockResolvedValue(null);

      await expect(controller.findAll('me', { page: 1, limit: 20 } as any, currentUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll — établissement', () => {
    const currentUser = {
      sub: 'staff-1',
      scope: Scope.ETABLISSEMENT,
      etablissementId: 'etab-1',
      roles: [],
      permissions: [Permission.FACTURE_PATIENT_CREATE],
      serviceId: null,
    };

    it('liste les factures du patient si la permission est présente et l’UUID valide', async () => {
      const patientId = '11111111-1111-4111-8111-111111111111';
      await controller.findAll(patientId, { page: 1, limit: 20 } as any, currentUser as any);

      expect(facturesPatientService.findByPatient).toHaveBeenCalledWith(patientId, 1, 20);
    });

    it('refuse sans la permission FACTURE_PATIENT_CREATE', async () => {
      const sansPermission = { ...currentUser, permissions: [] };
      const patientId = '11111111-1111-4111-8111-111111111111';

      await expect(controller.findAll(patientId, { page: 1, limit: 20 } as any, sansPermission as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('refuse un patientId qui n’est pas un UUID valide', async () => {
      await expect(controller.findAll('pas-un-uuid', { page: 1, limit: 20 } as any, currentUser as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
