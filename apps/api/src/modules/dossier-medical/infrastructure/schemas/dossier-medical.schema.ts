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

export interface PieceJointeEntry {
  url: string;
  urlSigneeExpirante?: string;
  type: string;
  dateUpload: Date;
  uploadePar: string;
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
          url: { type: String, required: true },
          urlSigneeExpirante: String,
          type: { type: String, required: true },
          dateUpload: { type: Date, required: true },
          uploadePar: { type: String, required: true },
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
