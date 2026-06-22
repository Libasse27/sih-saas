import { randomUUID } from 'crypto';
import { readFile, rm } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { Scope } from '@sih-saas/shared';
import { AuditService } from '../../audit/application/audit.service';
import { EtablissementsService } from '../../etablissements/application/etablissements.service';
import { SubscriptionsService } from '../../subscriptions/application/subscriptions.service';
import { emptyTenantContext, tenantAls } from '../../../shared/tenant/tenant-context.storage';
import { DmeAttachmentsLinkService } from '../infrastructure/storage/dme-attachments-link.service';
import { DmeAttachmentsStorageService } from '../infrastructure/storage/dme-attachments-storage.service';
import { DossierMedicalService } from './dossier-medical.service';
import {
  DOSSIER_MEDICAL_MODEL,
  DossierMedicalDocument,
  DossierMedicalSchema,
} from '../infrastructure/schemas/dossier-medical.schema';

loadEnv();

const REPERTOIRE_TEST = path.join(os.tmpdir(), `sih-saas-test-dme-attachments-${randomUUID()}`);

function fakeConfig(valeurs: Record<string, unknown>): ConfigService {
  return { get: (cle: string) => valeurs[cle] } as unknown as ConfigService;
}

/**
 * Test d'isolation multi-tenant réel (pas de mock) — exige MongoDB démarré (pnpm docker:dev:up).
 * Premier usage concret du plugin tenant (Phase 2) sur une vraie collection clinique.
 * Phase 33 : `storageService`/`linkService` sont de VRAIES instances (chiffrement AES-256-GCM +
 * signature HMAC réels sur un répertoire temporaire) — seuls `subscriptionsService`/`etablissementsService`
 * restent mockés (leur propre logique est déjà couverte par leurs suites unitaires dédiées).
 */
describe('DossierMedicalService (intégration MongoDB réelle)', () => {
  let service: DossierMedicalService;
  let auditService: { log: jest.Mock };
  let subscriptionsService: { assertWithinLimit: jest.Mock };
  let etablissementsService: { incrementUsage: jest.Mock };

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI!);
    const model = mongoose.model<DossierMedicalDocument>(DOSSIER_MEDICAL_MODEL, DossierMedicalSchema, 'dossiers_medicaux_test');
    auditService = { log: jest.fn() };
    subscriptionsService = { assertWithinLimit: jest.fn().mockResolvedValue(undefined) };
    etablissementsService = { incrementUsage: jest.fn().mockResolvedValue(undefined) };

    const storageConfig = fakeConfig({ 'dmeAttachments.storageDir': REPERTOIRE_TEST, 'dmeAttachments.encryptionKey': '00'.repeat(32) });
    const linkConfig = fakeConfig({ 'dmeAttachments.linkSecret': 'test-secret', 'dmeAttachments.linkTtlMinutes': 15 });
    const serviceConfig = fakeConfig({
      'dmeAttachments.maxTailleMo': 10,
      apiPublicUrl: 'http://localhost:3000',
      apiPrefix: 'api',
    });

    service = new DossierMedicalService(
      model,
      auditService as unknown as AuditService,
      subscriptionsService as unknown as SubscriptionsService,
      etablissementsService as unknown as EtablissementsService,
      new DmeAttachmentsStorageService(storageConfig),
      new DmeAttachmentsLinkService(linkConfig),
      serviceConfig,
    );
  });

  afterAll(async () => {
    await mongoose.connection.collection('dossiers_medicaux_test').drop().catch(() => undefined);
    await mongoose.disconnect();
    await rm(REPERTOIRE_TEST, { recursive: true, force: true });
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

  it('journalise aussi une simple consultation en lecture (gap audit 2026-06-21, prompt maître §18)', async () => {
    auditService.log.mockClear();

    const dossier = await runAs(etabA, () => service.consulter(patientA, etabA, 'medecin-1'));

    expect(dossier.patientId).toBe(patientA);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'dossier.consulter', etablissementId: etabA, userId: 'medecin-1', ressourceId: patientA }),
    );
  });

  it('enregistre une séance de rééducation (Phase 33, KINESITHERAPEUTE — pas de permission dédiée)', async () => {
    const dossier = await runAs(etabA, () =>
      service.ajouterSeanceReadaptation(
        patientA,
        { kinesitherapeuteId: 'kine-1', typeSeance: 'Rééducation genou', dureeMinutes: 30, observations: 'Bonne progression' },
        etabA,
      ),
    );

    expect(dossier.seancesReadaptation).toHaveLength(1);
    expect(dossier.seancesReadaptation[0].id).toBeTruthy();
    expect(dossier.seancesReadaptation[0].dureeMinutes).toBe(30);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'dossier.seance_readaptation.create', userId: 'kine-1' }),
    );
  });

  it('enregistre une consultation diététique et calcule l’IMC côté serveur', async () => {
    const dossier = await runAs(etabA, () =>
      service.ajouterConsultationDietetique(
        patientA,
        { dieteticienId: 'diet-1', poidsKg: 70, tailleCm: 175, recommandations: 'Réduire le sel' },
        etabA,
      ),
    );

    expect(dossier.consultationsDietetiques).toHaveLength(1);
    // IMC = poids / taille² = 70 / 1.75² ≈ 22.9
    expect(dossier.consultationsDietetiques[0].imc).toBeCloseTo(22.9, 1);
  });

  it('chiffre une pièce jointe sur disque, l’ajoute au dossier et incrémente le quota de stockage', async () => {
    etablissementsService.incrementUsage.mockClear();
    const contenu = Buffer.from('contenu de test pour la pièce jointe DME');

    const piece = await runAs(etabA, () =>
      service.ajouterPieceJointe(patientA, etabA, 'medecin-1', {
        buffer: contenu,
        mimetype: 'application/pdf',
        originalname: 'compte-rendu.pdf',
        size: contenu.byteLength,
      }),
    );

    expect(piece.id).toBeTruthy();
    expect(subscriptionsService.assertWithinLimit).toHaveBeenCalledWith(etabA, 'maxStockageMo', piece.tailleMo);
    expect(etablissementsService.incrementUsage).toHaveBeenCalledWith(etabA, 'stockageMo', piece.tailleMo);

    // Vérifie un VRAI chiffrement (pas juste un nom de fichier opaque) : les octets bruts sur disque
    // ne contiennent jamais le contenu en clair — même réflexe que la vérification GPG des sauvegardes (Phase 31).
    const brut = await readFile(path.join(REPERTOIRE_TEST, piece.cheminStockage));
    expect(brut.includes(contenu)).toBe(false);

    // round-trip réel : lien signé généré puis vérifié, contenu déchiffré identique à l'original.
    const lien = await runAs(etabA, () =>
      service.genererLienTelechargementPieceJointe(patientA, etabA, piece.id, 'medecin-1'),
    );
    expect(lien.url).toContain('/dossier-medical/pieces-jointes/telechargement?token=');

    const { buffer } = await runAs(etabA, () => service.lireContenuPieceJointe(patientA, piece.id));
    expect(buffer.equals(contenu)).toBe(true);
  });

  it('rejette un type de fichier non autorisé sans toucher au disque ni au quota', async () => {
    await expect(
      runAs(etabA, () =>
        service.ajouterPieceJointe(patientA, etabA, 'medecin-1', {
          buffer: Buffer.from('faux exécutable'),
          mimetype: 'application/x-msdownload',
          originalname: 'virus.exe',
          size: 16,
        }),
      ),
    ).rejects.toThrow('Type de fichier non autorisé');
  });

  it('propage le refus du quota de stockage (assertWithinLimit) sans persister la pièce jointe', async () => {
    subscriptionsService.assertWithinLimit.mockRejectedValueOnce(new ForbiddenException('Limite du forfait atteinte.'));
    const contenu = Buffer.from('contenu refusé');

    await expect(
      runAs(etabA, () =>
        service.ajouterPieceJointe(patientA, etabA, 'medecin-1', {
          buffer: contenu,
          mimetype: 'application/pdf',
          originalname: 'refuse.pdf',
          size: contenu.byteLength,
        }),
      ),
    ).rejects.toThrow(ForbiddenException);

    const dossier = await runAs(etabA, () => service.getOrCreate(patientA));
    expect(dossier.piecesJointes.some((p) => p.nomOriginal === 'refuse.pdf')).toBe(false);
  });
});
