import { MigrationInterface, QueryRunner } from "typeorm";
import { disableTenantRls, enableTenantRls } from "../utils/enable-tenant-rls.util";

export class Urgences1782234919041 implements MigrationInterface {
    name = 'Urgences1782234919041'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "clinic"."IDX_sites_etablissement_code"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_sites_etablissement"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_services_etablissement_site"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_lits_etablissement_site"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_chambres_etablissement_site"`);
        await queryRunner.query(`CREATE TYPE "clinic"."urgences_niveau_triage_enum" AS ENUM('VITAL', 'TRES_URGENT', 'URGENT', 'PEU_URGENT', 'NON_URGENT')`);
        await queryRunner.query(`CREATE TYPE "clinic"."urgences_statut_enum" AS ENUM('EN_ATTENTE', 'EN_COURS', 'TRANSFEREE', 'SORTIE', 'DECES')`);
        await queryRunner.query(`CREATE TABLE "clinic"."urgences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "patient_id" uuid NOT NULL, "service_id" uuid NOT NULL, "motif" text NOT NULL, "niveau_triage" "clinic"."urgences_niveau_triage_enum" NOT NULL, "statut" "clinic"."urgences_statut_enum" NOT NULL DEFAULT 'EN_ATTENTE', "medecin_prise_en_charge_id" uuid, "admission_id" uuid, "date_arrivee" TIMESTAMP WITH TIME ZONE NOT NULL, "date_sortie" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_b676da4ff1d11728db09075badb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_675465c7bda9e2784c64658aeb" ON "clinic"."urgences" ("etablissement_id", "statut") `);
        await queryRunner.query(`CREATE INDEX "IDX_d4f2dfd3d72d63f60faa6d0ffe" ON "clinic"."urgences" ("etablissement_id", "patient_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_64a695b15cd05f86a4d9a913e7" ON "clinic"."urgences" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'urgences');
        await queryRunner.query(`CREATE TYPE "clinic"."triages_niveau_enum" AS ENUM('VITAL', 'TRES_URGENT', 'URGENT', 'PEU_URGENT', 'NON_URGENT')`);
        await queryRunner.query(`CREATE TABLE "clinic"."triages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "urgence_id" uuid NOT NULL, "niveau" "clinic"."triages_niveau_enum" NOT NULL, "tension_arterielle" character varying, "pouls" integer, "temperature" numeric(4,1), "saturation_o2" integer, "effectue_par_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9d9bf41142b9f10d656877220bf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e2e2f08efaed7275d6fcca0b12" ON "clinic"."triages" ("etablissement_id", "urgence_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_34f6e45d50f8fce51df7aaef9d" ON "clinic"."triages" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'triages');
        await queryRunner.query(`CREATE TABLE "clinic"."surveillances_urgence" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "urgence_id" uuid NOT NULL, "tension_arterielle" character varying, "pouls" integer, "temperature" numeric(4,1), "saturation_o2" integer, "frequence_respiratoire" integer, "glasgow" integer, "observation" text, "releve_par_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1124318d33615f80ce7d029287e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_405a475be4a44c2892e166c541" ON "clinic"."surveillances_urgence" ("etablissement_id", "urgence_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_3b3046ba4f8b9e28b28b7a580f" ON "clinic"."surveillances_urgence" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'surveillances_urgence');
        await queryRunner.query(`CREATE TYPE "clinic"."alertes_medicales_statut_enum" AS ENUM('EN_COURS', 'ACQUITTEE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."alertes_medicales" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "urgence_id" uuid NOT NULL, "type" character varying NOT NULL, "message" text NOT NULL, "statut" "clinic"."alertes_medicales_statut_enum" NOT NULL DEFAULT 'EN_COURS', "declenchee_par_id" uuid NOT NULL, "acquittee_par_id" uuid, "date_acquittement" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_32efd3ed3fc77b7db0f5850f0da" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1fb70b96e4bb2312c8fba135c3" ON "clinic"."alertes_medicales" ("etablissement_id", "urgence_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_07729c276b2f39c15f406c18d4" ON "clinic"."alertes_medicales" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'alertes_medicales');
        await queryRunner.query(`DROP INDEX "platform"."IDX_cd68dee04a4612c22eb6820926"`);
        await queryRunner.query(`ALTER TYPE "platform"."user_permissions_permission_enum" RENAME TO "user_permissions_permission_enum_old"`);
        await queryRunner.query(`CREATE TYPE "platform"."user_permissions_permission_enum" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'urgence:triage', 'urgence:view', 'urgence:prise-en-charge', 'urgence:surveillance', 'urgence:alerte', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage', 'api-key:manage', 'fhir:read', 'message:send', 'message:read')`);
        await queryRunner.query(`ALTER TABLE "platform"."user_permissions" ALTER COLUMN "permission" TYPE "platform"."user_permissions_permission_enum" USING "permission"::"text"::"platform"."user_permissions_permission_enum"`);
        await queryRunner.query(`DROP TYPE "platform"."user_permissions_permission_enum_old"`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_9c116ac03805ca80baf3e8d231"`);
        await queryRunner.query(`ALTER TYPE "platform"."role_permissions_permission_enum" RENAME TO "role_permissions_permission_enum_old"`);
        await queryRunner.query(`CREATE TYPE "platform"."role_permissions_permission_enum" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'urgence:triage', 'urgence:view', 'urgence:prise-en-charge', 'urgence:surveillance', 'urgence:alerte', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage', 'api-key:manage', 'fhir:read', 'message:send', 'message:read')`);
        await queryRunner.query(`ALTER TABLE "platform"."role_permissions" ALTER COLUMN "permission" TYPE "platform"."role_permissions_permission_enum" USING "permission"::"text"::"platform"."role_permissions_permission_enum"`);
        await queryRunner.query(`DROP TYPE "platform"."role_permissions_permission_enum_old"`);
        await queryRunner.query(`ALTER TYPE "platform"."plans_modules_enum" RENAME TO "plans_modules_enum_old"`);
        await queryRunner.query(`CREATE TYPE "platform"."plans_modules_enum" AS ENUM('DME', 'RDV', 'ADMISSIONS', 'URGENCES', 'PHARMACIE', 'LABORATOIRE', 'IMAGERIE', 'FACTURATION', 'TELEMEDECINE', 'API')`);
        await queryRunner.query(`ALTER TABLE "platform"."plans" ALTER COLUMN "modules" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "platform"."plans" ALTER COLUMN "modules" TYPE "platform"."plans_modules_enum"[] USING "modules"::"text"::"platform"."plans_modules_enum"[]`);
        await queryRunner.query(`ALTER TABLE "platform"."plans" ALTER COLUMN "modules" SET DEFAULT '{}'`);
        await queryRunner.query(`DROP TYPE "platform"."plans_modules_enum_old"`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"utilisateurs":0,"lits":0,"stockageMo":0}'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cd68dee04a4612c22eb6820926" ON "platform"."user_permissions" ("user_id", "permission") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9c116ac03805ca80baf3e8d231" ON "platform"."role_permissions" ("role", "permission") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_87ce4cb0e4621cd8d4c0cbe3b4" ON "clinic"."sites" ("etablissement_id", "code") `);
        await queryRunner.query(`CREATE INDEX "IDX_666351466cb5fb7286a0689750" ON "clinic"."sites" ("etablissement_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_4ae6bb6f2ec6f1c8084d1825ed" ON "clinic"."services" ("etablissement_id", "site_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_09e24b10435c00aee6b0a2cf99" ON "clinic"."lits" ("etablissement_id", "site_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_e506638f8f1d50f0bd572713db" ON "clinic"."chambres" ("etablissement_id", "site_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "clinic"."IDX_e506638f8f1d50f0bd572713db"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_09e24b10435c00aee6b0a2cf99"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_4ae6bb6f2ec6f1c8084d1825ed"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_666351466cb5fb7286a0689750"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_87ce4cb0e4621cd8d4c0cbe3b4"`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_9c116ac03805ca80baf3e8d231"`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_cd68dee04a4612c22eb6820926"`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"lits": 0, "stockageMo": 0, "utilisateurs": 0}'`);
        await queryRunner.query(`CREATE TYPE "platform"."plans_modules_enum_old" AS ENUM('DME', 'RDV', 'ADMISSIONS', 'PHARMACIE', 'LABORATOIRE', 'IMAGERIE', 'FACTURATION', 'TELEMEDECINE', 'API')`);
        await queryRunner.query(`ALTER TABLE "platform"."plans" ALTER COLUMN "modules" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "platform"."plans" ALTER COLUMN "modules" TYPE "platform"."plans_modules_enum_old"[] USING "modules"::"text"::"platform"."plans_modules_enum_old"[]`);
        await queryRunner.query(`ALTER TABLE "platform"."plans" ALTER COLUMN "modules" SET DEFAULT '{}'`);
        await queryRunner.query(`DROP TYPE "platform"."plans_modules_enum"`);
        await queryRunner.query(`ALTER TYPE "platform"."plans_modules_enum_old" RENAME TO "plans_modules_enum"`);
        await queryRunner.query(`CREATE TYPE "platform"."role_permissions_permission_enum_old" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage', 'api-key:manage', 'fhir:read', 'message:send', 'message:read')`);
        await queryRunner.query(`ALTER TABLE "platform"."role_permissions" ALTER COLUMN "permission" TYPE "platform"."role_permissions_permission_enum_old" USING "permission"::"text"::"platform"."role_permissions_permission_enum_old"`);
        await queryRunner.query(`DROP TYPE "platform"."role_permissions_permission_enum"`);
        await queryRunner.query(`ALTER TYPE "platform"."role_permissions_permission_enum_old" RENAME TO "role_permissions_permission_enum"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9c116ac03805ca80baf3e8d231" ON "platform"."role_permissions" ("role", "permission") `);
        await queryRunner.query(`CREATE TYPE "platform"."user_permissions_permission_enum_old" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage', 'api-key:manage', 'fhir:read', 'message:send', 'message:read')`);
        await queryRunner.query(`ALTER TABLE "platform"."user_permissions" ALTER COLUMN "permission" TYPE "platform"."user_permissions_permission_enum_old" USING "permission"::"text"::"platform"."user_permissions_permission_enum_old"`);
        await queryRunner.query(`DROP TYPE "platform"."user_permissions_permission_enum"`);
        await queryRunner.query(`ALTER TYPE "platform"."user_permissions_permission_enum_old" RENAME TO "user_permissions_permission_enum"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cd68dee04a4612c22eb6820926" ON "platform"."user_permissions" ("user_id", "permission") `);
        await disableTenantRls(queryRunner, 'clinic', 'alertes_medicales');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_07729c276b2f39c15f406c18d4"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_1fb70b96e4bb2312c8fba135c3"`);
        await queryRunner.query(`DROP TABLE "clinic"."alertes_medicales"`);
        await queryRunner.query(`DROP TYPE "clinic"."alertes_medicales_statut_enum"`);
        await disableTenantRls(queryRunner, 'clinic', 'surveillances_urgence');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_3b3046ba4f8b9e28b28b7a580f"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_405a475be4a44c2892e166c541"`);
        await queryRunner.query(`DROP TABLE "clinic"."surveillances_urgence"`);
        await disableTenantRls(queryRunner, 'clinic', 'triages');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_34f6e45d50f8fce51df7aaef9d"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_e2e2f08efaed7275d6fcca0b12"`);
        await queryRunner.query(`DROP TABLE "clinic"."triages"`);
        await queryRunner.query(`DROP TYPE "clinic"."triages_niveau_enum"`);
        await disableTenantRls(queryRunner, 'clinic', 'urgences');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_64a695b15cd05f86a4d9a913e7"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_d4f2dfd3d72d63f60faa6d0ffe"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_675465c7bda9e2784c64658aeb"`);
        await queryRunner.query(`DROP TABLE "clinic"."urgences"`);
        await queryRunner.query(`DROP TYPE "clinic"."urgences_statut_enum"`);
        await queryRunner.query(`DROP TYPE "clinic"."urgences_niveau_triage_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_chambres_etablissement_site" ON "clinic"."chambres" ("etablissement_id", "site_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_lits_etablissement_site" ON "clinic"."lits" ("etablissement_id", "site_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_services_etablissement_site" ON "clinic"."services" ("etablissement_id", "site_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_sites_etablissement" ON "clinic"."sites" ("etablissement_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_sites_etablissement_code" ON "clinic"."sites" ("etablissement_id", "code") `);
    }

}
