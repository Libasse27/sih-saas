import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from '../../audit/application/audit.service';
import {
  Antecedents,
  CompteRenduEntry,
  DOSSIER_MEDICAL_MODEL,
  DossierMedicalDocument,
  ObservationEntry,
} from '../infrastructure/schemas/dossier-medical.schema';

@Injectable()
export class DossierMedicalService {
  constructor(
    @InjectModel(DOSSIER_MEDICAL_MODEL) private readonly model: Model<DossierMedicalDocument>,
    private readonly auditService: AuditService,
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
}
