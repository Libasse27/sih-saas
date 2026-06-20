// Référence : docs/phase-0/matrice-rbac.md §1 (catalogue de permissions)
// Le suffixe des commentaires 🩺 signale les permissions également soumises au CareContextGuard (Phase 5).
export enum Permission {
  // Plateforme
  PLAN_MANAGE = 'plan:manage',
  ABONNEMENT_PLATEFORME_MANAGE = 'abonnement-plateforme:manage',
  ETABLISSEMENT_MANAGE = 'etablissement:manage',
  ETABLISSEMENT_SUSPEND = 'etablissement:suspend',
  COUPON_MANAGE = 'coupon:manage',
  SETTING_PLATEFORME_MANAGE = 'setting-plateforme:manage',
  AUDIT_READ_GLOBAL = 'audit:read:global',

  // Administration établissement
  UTILISATEUR_MANAGE = 'utilisateur:manage',
  ETABLISSEMENT_SETTINGS = 'etablissement:settings',
  ABONNEMENT_ETABLISSEMENT_VIEW = 'abonnement-etablissement:view',
  ABONNEMENT_ETABLISSEMENT_RENEW = 'abonnement-etablissement:renew',
  AUDIT_READ_LOCAL = 'audit:read:local',

  // Patient & dossier
  PATIENT_CREATE = 'patient:create',
  PATIENT_READ = 'patient:read',
  DOSSIER_READ = 'dossier:read', // 🩺
  DOSSIER_WRITE = 'dossier:write', // 🩺

  // RDV / Consultation
  RDV_CREATE = 'rdv:create',
  RDV_MANAGE = 'rdv:manage',
  CONSULTATION_CREATE = 'consultation:create', // 🩺

  // Admission / Lits
  ADMISSION_CREATE = 'admission:create',
  LIT_VIEW = 'lit:view',
  LIT_ASSIGN = 'lit:assign',
  LIT_LIBERER = 'lit:liberer',

  // Prescription
  PRESCRIPTION_CREATE = 'prescription:create', // 🩺
  PRESCRIPTION_VALIDATE = 'prescription:validate', // 🩺

  // Pharmacie / Stock
  DISPENSATION_CREATE = 'dispensation:create',
  STOCK_VIEW = 'stock:view',
  STOCK_MANAGE = 'stock:manage',

  // Administration médicament
  ADMINISTRATION_CREATE = 'administration:create', // 🩺

  // Laboratoire
  LABO_REQUEST = 'labo:request', // 🩺
  LABO_RESULT_WRITE = 'labo:result:write',
  LABO_RESULT_VALIDATE = 'labo:result:validate',

  // Imagerie
  IMAGERIE_REQUEST = 'imagerie:request', // 🩺
  IMAGERIE_REPORT_WRITE = 'imagerie:report:write',
  IMAGERIE_REPORT_VALIDATE = 'imagerie:report:validate',

  // Facturation patient & assurance
  FACTURE_PATIENT_CREATE = 'facture-patient:create',
  FACTURE_PATIENT_VALIDATE = 'facture-patient:validate',
  PAIEMENT_PATIENT_CREATE = 'paiement-patient:create',
  ASSURANCE_MANAGE = 'assurance:manage',

  // Support
  RH_MANAGE = 'rh:manage',
  SOCIAL_MANAGE = 'social:manage',
  MAINTENANCE_MANAGE = 'maintenance:manage',
  STERILISATION_MANAGE = 'sterilisation:manage',

  // Interopérabilité / sécurité (Phase 11)
  API_KEY_MANAGE = 'api-key:manage',
  FHIR_READ = 'fhir:read', // accordée uniquement via une clé API, jamais un rôle humain
}

/** Effet d'un override ponctuel dans user_permissions (matrice-rbac.md §0 — table user_permissions). */
export enum PermissionEffect {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
}

/** Permissions dont l'usage est en plus filtré par le CareContextGuard (lien de soin requis). */
export const CARE_CONTEXT_PERMISSIONS: ReadonlySet<Permission> = new Set([
  Permission.DOSSIER_READ,
  Permission.DOSSIER_WRITE,
  Permission.CONSULTATION_CREATE,
  Permission.PRESCRIPTION_CREATE,
  Permission.PRESCRIPTION_VALIDATE,
  Permission.ADMINISTRATION_CREATE,
  Permission.LABO_REQUEST,
  Permission.IMAGERIE_REQUEST,
]);
