import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from '../../audit/application/audit.service';
import { EtablissementsService } from '../../etablissements/application/etablissements.service';
import { SubscriptionsService } from '../../subscriptions/application/subscriptions.service';
import { DmeAttachmentsLinkService } from '../infrastructure/storage/dme-attachments-link.service';
import { DmeAttachmentsStorageService } from '../infrastructure/storage/dme-attachments-storage.service';
import {
  Antecedents,
  CompteRenduEntry,
  ConsultationDietetiqueEntry,
  DOSSIER_MEDICAL_MODEL,
  DossierMedicalDocument,
  ObservationEntry,
  PieceJointeEntry,
  SeanceReadaptationEntry,
} from '../infrastructure/schemas/dossier-medical.schema';

/** Types MIME acceptés pour une pièce jointe DME — images et documents courants, jamais d'exécutable. */
const MIMETYPES_AUTORISES = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export interface FichierUpload {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Injectable()
export class DossierMedicalService {
  constructor(
    @InjectModel(DOSSIER_MEDICAL_MODEL) private readonly model: Model<DossierMedicalDocument>,
    private readonly auditService: AuditService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly etablissementsService: EtablissementsService,
    private readonly storageService: DmeAttachmentsStorageService,
    private readonly linkService: DmeAttachmentsLinkService,
    private readonly config: ConfigService,
  ) {}

  /** Le plugin tenant injecte etablissementId à la création — voir tenant.plugin.ts. */
  async getOrCreate(patientId: string): Promise<DossierMedicalDocument> {
    const existant = await this.model.findOne({ patientId });
    if (existant) {
      return existant;
    }

    return this.model.create({
      patientId,
      antecedents: { medicaux: [], chirurgicaux: [], familiaux: [], allergies: [] },
    });
  }

  /**
   * Consultation explicite du dossier (gap identifié à l'audit du 2026-06-21 — prompt maître §18
   * exige l'audit des ACCÈS en lecture, pas seulement des modifications). Volontairement distincte
   * de `getOrCreate()`, qui reste appelée tel quel en préambule de chaque écriture ci-dessous : y
   * ajouter ce log aurait journalisé une fausse "lecture" à chaque écriture, en plus de l'entrée
   * d'audit dédiée déjà posée par chacune.
   */
  async consulter(patientId: string, etablissementId: string, actingUserId: string): Promise<DossierMedicalDocument> {
    const dossier = await this.getOrCreate(patientId);

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'dossier.consulter',
      ressource: 'dossier_medical',
      ressourceId: patientId,
    });

    return dossier;
  }

  async ajouterObservation(
    patientId: string,
    entry: Omit<ObservationEntry, 'date'>,
    etablissementId: string,
  ): Promise<DossierMedicalDocument> {
    const dossier = await this.getOrCreate(patientId);
    dossier.observations.push({ ...entry, date: new Date() });
    const saved = await dossier.save();

    await this.auditService.log({
      etablissementId,
      userId: entry.auteurId,
      action: 'dossier.observation.create',
      ressource: 'dossier_medical',
      ressourceId: patientId,
    });

    return saved;
  }

  async mettreAJourAntecedents(
    patientId: string,
    antecedents: Partial<Antecedents>,
    etablissementId: string,
    actingUserId: string,
  ): Promise<DossierMedicalDocument> {
    const dossier = await this.getOrCreate(patientId);
    dossier.antecedents = { ...dossier.antecedents, ...antecedents };
    const saved = await dossier.save();

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'dossier.antecedents.update',
      ressource: 'dossier_medical',
      ressourceId: patientId,
    });

    return saved;
  }

  async ajouterCompteRendu(
    patientId: string,
    entry: Omit<CompteRenduEntry, 'date'>,
    etablissementId: string,
  ): Promise<DossierMedicalDocument> {
    const dossier = await this.getOrCreate(patientId);
    dossier.comptesRendus.push({ ...entry, date: new Date() });
    const saved = await dossier.save();

    await this.auditService.log({
      etablissementId,
      userId: entry.auteurId,
      action: 'dossier.compte_rendu.create',
      ressource: 'dossier_medical',
      ressourceId: patientId,
    });

    return saved;
  }

  /**
   * Réadaptation (Phase 33, gap audit §10.4) — KINESITHERAPEUTE n'a que dossier:write 🩺 (matrice-rbac.md),
   * pas de permission dédiée : une séance est donc une entrée structurée du DME, comme une observation.
   */
  async ajouterSeanceReadaptation(
    patientId: string,
    entry: Omit<SeanceReadaptationEntry, 'id' | 'date'>,
    etablissementId: string,
  ): Promise<DossierMedicalDocument> {
    const dossier = await this.getOrCreate(patientId);
    dossier.seancesReadaptation.push({ ...entry, id: randomUUID(), date: new Date() });
    const saved = await dossier.save();

    await this.auditService.log({
      etablissementId,
      userId: entry.kinesitherapeuteId,
      action: 'dossier.seance_readaptation.create',
      ressource: 'dossier_medical',
      ressourceId: patientId,
    });

    return saved;
  }

  /** Diététique (Phase 33, même raisonnement) — `imc` calculé serveur, jamais confié au client. */
  async ajouterConsultationDietetique(
    patientId: string,
    entry: Omit<ConsultationDietetiqueEntry, 'id' | 'date' | 'imc'>,
    etablissementId: string,
  ): Promise<DossierMedicalDocument> {
    const tailleM = entry.tailleCm / 100;
    const imc = Math.round((entry.poidsKg / (tailleM * tailleM)) * 10) / 10;

    const dossier = await this.getOrCreate(patientId);
    dossier.consultationsDietetiques.push({ ...entry, id: randomUUID(), date: new Date(), imc });
    const saved = await dossier.save();

    await this.auditService.log({
      etablissementId,
      userId: entry.dieteticienId,
      action: 'dossier.consultation_dietetique.create',
      ressource: 'dossier_medical',
      ressourceId: patientId,
    });

    return saved;
  }

  /**
   * Pièce jointe DME (Phase 33 — comble le gap audit maxStockageMo, jusqu'ici purement décoratif
   * faute de tout sous-système d'upload réel). Contenu chiffré sur disque (DmeAttachmentsStorageService),
   * jamais en clair ni en base — seule la métadonnée est persistée en Mongo. La taille est dérivée de
   * `fichier.size` (rapporté par multer) AVANT écriture disque, pour rejeter un dépassement de quota
   * sans jamais écrire le fichier.
   */
  async ajouterPieceJointe(
    patientId: string,
    etablissementId: string,
    actingUserId: string,
    fichier: FichierUpload,
  ): Promise<PieceJointeEntry> {
    if (!MIMETYPES_AUTORISES.has(fichier.mimetype)) {
      throw new BadRequestException(`Type de fichier non autorisé : ${fichier.mimetype}.`);
    }

    const tailleMo = Math.round((fichier.size / (1024 * 1024)) * 100) / 100;
    const maxTailleMo = this.config.get<number>('dmeAttachments.maxTailleMo')!;
    if (tailleMo > maxTailleMo) {
      throw new BadRequestException(`Fichier trop volumineux (${tailleMo} Mo, maximum ${maxTailleMo} Mo).`);
    }

    await this.subscriptionsService.assertWithinLimit(etablissementId, 'maxStockageMo', tailleMo);

    const cheminStockage = await this.storageService.sauvegarder(etablissementId, patientId, fichier.buffer);

    const dossier = await this.getOrCreate(patientId);
    const entry: PieceJointeEntry = {
      id: randomUUID(),
      nomOriginal: fichier.originalname,
      type: fichier.mimetype,
      tailleMo,
      cheminStockage,
      dateUpload: new Date(),
      uploadePar: actingUserId,
    };
    dossier.piecesJointes.push(entry);
    await dossier.save();

    await this.etablissementsService.incrementUsage(etablissementId, 'stockageMo', tailleMo);

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'dossier.piece_jointe.create',
      ressource: 'dossier_medical',
      ressourceId: patientId,
      metadata: { pieceJointeId: entry.id, nomOriginal: entry.nomOriginal, tailleMo },
    });

    return entry;
  }

  /**
   * Émet un lien de téléchargement signé/expirant (prompt maître §17) plutôt que d'exposer
   * `cheminStockage`. Retourne une URL complète et directement utilisable (même convention que
   * `redirectUrl` Wave/Orange Money) — le client n'a pas besoin de connaître la route interne.
   */
  async genererLienTelechargementPieceJointe(
    patientId: string,
    etablissementId: string,
    pieceJointeId: string,
    actingUserId: string,
  ): Promise<{ url: string; expireLe: Date }> {
    const dossier = await this.getOrCreate(patientId);
    const pieceJointe = dossier.piecesJointes.find((entry) => entry.id === pieceJointeId);
    if (!pieceJointe) {
      throw new NotFoundException('Pièce jointe introuvable.');
    }

    const { token, expireLe } = this.linkService.genererToken({ patientId, etablissementId, pieceJointeId });
    const apiPublicUrl = this.config.get<string>('apiPublicUrl')!;
    const apiPrefix = this.config.get<string>('apiPrefix')!;

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'dossier.piece_jointe.lien_genere',
      ressource: 'dossier_medical',
      ressourceId: patientId,
      metadata: { pieceJointeId },
    });

    return { url: `${apiPublicUrl}/${apiPrefix}/dossier-medical/pieces-jointes/telechargement?token=${token}`, expireLe };
  }

  /**
   * Appelée uniquement par le contrôleur public de téléchargement, une fois le token déjà vérifié —
   * DOIT être exécutée depuis un contexte tenant ouvert pour `etablissementId` via
   * TenantContextService.runForEtablissement (le plugin Mongoose filtre sinon la lecture). Pas de
   * vérification RBAC ici : le token signé EST l'autorisation, voir DmeAttachmentsLinkService.
   */
  async lireContenuPieceJointe(patientId: string, pieceJointeId: string): Promise<{ buffer: Buffer; piece: PieceJointeEntry }> {
    const dossier = await this.model.findOne({ patientId });
    const piece = dossier?.piecesJointes.find((entry) => entry.id === pieceJointeId);
    if (!dossier || !piece) {
      throw new NotFoundException('Pièce jointe introuvable.');
    }

    const buffer = await this.storageService.lire(piece.cheminStockage);
    return { buffer, piece };
  }
}
