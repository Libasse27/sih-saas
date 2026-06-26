import { Permission, Role } from '@sih-saas/shared';
import { RolePermissionEntity } from '../../modules/users/infrastructure/entities/role-permission.entity';
import { AppDataSource } from '../data-source';

// Référence : docs/phase-0/matrice-rbac.md §2 (matrice rôle -> permissions par défaut)
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: [
    Permission.PLAN_MANAGE,
    Permission.ABONNEMENT_PLATEFORME_MANAGE,
    Permission.ETABLISSEMENT_MANAGE,
    Permission.ETABLISSEMENT_SUSPEND,
    Permission.COUPON_MANAGE,
    Permission.SETTING_PLATEFORME_MANAGE,
    Permission.AUDIT_READ_GLOBAL,
  ],
  [Role.ADMIN_ETABLISSEMENT]: [
    Permission.UTILISATEUR_MANAGE,
    Permission.ETABLISSEMENT_SETTINGS,
    Permission.ABONNEMENT_ETABLISSEMENT_VIEW,
    Permission.ABONNEMENT_ETABLISSEMENT_RENEW,
    Permission.AUDIT_READ_LOCAL,
    Permission.API_KEY_MANAGE,
    Permission.RH_VIEW,
    Permission.COMPTA_JOURNAL_READ,
    Permission.COMPTA_JOURNAL_WRITE,
    Permission.COMPTA_BILAN_READ,
  ],
  [Role.DIRECTEUR]: [
    Permission.UTILISATEUR_MANAGE,
    Permission.ETABLISSEMENT_SETTINGS,
    Permission.ABONNEMENT_ETABLISSEMENT_VIEW,
    Permission.ABONNEMENT_ETABLISSEMENT_RENEW,
    Permission.AUDIT_READ_LOCAL,
    Permission.API_KEY_MANAGE,
    Permission.RH_VIEW,
    Permission.COMPTA_JOURNAL_READ,
    Permission.COMPTA_JOURNAL_WRITE,
    Permission.COMPTA_BILAN_READ,
  ],
  [Role.ADMIN_SYSTEME]: [Permission.UTILISATEUR_MANAGE, Permission.ETABLISSEMENT_SETTINGS],
  [Role.MEDECIN]: [
    Permission.PATIENT_READ,
    Permission.DOSSIER_READ,
    Permission.DOSSIER_WRITE,
    Permission.CONSULTATION_CREATE,
    Permission.PRESCRIPTION_CREATE,
    Permission.PRESCRIPTION_VALIDATE,
    Permission.LABO_REQUEST,
    Permission.IMAGERIE_REQUEST,
    Permission.RDV_CREATE,
    Permission.URGENCE_VIEW,
    Permission.URGENCE_PRISE_EN_CHARGE,
    Permission.URGENCE_SURVEILLANCE,
    Permission.URGENCE_ALERTE,
    // Nécessaire pour choisir un service/lit destination en clôturant un épisode d'urgence par un
    // transfert vers hospitalisation (UrgencesPatientController.cloturer) — pas pour gérer les lits.
    Permission.LIT_VIEW,
    Permission.MESSAGE_SEND,
    Permission.MESSAGE_READ,
  ],
  [Role.CHIRURGIEN]: [
    Permission.PATIENT_READ,
    Permission.DOSSIER_READ,
    Permission.DOSSIER_WRITE,
    Permission.CONSULTATION_CREATE,
    Permission.PRESCRIPTION_CREATE,
    Permission.PRESCRIPTION_VALIDATE,
    Permission.LABO_REQUEST,
    Permission.IMAGERIE_REQUEST,
    Permission.RDV_CREATE,
    Permission.URGENCE_VIEW,
    Permission.URGENCE_PRISE_EN_CHARGE,
    Permission.URGENCE_SURVEILLANCE,
    Permission.URGENCE_ALERTE,
    Permission.LIT_VIEW,
    Permission.MESSAGE_SEND,
    Permission.MESSAGE_READ,
    Permission.BLOC_PLANIFICATION,
    Permission.BLOC_VIEW,
    Permission.BLOC_REALISATION,
    Permission.BLOC_COMPTE_RENDU,
  ],
  [Role.INFIRMIER]: [
    Permission.DOSSIER_READ,
    Permission.DOSSIER_WRITE,
    Permission.ADMINISTRATION_CREATE,
    Permission.RDV_CREATE,
    Permission.URGENCE_TRIAGE,
    Permission.URGENCE_VIEW,
    Permission.URGENCE_SURVEILLANCE,
    Permission.URGENCE_ALERTE,
    Permission.MESSAGE_SEND,
    Permission.MESSAGE_READ,
    Permission.BLOC_VIEW,
    Permission.BLOC_REALISATION,
  ],
  [Role.ANESTHESISTE]: [
    Permission.PATIENT_READ,
    Permission.DOSSIER_READ,
    Permission.DOSSIER_WRITE,
    Permission.CONSULTATION_CREATE,
    Permission.PRESCRIPTION_CREATE,
    Permission.PRESCRIPTION_VALIDATE,
    Permission.URGENCE_VIEW,
    Permission.URGENCE_PRISE_EN_CHARGE,
    Permission.URGENCE_SURVEILLANCE,
    Permission.URGENCE_ALERTE,
    Permission.LIT_VIEW,
    Permission.MESSAGE_SEND,
    Permission.MESSAGE_READ,
    Permission.BLOC_PLANIFICATION,
    Permission.BLOC_VIEW,
    Permission.BLOC_REALISATION,
  ],
  [Role.SAGE_FEMME]: [
    Permission.DOSSIER_READ,
    Permission.DOSSIER_WRITE,
    Permission.ADMINISTRATION_CREATE,
    Permission.RDV_CREATE,
    Permission.CONSULTATION_CREATE,
    Permission.MESSAGE_SEND,
    Permission.MESSAGE_READ,
  ],
  [Role.PSYCHIATRE]: [
    Permission.PATIENT_READ,
    Permission.DOSSIER_READ,
    Permission.DOSSIER_WRITE,
    Permission.CONSULTATION_CREATE,
    Permission.PRESCRIPTION_CREATE,
    Permission.PRESCRIPTION_VALIDATE,
    Permission.LABO_REQUEST,
    Permission.IMAGERIE_REQUEST,
    Permission.RDV_CREATE,
    Permission.MESSAGE_SEND,
    Permission.MESSAGE_READ,
  ],
  [Role.KINESITHERAPEUTE]: [Permission.DOSSIER_READ, Permission.DOSSIER_WRITE, Permission.MESSAGE_SEND, Permission.MESSAGE_READ],
  [Role.DIETETICIEN]: [Permission.DOSSIER_READ, Permission.DOSSIER_WRITE, Permission.MESSAGE_SEND, Permission.MESSAGE_READ],
  [Role.RADIOLOGUE]: [
    Permission.IMAGERIE_REQUEST,
    Permission.IMAGERIE_REPORT_WRITE,
    Permission.IMAGERIE_REPORT_VALIDATE,
    Permission.DOSSIER_READ,
  ],
  [Role.MANIPULATEUR_RADIO]: [Permission.IMAGERIE_REPORT_WRITE],
  [Role.LABORANTIN]: [Permission.LABO_RESULT_WRITE, Permission.DOSSIER_READ],
  [Role.BIOLOGISTE]: [
    Permission.LABO_RESULT_WRITE,
    Permission.LABO_RESULT_VALIDATE,
    Permission.DOSSIER_READ,
  ],
  [Role.PHARMACIEN]: [
    Permission.DISPENSATION_CREATE,
    Permission.STOCK_MANAGE,
    Permission.STOCK_VIEW,
    Permission.DOSSIER_READ,
  ],
  [Role.AGENT_STERILISATION]: [Permission.STERILISATION_MANAGE],
  [Role.MAGASINIER]: [Permission.STOCK_VIEW, Permission.STOCK_MANAGE],
  [Role.TECHNICIEN_MAINTENANCE]: [Permission.MAINTENANCE_MANAGE],
  [Role.AGENT_ACCUEIL_ADMISSION]: [
    Permission.PATIENT_CREATE,
    Permission.PATIENT_READ,
    Permission.ADMISSION_CREATE,
    Permission.LIT_VIEW,
    Permission.LIT_ASSIGN,
    Permission.URGENCE_TRIAGE,
    Permission.URGENCE_VIEW,
  ],
  [Role.SECRETAIRE_MEDICALE]: [Permission.RDV_CREATE, Permission.RDV_MANAGE, Permission.PATIENT_READ],
  [Role.CAISSIER_FACTURATION]: [
    Permission.FACTURE_PATIENT_CREATE,
    Permission.FACTURE_PATIENT_VALIDATE,
    Permission.PAIEMENT_PATIENT_CREATE,
    // ASSURANCE_MANAGE existait dans l'enum + gardait AssurancesController depuis la Phase 8 mais
    // n'était seedée à AUCUN rôle (bug découvert Phase 17) — le caissier est l'acteur naturel,
    // même périmètre que le suivi des créances assurance (CreancesAssuranceController).
    Permission.ASSURANCE_MANAGE,
    Permission.COMPTA_JOURNAL_READ,
  ],
  [Role.GESTIONNAIRE_LITS]: [Permission.LIT_VIEW, Permission.LIT_ASSIGN, Permission.LIT_LIBERER],
  [Role.ASSISTANT_SOCIAL]: [Permission.SOCIAL_MANAGE, Permission.DOSSIER_READ],
  [Role.RH]: [Permission.RH_VIEW, Permission.RH_MANAGE],
  [Role.PATIENT]: [
    Permission.DOSSIER_READ,
    Permission.RDV_CREATE,
    Permission.PAIEMENT_PATIENT_CREATE,
    Permission.MESSAGE_SEND,
    Permission.MESSAGE_READ,
  ],
};

async function seedRbac() {
  const dataSource = await AppDataSource.initialize();
  const repository = dataSource.getRepository(RolePermissionEntity);

  for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS) as [Role, Permission[]][]) {
    for (const permission of permissions) {
      const exists = await repository.findOne({ where: { role, permission } });
      if (!exists) {
        await repository.save(repository.create({ role, permission }));
      }
    }
  }

  console.log('Seed RBAC terminé : role_permissions peuplée depuis docs/phase-0/matrice-rbac.md.');
  await dataSource.destroy();
}

seedRbac().catch((error) => {
  console.error('Échec du seed RBAC :', error);
  process.exit(1);
});
