import { MigrationInterface, QueryRunner } from "typeorm";
import { disableTenantRls, enableTenantRls } from "../utils/enable-tenant-rls.util";

export class RhModule1782259232957 implements MigrationInterface {
    name = 'RhModule1782259232957'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "clinic"."presences_statut_enum" AS ENUM('PRESENT', 'ABSENT', 'RETARD', 'CONGE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."presences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "employe_id" uuid NOT NULL, "date" date NOT NULL, "heure_arrivee" TIME, "heure_depart" TIME, "statut" "clinic"."presences_statut_enum" NOT NULL, "commentaire" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_954405226c89821ea470763df3c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c149594a83d32761f6f9994424" ON "clinic"."presences" ("etablissement_id", "employe_id", "date") `);
        await queryRunner.query(`CREATE INDEX "IDX_bdd494b405b382c369b882ca4f" ON "clinic"."presences" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'presences');
        await queryRunner.query(`CREATE TYPE "clinic"."formations_statut_enum" AS ENUM('PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."formations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "employe_id" uuid NOT NULL, "intitule" character varying NOT NULL, "organisme" character varying, "date_debut" date NOT NULL, "date_fin" date, "statut" "clinic"."formations_statut_enum" NOT NULL DEFAULT 'PLANIFIEE', "certificat_obtenu" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e071aaba3322392364953ba5c95" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8fc951a5aafee221a3f922717c" ON "clinic"."formations" ("etablissement_id", "employe_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_cc4f3b5f906e9cfb77fe6aadee" ON "clinic"."formations" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'formations');
        await queryRunner.query(`CREATE TYPE "clinic"."employes_sexe_enum" AS ENUM('M', 'F')`);
        await queryRunner.query(`CREATE TYPE "clinic"."employes_statut_enum" AS ENUM('ACTIF', 'INACTIF', 'SUSPENDU', 'DEMISSIONNAIRE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."employes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "user_id" uuid, "matricule" character varying NOT NULL, "nom" character varying NOT NULL, "prenom" character varying NOT NULL, "poste" character varying NOT NULL, "service_id" uuid, "date_embauche" date NOT NULL, "date_naissance" date, "sexe" "clinic"."employes_sexe_enum", "telephone" character varying, "email" character varying, "adresse" character varying, "statut" "clinic"."employes_statut_enum" NOT NULL DEFAULT 'ACTIF', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_68b60872017654daffdce387dd4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2704444d87a7f0ce337f199bc0" ON "clinic"."employes" ("etablissement_id", "matricule") `);
        await queryRunner.query(`CREATE INDEX "IDX_78014c6e9d17777a3bce786512" ON "clinic"."employes" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'employes');
        await queryRunner.query(`CREATE TYPE "clinic"."contrats_travail_type_enum" AS ENUM('CDI', 'CDD', 'STAGE', 'VACATION', 'PRESTATION')`);
        await queryRunner.query(`CREATE TYPE "clinic"."contrats_travail_statut_enum" AS ENUM('ACTIF', 'TERMINE', 'SUSPENDU')`);
        await queryRunner.query(`CREATE TABLE "clinic"."contrats_travail" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "employe_id" uuid NOT NULL, "type" "clinic"."contrats_travail_type_enum" NOT NULL, "date_debut" date NOT NULL, "date_fin" date, "salaire_base" numeric NOT NULL, "statut" "clinic"."contrats_travail_statut_enum" NOT NULL DEFAULT 'ACTIF', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ad1585b62afced673a28c48a7dc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1d7cddea762e594d5ed9850a48" ON "clinic"."contrats_travail" ("etablissement_id", "employe_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_39652928a07d1f8503c15cc22b" ON "clinic"."contrats_travail" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'contrats_travail');
        await queryRunner.query(`CREATE TYPE "clinic"."conges_type_enum" AS ENUM('CONGE_PAYE', 'MALADIE', 'MATERNITE', 'PATERNITE', 'SANS_SOLDE', 'AUTRE')`);
        await queryRunner.query(`CREATE TYPE "clinic"."conges_statut_enum" AS ENUM('DEMANDE', 'APPROUVE', 'REJETE', 'ANNULE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."conges" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "employe_id" uuid NOT NULL, "type" "clinic"."conges_type_enum" NOT NULL, "date_debut" date NOT NULL, "date_fin" date NOT NULL, "nombre_jours" integer NOT NULL, "motif" character varying, "statut" "clinic"."conges_statut_enum" NOT NULL DEFAULT 'DEMANDE', "valide_par_user_id" uuid, "date_validation" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d93df054c0a96a66be2ae990537" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f9e923ad7e01e2e07bf9c05037" ON "clinic"."conges" ("etablissement_id", "employe_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_50c9a824c21fa0340569b71656" ON "clinic"."conges" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'conges');
        await queryRunner.query(`DROP INDEX "platform"."IDX_cd68dee04a4612c22eb6820926"`);
        await queryRunner.query(`ALTER TYPE "platform"."user_permissions_permission_enum" RENAME TO "user_permissions_permission_enum_old"`);
        await queryRunner.query(`CREATE TYPE "platform"."user_permissions_permission_enum" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'urgence:triage', 'urgence:view', 'urgence:prise-en-charge', 'urgence:surveillance', 'urgence:alerte', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:view', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage', 'api-key:manage', 'fhir:read', 'message:send', 'message:read')`);
        await queryRunner.query(`ALTER TABLE "platform"."user_permissions" ALTER COLUMN "permission" TYPE "platform"."user_permissions_permission_enum" USING "permission"::"text"::"platform"."user_permissions_permission_enum"`);
        await queryRunner.query(`DROP TYPE "platform"."user_permissions_permission_enum_old"`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_9c116ac03805ca80baf3e8d231"`);
        await queryRunner.query(`ALTER TYPE "platform"."role_permissions_permission_enum" RENAME TO "role_permissions_permission_enum_old"`);
        await queryRunner.query(`CREATE TYPE "platform"."role_permissions_permission_enum" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'urgence:triage', 'urgence:view', 'urgence:prise-en-charge', 'urgence:surveillance', 'urgence:alerte', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:view', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage', 'api-key:manage', 'fhir:read', 'message:send', 'message:read')`);
        await queryRunner.query(`ALTER TABLE "platform"."role_permissions" ALTER COLUMN "permission" TYPE "platform"."role_permissions_permission_enum" USING "permission"::"text"::"platform"."role_permissions_permission_enum"`);
        await queryRunner.query(`DROP TYPE "platform"."role_permissions_permission_enum_old"`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"utilisateurs":0,"lits":0,"stockageMo":0}'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cd68dee04a4612c22eb6820926" ON "platform"."user_permissions" ("user_id", "permission") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9c116ac03805ca80baf3e8d231" ON "platform"."role_permissions" ("role", "permission") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "platform"."IDX_9c116ac03805ca80baf3e8d231"`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_cd68dee04a4612c22eb6820926"`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"lits": 0, "stockageMo": 0, "utilisateurs": 0}'`);
        await queryRunner.query(`CREATE TYPE "platform"."role_permissions_permission_enum_old" AS ENUM('abonnement-etablissement:renew', 'abonnement-etablissement:view', 'abonnement-plateforme:manage', 'administration:create', 'admission:create', 'api-key:manage', 'assurance:manage', 'audit:read:global', 'audit:read:local', 'consultation:create', 'coupon:manage', 'dispensation:create', 'dossier:read', 'dossier:write', 'etablissement:manage', 'etablissement:settings', 'etablissement:suspend', 'facture-patient:create', 'facture-patient:validate', 'fhir:read', 'imagerie:report:validate', 'imagerie:report:write', 'imagerie:request', 'labo:request', 'labo:result:validate', 'labo:result:write', 'lit:assign', 'lit:liberer', 'lit:view', 'maintenance:manage', 'message:read', 'message:send', 'paiement-patient:create', 'patient:create', 'patient:read', 'plan:manage', 'prescription:create', 'prescription:validate', 'rdv:create', 'rdv:manage', 'rh:manage', 'setting-plateforme:manage', 'social:manage', 'sterilisation:manage', 'stock:manage', 'stock:view', 'urgence:alerte', 'urgence:prise-en-charge', 'urgence:surveillance', 'urgence:triage', 'urgence:view', 'utilisateur:manage')`);
        await queryRunner.query(`ALTER TABLE "platform"."role_permissions" ALTER COLUMN "permission" TYPE "platform"."role_permissions_permission_enum_old" USING "permission"::"text"::"platform"."role_permissions_permission_enum_old"`);
        await queryRunner.query(`DROP TYPE "platform"."role_permissions_permission_enum"`);
        await queryRunner.query(`ALTER TYPE "platform"."role_permissions_permission_enum_old" RENAME TO "role_permissions_permission_enum"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9c116ac03805ca80baf3e8d231" ON "platform"."role_permissions" ("role", "permission") `);
        await queryRunner.query(`CREATE TYPE "platform"."user_permissions_permission_enum_old" AS ENUM('abonnement-etablissement:renew', 'abonnement-etablissement:view', 'abonnement-plateforme:manage', 'administration:create', 'admission:create', 'api-key:manage', 'assurance:manage', 'audit:read:global', 'audit:read:local', 'consultation:create', 'coupon:manage', 'dispensation:create', 'dossier:read', 'dossier:write', 'etablissement:manage', 'etablissement:settings', 'etablissement:suspend', 'facture-patient:create', 'facture-patient:validate', 'fhir:read', 'imagerie:report:validate', 'imagerie:report:write', 'imagerie:request', 'labo:request', 'labo:result:validate', 'labo:result:write', 'lit:assign', 'lit:liberer', 'lit:view', 'maintenance:manage', 'message:read', 'message:send', 'paiement-patient:create', 'patient:create', 'patient:read', 'plan:manage', 'prescription:create', 'prescription:validate', 'rdv:create', 'rdv:manage', 'rh:manage', 'setting-plateforme:manage', 'social:manage', 'sterilisation:manage', 'stock:manage', 'stock:view', 'urgence:alerte', 'urgence:prise-en-charge', 'urgence:surveillance', 'urgence:triage', 'urgence:view', 'utilisateur:manage')`);
        await queryRunner.query(`ALTER TABLE "platform"."user_permissions" ALTER COLUMN "permission" TYPE "platform"."user_permissions_permission_enum_old" USING "permission"::"text"::"platform"."user_permissions_permission_enum_old"`);
        await queryRunner.query(`DROP TYPE "platform"."user_permissions_permission_enum"`);
        await queryRunner.query(`ALTER TYPE "platform"."user_permissions_permission_enum_old" RENAME TO "user_permissions_permission_enum"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cd68dee04a4612c22eb6820926" ON "platform"."user_permissions" ("user_id", "permission") `);
        await disableTenantRls(queryRunner, 'clinic', 'conges');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_50c9a824c21fa0340569b71656"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_f9e923ad7e01e2e07bf9c05037"`);
        await queryRunner.query(`DROP TABLE "clinic"."conges"`);
        await queryRunner.query(`DROP TYPE "clinic"."conges_statut_enum"`);
        await queryRunner.query(`DROP TYPE "clinic"."conges_type_enum"`);
        await disableTenantRls(queryRunner, 'clinic', 'contrats_travail');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_39652928a07d1f8503c15cc22b"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_1d7cddea762e594d5ed9850a48"`);
        await queryRunner.query(`DROP TABLE "clinic"."contrats_travail"`);
        await queryRunner.query(`DROP TYPE "clinic"."contrats_travail_statut_enum"`);
        await queryRunner.query(`DROP TYPE "clinic"."contrats_travail_type_enum"`);
        await disableTenantRls(queryRunner, 'clinic', 'employes');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_78014c6e9d17777a3bce786512"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_2704444d87a7f0ce337f199bc0"`);
        await queryRunner.query(`DROP TABLE "clinic"."employes"`);
        await queryRunner.query(`DROP TYPE "clinic"."employes_statut_enum"`);
        await queryRunner.query(`DROP TYPE "clinic"."employes_sexe_enum"`);
        await disableTenantRls(queryRunner, 'clinic', 'formations');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_cc4f3b5f906e9cfb77fe6aadee"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_8fc951a5aafee221a3f922717c"`);
        await queryRunner.query(`DROP TABLE "clinic"."formations"`);
        await queryRunner.query(`DROP TYPE "clinic"."formations_statut_enum"`);
        await disableTenantRls(queryRunner, 'clinic', 'presences');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_bdd494b405b382c369b882ca4f"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_c149594a83d32761f6f9994424"`);
        await queryRunner.query(`DROP TABLE "clinic"."presences"`);
        await queryRunner.query(`DROP TYPE "clinic"."presences_statut_enum"`);
    }

}
