import { MigrationInterface, QueryRunner } from "typeorm";
import { disableTenantRls, enableTenantRls } from "../utils/enable-tenant-rls.util";

export class BlocOperatoire1782471530091 implements MigrationInterface {
    name = 'BlocOperatoire1782471530091'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "clinic"."salles_operation_statut_enum" AS ENUM('LIBRE', 'OCCUPEE', 'MAINTENANCE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."salles_operation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "nom" character varying NOT NULL, "equipement" text, "statut" "clinic"."salles_operation_statut_enum" NOT NULL DEFAULT 'LIBRE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_39139f2bd14cc4948ecbad349c0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_681e7b40359abf2d9a833aa575" ON "clinic"."salles_operation" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'salles_operation');
        await queryRunner.query(`CREATE TYPE "clinic"."interventions_statut_enum" AS ENUM('PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."interventions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "patient_id" uuid NOT NULL, "admission_id" uuid, "salle_operation_id" uuid NOT NULL, "chirurgien_principal_id" uuid NOT NULL, "type_intervention" character varying NOT NULL, "statut" "clinic"."interventions_statut_enum" NOT NULL DEFAULT 'PLANIFIEE', "date_heure_prevue" TIMESTAMP WITH TIME ZONE NOT NULL, "duree_estimee_minutes" integer, "date_heure_debut_reelle" TIMESTAMP WITH TIME ZONE, "date_heure_fin_reelle" TIMESTAMP WITH TIME ZONE, "checklist_oms" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_39babe074cbaa90750582bfc38d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d27baaf2b06536fe03c5ce6464" ON "clinic"."interventions" ("etablissement_id", "salle_operation_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_04af7d4a6a3363067db774e1ef" ON "clinic"."interventions" ("etablissement_id", "patient_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_0bf21617bbf006b82ee1ce5150" ON "clinic"."interventions" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'interventions');
        await queryRunner.query(`CREATE TYPE "clinic"."equipes_operatoire_role_enum" AS ENUM('CHIRURGIEN_PRINCIPAL', 'CHIRURGIEN_AIDE', 'ANESTHESISTE', 'INFIRMIER_INSTRUMENTISTE', 'INFIRMIER_CIRCULANTE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."equipes_operatoire" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "intervention_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role" "clinic"."equipes_operatoire_role_enum" NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ac86d0ed451a7787a47a8d91bda" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ef2a5d7cfb58ff498be55be5bf" ON "clinic"."equipes_operatoire" ("etablissement_id", "intervention_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_5b8daec973b08834af00b3870d" ON "clinic"."equipes_operatoire" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'equipes_operatoire');
        await queryRunner.query(`CREATE TABLE "clinic"."consommables_intervention" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "intervention_id" uuid NOT NULL, "article_stock_id" uuid NOT NULL, "quantite" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c26b4087591ba998ed7ac6fff5e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e148b6c5c171024e4c3d2ebe7d" ON "clinic"."consommables_intervention" ("etablissement_id", "intervention_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_ed7394a2bdb8a2bba81c25a7f2" ON "clinic"."consommables_intervention" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'consommables_intervention');
        await queryRunner.query(`CREATE TABLE "clinic"."comptes_rendus_operatoires" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "intervention_id" uuid NOT NULL, "redacteur_id" uuid NOT NULL, "diagnostic_pre_operatoire" text NOT NULL, "diagnostic_post_operatoire" text NOT NULL, "technique_utilisee" text NOT NULL, "incidents" text, "contenu" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_17ad09f00b0c2321641df434998" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2a1c83cbd4024d70ca12e78070" ON "clinic"."comptes_rendus_operatoires" ("intervention_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_cb8195af6eeb1aa75d544bfea2" ON "clinic"."comptes_rendus_operatoires" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'comptes_rendus_operatoires');
        await queryRunner.query(`CREATE TYPE "clinic"."anesthesies_type_enum" AS ENUM('GENERALE', 'LOCOREGIONALE', 'LOCALE', 'SEDATION')`);
        await queryRunner.query(`CREATE TABLE "clinic"."anesthesies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "intervention_id" uuid NOT NULL, "anesthesiste_id" uuid NOT NULL, "type" "clinic"."anesthesies_type_enum" NOT NULL, "score_asa" integer, "produits" jsonb NOT NULL, "surveillance" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_215df366f5bcfa071eb89617c56" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d8be45889e022384d1a317556b" ON "clinic"."anesthesies" ("intervention_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_35912427fca11ae3245d8a79df" ON "clinic"."anesthesies" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'anesthesies');
        await queryRunner.query(`DROP INDEX "platform"."IDX_cd68dee04a4612c22eb6820926"`);
        await queryRunner.query(`ALTER TYPE "platform"."user_permissions_permission_enum" RENAME TO "user_permissions_permission_enum_old"`);
        await queryRunner.query(`CREATE TYPE "platform"."user_permissions_permission_enum" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'urgence:triage', 'urgence:view', 'urgence:prise-en-charge', 'urgence:surveillance', 'urgence:alerte', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:view', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage', 'api-key:manage', 'fhir:read', 'message:send', 'message:read', 'bloc:planification', 'bloc:view', 'bloc:realisation', 'bloc:compte-rendu')`);
        await queryRunner.query(`ALTER TABLE "platform"."user_permissions" ALTER COLUMN "permission" TYPE "platform"."user_permissions_permission_enum" USING "permission"::"text"::"platform"."user_permissions_permission_enum"`);
        await queryRunner.query(`DROP TYPE "platform"."user_permissions_permission_enum_old"`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_9c116ac03805ca80baf3e8d231"`);
        await queryRunner.query(`ALTER TYPE "platform"."role_permissions_permission_enum" RENAME TO "role_permissions_permission_enum_old"`);
        await queryRunner.query(`CREATE TYPE "platform"."role_permissions_permission_enum" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'urgence:triage', 'urgence:view', 'urgence:prise-en-charge', 'urgence:surveillance', 'urgence:alerte', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:view', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage', 'api-key:manage', 'fhir:read', 'message:send', 'message:read', 'bloc:planification', 'bloc:view', 'bloc:realisation', 'bloc:compte-rendu')`);
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
        await queryRunner.query(`CREATE TYPE "platform"."role_permissions_permission_enum_old" AS ENUM('abonnement-etablissement:renew', 'abonnement-etablissement:view', 'abonnement-plateforme:manage', 'administration:create', 'admission:create', 'api-key:manage', 'assurance:manage', 'audit:read:global', 'audit:read:local', 'consultation:create', 'coupon:manage', 'dispensation:create', 'dossier:read', 'dossier:write', 'etablissement:manage', 'etablissement:settings', 'etablissement:suspend', 'facture-patient:create', 'facture-patient:validate', 'fhir:read', 'imagerie:report:validate', 'imagerie:report:write', 'imagerie:request', 'labo:request', 'labo:result:validate', 'labo:result:write', 'lit:assign', 'lit:liberer', 'lit:view', 'maintenance:manage', 'message:read', 'message:send', 'paiement-patient:create', 'patient:create', 'patient:read', 'plan:manage', 'prescription:create', 'prescription:validate', 'rdv:create', 'rdv:manage', 'rh:manage', 'rh:view', 'setting-plateforme:manage', 'social:manage', 'sterilisation:manage', 'stock:manage', 'stock:view', 'urgence:alerte', 'urgence:prise-en-charge', 'urgence:surveillance', 'urgence:triage', 'urgence:view', 'utilisateur:manage')`);
        await queryRunner.query(`ALTER TABLE "platform"."role_permissions" ALTER COLUMN "permission" TYPE "platform"."role_permissions_permission_enum_old" USING "permission"::"text"::"platform"."role_permissions_permission_enum_old"`);
        await queryRunner.query(`DROP TYPE "platform"."role_permissions_permission_enum"`);
        await queryRunner.query(`ALTER TYPE "platform"."role_permissions_permission_enum_old" RENAME TO "role_permissions_permission_enum"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9c116ac03805ca80baf3e8d231" ON "platform"."role_permissions" ("role", "permission") `);
        await queryRunner.query(`CREATE TYPE "platform"."user_permissions_permission_enum_old" AS ENUM('abonnement-etablissement:renew', 'abonnement-etablissement:view', 'abonnement-plateforme:manage', 'administration:create', 'admission:create', 'api-key:manage', 'assurance:manage', 'audit:read:global', 'audit:read:local', 'consultation:create', 'coupon:manage', 'dispensation:create', 'dossier:read', 'dossier:write', 'etablissement:manage', 'etablissement:settings', 'etablissement:suspend', 'facture-patient:create', 'facture-patient:validate', 'fhir:read', 'imagerie:report:validate', 'imagerie:report:write', 'imagerie:request', 'labo:request', 'labo:result:validate', 'labo:result:write', 'lit:assign', 'lit:liberer', 'lit:view', 'maintenance:manage', 'message:read', 'message:send', 'paiement-patient:create', 'patient:create', 'patient:read', 'plan:manage', 'prescription:create', 'prescription:validate', 'rdv:create', 'rdv:manage', 'rh:manage', 'rh:view', 'setting-plateforme:manage', 'social:manage', 'sterilisation:manage', 'stock:manage', 'stock:view', 'urgence:alerte', 'urgence:prise-en-charge', 'urgence:surveillance', 'urgence:triage', 'urgence:view', 'utilisateur:manage')`);
        await queryRunner.query(`ALTER TABLE "platform"."user_permissions" ALTER COLUMN "permission" TYPE "platform"."user_permissions_permission_enum_old" USING "permission"::"text"::"platform"."user_permissions_permission_enum_old"`);
        await queryRunner.query(`DROP TYPE "platform"."user_permissions_permission_enum"`);
        await queryRunner.query(`ALTER TYPE "platform"."user_permissions_permission_enum_old" RENAME TO "user_permissions_permission_enum"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cd68dee04a4612c22eb6820926" ON "platform"."user_permissions" ("user_id", "permission") `);
        await disableTenantRls(queryRunner, 'clinic', 'anesthesies');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_35912427fca11ae3245d8a79df"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_d8be45889e022384d1a317556b"`);
        await queryRunner.query(`DROP TABLE "clinic"."anesthesies"`);
        await queryRunner.query(`DROP TYPE "clinic"."anesthesies_type_enum"`);
        await disableTenantRls(queryRunner, 'clinic', 'comptes_rendus_operatoires');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_cb8195af6eeb1aa75d544bfea2"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_2a1c83cbd4024d70ca12e78070"`);
        await queryRunner.query(`DROP TABLE "clinic"."comptes_rendus_operatoires"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_ed7394a2bdb8a2bba81c25a7f2"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_e148b6c5c171024e4c3d2ebe7d"`);
        await disableTenantRls(queryRunner, 'clinic', 'consommables_intervention');
        await queryRunner.query(`DROP TABLE "clinic"."consommables_intervention"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_5b8daec973b08834af00b3870d"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_ef2a5d7cfb58ff498be55be5bf"`);
        await disableTenantRls(queryRunner, 'clinic', 'equipes_operatoire');
        await queryRunner.query(`DROP TABLE "clinic"."equipes_operatoire"`);
        await queryRunner.query(`DROP TYPE "clinic"."equipes_operatoire_role_enum"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_0bf21617bbf006b82ee1ce5150"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_04af7d4a6a3363067db774e1ef"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_d27baaf2b06536fe03c5ce6464"`);
        await disableTenantRls(queryRunner, 'clinic', 'interventions');
        await queryRunner.query(`DROP TABLE "clinic"."interventions"`);
        await queryRunner.query(`DROP TYPE "clinic"."interventions_statut_enum"`);
        await disableTenantRls(queryRunner, 'clinic', 'salles_operation');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_681e7b40359abf2d9a833aa575"`);
        await queryRunner.query(`DROP TABLE "clinic"."salles_operation"`);
        await queryRunner.query(`DROP TYPE "clinic"."salles_operation_statut_enum"`);
    }

}
