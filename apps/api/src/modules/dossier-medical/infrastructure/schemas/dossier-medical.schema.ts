import { Document, Schema } from 'mongoose';
import { tenantPlugin } from '../../../../shared/mongoose/tenant.plugin';

export interface AllergieEntry {
  substance: string;
  severite?: string;
  dateConstatee?: Date;
}

export interface Antecedents {
  medicaux: string[];
  chirurgicaux: string[];
  familiaux: string[];
  allergies: AllergieEntry[];
}

export interface ObservationEntry {
  date: Date;
  auteurId: string;
  contenu: string;
  type: string;
}

export interface CompteRenduEntry {
  date: Date;
  auteurId: string;
  type: string;
  contenu: string;
  fichierUrl?: string;
}

export interface CourrierEntry {
  date: Date;
  destinataire: string;
  contenu: string;
  fichierUrl?: string;
}

/**
 * Champs réécrits en Phase 33 (le placeholder `url`/`urlSigneeExpirante` n'avait jamais été câblé,
 * voir gap audit maxStockageMo) : `cheminStockage` est une référence interne opaque vers le fichier
 * chiffré sur disque (DmeAttachmentsStorageService), jamais une URL navigable directement — le SEUL
 * accès au contenu passe par un lien signé/expirant (prompt maître §17), jamais par ce champ exposé
 * tel quel au client.
 */
export interface PieceJointeEntry {
  id: string;
  nomOriginal: string;
  type: string;
  tailleMo: number;
  cheminStockage: string;
  dateUpload: Date;
  uploadePar: string;
}

/**
 * Réadaptation/diététique (Phase 33, gap audit §10.4) : matrice-rbac.md résout déjà KINESITHERAPEUTE/
 * DIETETICIEN sur les permissions génériques dossier:read/dossier:write 🩺 (pas de permission dédiée
 * comme SOCIAL_MANAGE) — ces séances/consultations sont donc des entrées structurées du DME, pas un
 * module à part avec sa propre permission/table Postgres.
 */
export interface SeanceReadaptationEntry {
  id: string;
  date: Date;
  kinesitherapeuteId: string;
  typeSeance: string;
  dureeMinutes: number;
  observations: string;
}

export interface ConsultationDietetiqueEntry {
  id: string;
  date: Date;
  dieteticienId: string;
  poidsKg: number;
  tailleCm: number;
  imc: number;
  recommandations: string;
  regimeAlimentaire?: string;
}

export interface HistoriqueAccesEntry {
  userId: string;
  date: Date;
  action: string;
}

export interface DossierMedicalDocument extends Document {
  patientId: string;
  etablissementId: string;
  antecedents: Antecedents;
  observations: ObservationEntry[];
  comptesRendus: CompteRenduEntry[];
  courriers: CourrierEntry[];
  piecesJointes: PieceJointeEntry[];
  seancesReadaptation: SeanceReadaptationEntry[];
  consultationsDietetiques: ConsultationDietetiqueEntry[];
  historiqueAccesRapide: HistoriqueAccesEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export const DOSSIER_MEDICAL_MODEL = 'DossierMedical';
export const DOSSIER_MEDICAL_COLLECTION = 'dossiers_medicaux';

/** Référence : docs/phase-0/modele-de-donnees.md §2.3. Premier usage réel du plugin tenant (Phase 2). */
export const DossierMedicalSchema = new Schema<DossierMedicalDocument>(
  {
    patientId: { type: String, required: true },
    antecedents: {
      medicaux: { type: [String], default: [] },
      chirurgicaux: { type: [String], default: [] },
      familiaux: { type: [String], default: [] },
      allergies: {
        type: [
          {
            substance: { type: String, required: true },
            severite: String,
            dateConstatee: Date,
          },
        ],
        default: [],
      },
    },
    observations: {
      type: [
        {
          date: { type: Date, required: true },
          auteurId: { type: String, required: true },
          contenu: { type: String, required: true },
          type: { type: String, required: true },
        },
      ],
      default: [],
    },
    comptesRendus: {
      type: [
        {
          date: { type: Date, required: true },
          auteurId: { type: String, required: true },
          type: { type: String, required: true },
          contenu: { type: String, required: true },
          fichierUrl: String,
        },
      ],
      default: [],
    },
    courriers: {
      type: [
        {
          date: { type: Date, required: true },
          destinataire: { type: String, required: true },
          contenu: { type: String, required: true },
          fichierUrl: String,
        },
      ],
      default: [],
    },
    piecesJointes: {
      type: [
        {
          id: { type: String, required: true },
          nomOriginal: { type: String, required: true },
          type: { type: String, required: true },
          tailleMo: { type: Number, required: true },
          cheminStockage: { type: String, required: true },
          dateUpload: { type: Date, required: true },
          uploadePar: { type: String, required: true },
        },
      ],
      default: [],
    },
    seancesReadaptation: {
      type: [
        {
          id: { type: String, required: true },
          date: { type: Date, required: true },
          kinesitherapeuteId: { type: String, required: true },
          typeSeance: { type: String, required: true },
          dureeMinutes: { type: Number, required: true },
          observations: { type: String, required: true },
        },
      ],
      default: [],
    },
    consultationsDietetiques: {
      type: [
        {
          id: { type: String, required: true },
          date: { type: Date, required: true },
          dieteticienId: { type: String, required: true },
          poidsKg: { type: Number, required: true },
          tailleCm: { type: Number, required: true },
          imc: { type: Number, required: true },
          recommandations: { type: String, required: true },
          regimeAlimentaire: String,
        },
      ],
      default: [],
    },
    historiqueAccesRapide: {
      type: [
        {
          userId: { type: String, required: true },
          date: { type: Date, required: true },
          action: { type: String, required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true, collection: DOSSIER_MEDICAL_COLLECTION },
);

DossierMedicalSchema.plugin(tenantPlugin);
DossierMedicalSchema.index({ etablissementId: 1, patientId: 1 }, { unique: true });
