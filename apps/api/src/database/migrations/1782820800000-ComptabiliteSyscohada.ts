import { MigrationInterface, QueryRunner } from "typeorm";
import { disableTenantRls, enableTenantRls } from "../utils/enable-tenant-rls.util";

export class ComptabiliteSyscohada1782820800000 implements MigrationInterface {
    name = 'ComptabiliteSyscohada1782820800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── Tables comptabilité ────────────────────────────────────────────────
        await queryRunner.query(`CREATE TYPE "clinic"."plan_comptable_type_enum" AS ENUM('ACTIF', 'PASSIF', 'TRESORERIE', 'CHARGE', 'PRODUIT')`);
        await queryRunner.query(`CREATE TABLE "clinic"."plan_comptable" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "code" character varying(10) NOT NULL, "libelle" character varying(100) NOT NULL, "classe" smallint NOT NULL, "type" "clinic"."plan_comptable_type_enum" NOT NULL, "is_actif" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_plan_comptable_etab_code" UNIQUE ("etablissement_id", "code"), CONSTRAINT "PK_plan_comptable" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_plan_comptable_etab" ON "clinic"."plan_comptable" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'plan_comptable');

        await queryRunner.query(`CREATE TYPE "clinic"."ecritures_comptables_journal_code_enum" AS ENUM('VTE', 'CAI', 'BQE', 'OD')`);
        await queryRunner.query(`CREATE TABLE "clinic"."ecritures_comptables" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "date" date NOT NULL, "journal_code" "clinic"."ecritures_comptables_journal_code_enum" NOT NULL, "numero" character varying(30) NOT NULL, "libelle" character varying(255) NOT NULL, "compte_debit_code" character varying(10) NOT NULL, "montant_debit" numeric NOT NULL, "compte_credit_code" character varying(10) NOT NULL, "montant_credit" numeric NOT NULL, "piece_ref" character varying(100), "saisie_par_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ecritures_comptables" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ecritures_etab" ON "clinic"."ecritures_comptables" ("etablissement_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_ecritures_etab_date" ON "clinic"."ecritures_comptables" ("etablissement_id", "date") `);
        await queryRunner.query(`CREATE INDEX "IDX_ecritures_etab_journal" ON "clinic"."ecritures_comptables" ("etablissement_id", "journal_code") `);
        await enableTenantRls(queryRunner, 'clinic', 'ecritures_comptables');

        // ── Mise à jour de l'enum permission (user_permissions + role_permissions) ──
        await queryRunner.query(`DROP INDEX "platform"."IDX_cd68dee04a4612c22eb6820926"`);
        await queryRunner.query(`ALTER TYPE "platform"."user_permissions_permission_enum" RENAME TO "user_permissions_permission_enum_old"`);
        await queryRunner.query(`CREATE TYPE "platform"."user_permissions_permission_enum" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'urgence:triage', 'urgence:view', 'urgence:prise-en-charge', 'urgence:surveillance', 'urgence:alerte', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:view', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage', 'api-key:manage', 'fhir:read', 'message:send', 'message:read', 'bloc:planification', 'bloc:view', 'bloc:realisation', 'bloc:compte-rendu', 'compta:journal:read', 'compta:journal:write', 'compta:bilan:read')`);
        await queryRunner.query(`ALTER TABLE "platform"."user_permissions" ALTER COLUMN "permission" TYPE "platform"."user_permissions_permission_enum" USING "permission"::"text"::"platform"."user_permissions_permission_enum"`);
        await queryRunner.query(`DROP TYPE "platform"."user_permissions_permission_enum_old"`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_9c116ac03805ca80baf3e8d231"`);
        await queryRunner.query(`ALTER TYPE "platform"."role_permissions_permission_enum" RENAME TO "role_permissions_permission_enum_old"`);
        await queryRunner.query(`CREATE TYPE "platform"."role_permissions_permission_enum" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'urgence:triage', 'urgence:view', 'urgence:prise-en-charge', 'urgence:surveillance', 'urgence:alerte', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:view', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage', 'api-key:manage', 'fhir:read', 'message:send', 'message:read', 'bloc:planification', 'bloc:view', 'bloc:realisation', 'bloc:compte-rendu', 'compta:journal:read', 'compta:journal:write', 'compta:bilan:read')`);
        await queryRunner.query(`ALTER TABLE "platform"."role_permissions" ALTER COLUMN "permission" TYPE "platform"."role_permissions_permission_enum" USING "permission"::"text"::"platform"."role_permissions_permission_enum"`);
        await queryRunner.query(`DROP TYPE "platform"."role_permissions_permission_enum_old"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cd68dee04a4612c22eb6820926" ON "platform"."user_permissions" ("user_id", "permission") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9c116ac03805ca80baf3e8d231" ON "platform"."role_permissions" ("role", "permission") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await disableTenantRls(queryRunner, 'clinic', 'ecritures_comptables');
        await queryRunner.query(`DROP TABLE "clinic"."ecritures_comptables"`);
        await queryRunner.query(`DROP TYPE "clinic"."ecritures_comptables_journal_code_enum"`);
        await disableTenantRls(queryRunner, 'clinic', 'plan_comptable');
        await queryRunner.query(`DROP TABLE "clinic"."plan_comptable"`);
        await queryRunner.query(`DROP TYPE "clinic"."plan_comptable_type_enum"`);
        // Rollback permission enum
        await queryRunner.query(`DROP INDEX "platform"."IDX_9c116ac03805ca80baf3e8d231"`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_cd68dee04a4612c22eb6820926"`);
        await queryRunner.query(`CREATE TYPE "platform"."role_permissions_permission_enum_old" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'urgence:triage', 'urgence:view', 'urgence:prise-en-charge', 'urgence:surveillance', 'urgence:alerte', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:view', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage', 'api-key:manage', 'fhir:read', 'message:send', 'message:read', 'bloc:planification', 'bloc:view', 'bloc:realisation', 'bloc:compte-rendu')`);
        await queryRunner.query(`ALTER TABLE "platform"."role_permissions" ALTER COLUMN "permission" TYPE "platform"."role_permissions_permission_enum_old" USING "permission"::"text"::"platform"."role_permissions_permission_enum_old"`);
        await queryRunner.query(`DROP TYPE "platform"."role_permissions_permission_enum"`);
        await queryRunner.query(`ALTER TYPE "platform"."role_permissions_permission_enum_old" RENAME TO "role_permissions_permission_enum"`);
        await queryRunner.query(`CREATE TYPE "platform"."user_permissions_permission_enum_old" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'urgence:triage', 'urgence:view', 'urgence:prise-en-charge', 'urgence:surveillance', 'urgence:alerte', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:view', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage', 'api-key:manage', 'fhir:read', 'message:send', 'message:read', 'bloc:planification', 'bloc:view', 'bloc:realisation', 'bloc:compte-rendu')`);
        await queryRunner.query(`ALTER TABLE "platform"."user_permissions" ALTER COLUMN "permission" TYPE "platform"."user_permissions_permission_enum_old" USING "permission"::"text"::"platform"."user_permissions_permission_enum_old"`);
        await queryRunner.query(`DROP TYPE "platform"."user_permissions_permission_enum"`);
        await queryRunner.query(`ALTER TYPE "platform"."user_permissions_permission_enum_old" RENAME TO "user_permissions_permission_enum"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cd68dee04a4612c22eb6820926" ON "platform"."user_permissions" ("user_id", "permission") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9c116ac03805ca80baf3e8d231" ON "platform"."role_permissions" ("role", "permission") `);
    }
}
