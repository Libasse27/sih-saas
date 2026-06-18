import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import mongoose from 'mongoose';
import { Scope } from '@sih-saas/shared';
import { AuditService } from '../../audit/application/audit.service';
import { emptyTenantContext, tenantAls } from '../../../shared/tenant/tenant-context.storage';
import { DossierMedicalService } from './dossier-medical.service';
import {
  DOSSIER_MEDICAL_MODEL,
  DossierMedicalDocument,
  DossierMedicalSchema,
} from '../infrastructure/schemas/dossier-medical.schema';

config();

/**
 * Test d'isolation multi-tenant réel (pas de mock) — exige MongoDB démarré (pnpm docker:dev:up).
 * Premier usage concret du plugin tenant (Phase 2) sur une vraie collection clinique.
 */
describe('DossierMedicalService (intégration MongoDB réelle)', () => {
  let service: DossierMedicalService;
  let auditService: { log: jest.Mock };

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI!);
    const model = mongoose.model<DossierMedicalDocument>(DOSSIER_MEDICAL_MODEL, DossierMedicalSchema, 'dossiers_medicaux_test');
    auditService = { log: jest.fn() };
    service = new DossierMedicalService(model, auditService as unknown as AuditService);
  });

  afterAll(async () => {
    await mongoose.connection.collection('dossiers_medicaux_test').drop().catch(() => undefined);
    await mongoose.disconnect();
  });

  function runAs<T>(etablissementId: string, fn: () => T | PromiseLike<T>): Promise<T> {
    return tenantAls.run({ ...emptyTenantContext(), etablissementId, scope: Scope.ETABLISSEMENT }, () =>
      Promise.resolve(fn()),
    );
  }

  const etabA = randomUUID();
  const etabB = randomUUID();
  const patientA = randomUUID();

  it('crée un dossier avec etablissementId injecté par le plugin tenant', async () => {
    const dossier = await runAs(etabA, () => service.getOrCreate(patientA));

    expect(dossier.patientId).toBe(patientA);
    expect(dossier.etablissementId).toBe(etabA);
    expect(dossier.antecedents.allergies).toEqual([]);
  });

  it('ajoute une observation horodatée', async () => {
    const dossier = await runAs(etabA, () =>
      service.ajouterObservation(patientA, { auteurId: 'medecin-1', contenu: 'RAS', type: 'consultation' }, etabA),
    );

    expect(dossier.observations).toHaveLength(1);
    expect(dossier.observations[0].contenu).toBe('RAS');
    expect(dossier.observations[0].date).toBeInstanceOf(Date);
  });

  it('met à jour les antécédents en fusionnant avec les valeurs existantes', async () => {
    await runAs(etabA, () =>
      service.mettreAJourAntecedents(patientA, { allergies: [{ substance: 'Pénicilline' }] }, etabA, 'medecin-1'),
    );
    const dossier = await runAs(etabA, () =>
      service.mettreAJourAntecedents(patientA, { medicaux: ['Diabète type 2'] }, etabA, 'medecin-1'),
    );

    expect(dossier.antecedents.allergies).toHaveLength(1);
    expect(dossier.antecedents.medicaux).toEqual(['Diabète type 2']);
  });

  it("isole les dossiers : l'établissement B ne voit jamais le dossier créé par A, même avec le même patientId", async () => {
    const dossierVuParA = await runAs(etabA, () => service.getOrCreate(patientA));
    const dossierVuParB = await runAs(etabB, () => service.getOrCreate(patientA));

    expect(dossierVuParA.etablissementId).toBe(etabA);
    expect(dossierVuParB.etablissementId).toBe(etabB);
    expect(dossierVuParB.observations).toHaveLength(0); // dossier distinct, pas celui de A
    expect(dossierVuParA.id).not.toBe(dossierVuParB.id);
  });

  it('journalise chaque ajout de compte rendu', async () => {
    await runAs(etabA, () =>
      service.ajouterCompteRendu(patientA, { auteurId: 'medecin-1', type: 'sortie', contenu: 'Sortie autorisée' }, etabA),
    );

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'dossier.compte_rendu.create', etablissementId: etabA }),
    );
  });
});
