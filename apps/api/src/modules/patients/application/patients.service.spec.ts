import { ConflictException } from '@nestjs/common';
import { Role, Scope, Sexe } from '@sih-saas/shared';
import { ILike } from 'typeorm';
import { PatientEntity } from '../infrastructure/entities/patient.entity';
import { PatientsService } from './patients.service';

describe('PatientsService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let etablissementsService: { findById: jest.Mock; incrementerCompteur: jest.Mock };
  let usersService: { create: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: PatientsService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'patient-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    etablissementsService = {
      findById: jest.fn().mockResolvedValue({ id: 'etab-1', code: 'HMS' }),
      incrementerCompteur: jest.fn().mockResolvedValue(1),
    };
    usersService = { create: jest.fn().mockResolvedValue({ id: 'user-1' }) };
    auditService = { log: jest.fn() };

    service = new PatientsService(
      tenantContext as any,
      etablissementsService as any,
      usersService as any,
      auditService as any,
    );
  });

  describe('create', () => {
    const dto = { nom: 'Diallo', prenom: 'Ousmane', dateNaissance: '1990-05-12', sexe: Sexe.M };

    it('génère un IDH basé sur le code établissement, l’année et le compteur incrémenté', async () => {
      const annee = new Date().getFullYear();
      const patient = await service.create(dto, 'user-1');

      expect(etablissementsService.incrementerCompteur).toHaveBeenCalledWith('etab-1', 'patient');
      expect(patient.idh).toBe(`HMS-${annee}-000001`);
      expect(patient.etablissementId).toBe('etab-1');
    });

    it('journalise la création', async () => {
      await service.create(dto, 'user-1');

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'patient.create', etablissementId: 'etab-1', userId: 'user-1' }),
      );
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      repository.findAndCount.mockResolvedValue([[], 0]);
    });

    it('sans recherche : aucun filtre where', async () => {
      await service.findAll(1, 20);
      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });

    it('avec recherche : filtre OR sur nom et prénom (ILIKE)', async () => {
      await service.findAll(1, 20, 'Diallo');
      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: [{ nom: ILike('%Diallo%') }, { prenom: ILike('%Diallo%') }] }),
      );
    });
  });

  describe('creerCompteAcces', () => {
    it('crée un utilisateur de scope PATIENT et le lie au patient', async () => {
      repository.findOne.mockResolvedValue({
        id: 'patient-1',
        etablissementId: 'etab-1',
        nom: 'Diallo',
        prenom: 'Ousmane',
        userId: null,
      } as PatientEntity);

      await service.creerCompteAcces('patient-1', { email: 'ousmane@example.sn', password: 'Password123!' }, 'staff-1');

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ scope: Scope.PATIENT, etablissementId: 'etab-1', roles: [Role.PATIENT] }),
      );
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }));
    });

    it('refuse de créer un second compte pour le même patient', async () => {
      repository.findOne.mockResolvedValue({ id: 'patient-1', userId: 'user-existant' } as PatientEntity);

      await expect(
        service.creerCompteAcces('patient-1', { email: 'x@example.sn', password: 'Password123!' }, 'staff-1'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
