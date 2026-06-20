import { MigrationInterface, QueryRunner } from "typeorm";
import { disableTenantRls, enableTenantRls } from "../utils/enable-tenant-rls.util";

export class ApiKeysAndModulesSupport1781920679100 implements MigrationInterface {
    name = 'ApiKeysAndModulesSupport1781920679100'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "clinic"."cycles_sterilisation_statut_enum" AS ENUM('EN_COURS', 'TERMINE', 'REJETE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."cycles_sterilisation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "materiel" character varying NOT NULL, "numero_lot" character varying NOT NULL, "statut" "clinic"."cycles_sterilisation_statut_enum" NOT NULL DEFAULT 'EN_COURS', "agent_id" uuid NOT NULL, "date_debut" TIMESTAMP WITH TIME ZONE NOT NULL, "date_fin" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_5f0a9b5d002c30de815fa2eaca5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e52835ba3da18eb9b665bf61b7" ON "clinic"."cycles_sterilisation" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'cycles_sterilisation');
        await queryRunner.query(`CREATE TABLE "clinic"."notes_sociales" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "patient_id" uuid NOT NULL, "auteur_id" uuid NOT NULL, "contenu" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_81cc757deb6bf5d8ca46195997c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_92af4c8a97dd9986daf8173aba" ON "clinic"."notes_sociales" ("patient_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_e3b63bba42aa1ef1870e6ca3a6" ON "clinic"."notes_sociales" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'notes_sociales');
        await queryRunner.query(`CREATE TYPE "clinic"."demandes_maintenance_statut_enum" AS ENUM('SIGNALEE', 'EN_COURS', 'RESOLUE', 'ANNULEE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."demandes_maintenance" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "equipement" character varying NOT NULL, "localisation" character varying, "description" character varying NOT NULL, "statut" "clinic"."demandes_maintenance_statut_enum" NOT NULL DEFAULT 'SIGNALEE', "demandeur_id" uuid NOT NULL, "technicien_id" uuid, "date_signalement" TIMESTAMP WITH TIME ZONE NOT NULL, "date_resolution" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_498be3eaea5bc4715bed0b84b9e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fd8b78ae87c993cb8f9c316054" ON "clinic"."demandes_maintenance" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'demandes_maintenance');
        await queryRunner.query(`CREATE TABLE "clinic"."articles_stock" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "nom" character varying NOT NULL, "categorie" character varying, "quantite" integer NOT NULL DEFAULT '0', "seuil_alerte" integer NOT NULL DEFAULT '0', "unite" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_92e0abf0d5289ed9437cadf71cf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_79e9f28fa87d7a832c5986ab4e" ON "clinic"."articles_stock" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'articles_stock');
        // platform.api_keys : pas de RLS, même convention que platform.users (voir api-key.entity.ts).
        await queryRunner.query(`CREATE TABLE "platform"."api_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "nom" character varying NOT NULL, "prefixe" character varying NOT NULL, "secret_hash" character varying NOT NULL, "permissions" jsonb NOT NULL DEFAULT '[]', "actif" boolean NOT NULL DEFAULT true, "expiration_date" TIMESTAMP WITH TIME ZONE, "derniere_utilisation" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_54b29055fb91a3fc6355c0710a" ON "platform"."api_keys" ("prefixe") `);
        await queryRunner.query(`CREATE INDEX "IDX_4f6ededcdc46dc15f7bf68561c" ON "platform"."api_keys" ("etablissement_id") `);
        await queryRunner.query(`DROP INDEX "platform"."IDX_cd68dee04a4612c22eb6820926"`);
        await queryRunner.query(`ALTER TYPE "platform"."user_permissions_permission_enum" RENAME TO "user_permissions_permission_enum_old"`);
        await queryRunner.query(`CREATE TYPE "platform"."user_permissions_permission_enum" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage', 'api-key:manage', 'fhir:read')`);
        await queryRunner.query(`ALTER TABLE "platform"."user_permissions" ALTER COLUMN "permission" TYPE "platform"."user_permissions_permission_enum" USING "permission"::"text"::"platform"."user_permissions_permission_enum"`);
        await queryRunner.query(`DROP TYPE "platform"."user_permissions_permission_enum_old"`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_9c116ac03805ca80baf3e8d231"`);
        await queryRunner.query(`ALTER TYPE "platform"."role_permissions_permission_enum" RENAME TO "role_permissions_permission_enum_old"`);
        await queryRunner.query(`CREATE TYPE "platform"."role_permissions_permission_enum" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage', 'api-key:manage', 'fhir:read')`);
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
        await queryRunner.query(`CREATE TYPE "platform"."role_permissions_permission_enum_old" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage')`);
        await queryRunner.query(`ALTER TABLE "platform"."role_permissions" ALTER COLUMN "permission" TYPE "platform"."role_permissions_permission_enum_old" USING "permission"::"text"::"platform"."role_permissions_permission_enum_old"`);
        await queryRunner.query(`DROP TYPE "platform"."role_permissions_permission_enum"`);
        await queryRunner.query(`ALTER TYPE "platform"."role_permissions_permission_enum_old" RENAME TO "role_permissions_permission_enum"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9c116ac03805ca80baf3e8d231" ON "platform"."role_permissions" ("role", "permission") `);
        await queryRunner.query(`CREATE TYPE "platform"."user_permissions_permission_enum_old" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage')`);
        await queryRunner.query(`ALTER TABLE "platform"."user_permissions" ALTER COLUMN "permission" TYPE "platform"."user_permissions_permission_enum_old" USING "permission"::"text"::"platform"."user_permissions_permission_enum_old"`);
        await queryRunner.query(`DROP TYPE "platform"."user_permissions_permission_enum"`);
        await queryRunner.query(`ALTER TYPE "platform"."user_permissions_permission_enum_old" RENAME TO "user_permissions_permission_enum"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cd68dee04a4612c22eb6820926" ON "platform"."user_permissions" ("user_id", "permission") `);
        await queryRunner.query(`DROP INDEX "platform"."IDX_4f6ededcdc46dc15f7bf68561c"`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_54b29055fb91a3fc6355c0710a"`);
        await queryRunner.query(`DROP TABLE "platform"."api_keys"`);
        await disableTenantRls(queryRunner, 'clinic', 'articles_stock');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_79e9f28fa87d7a832c5986ab4e"`);
        await queryRunner.query(`DROP TABLE "clinic"."articles_stock"`);
        await disableTenantRls(queryRunner, 'clinic', 'demandes_maintenance');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_fd8b78ae87c993cb8f9c316054"`);
        await queryRunner.query(`DROP TABLE "clinic"."demandes_maintenance"`);
        await queryRunner.query(`DROP TYPE "clinic"."demandes_maintenance_statut_enum"`);
        await disableTenantRls(queryRunner, 'clinic', 'notes_sociales');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_e3b63bba42aa1ef1870e6ca3a6"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_92af4c8a97dd9986daf8173aba"`);
        await queryRunner.query(`DROP TABLE "clinic"."notes_sociales"`);
        await disableTenantRls(queryRunner, 'clinic', 'cycles_sterilisation');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_e52835ba3da18eb9b665bf61b7"`);
        await queryRunner.query(`DROP TABLE "clinic"."cycles_sterilisation"`);
        await queryRunner.query(`DROP TYPE "clinic"."cycles_sterilisation_statut_enum"`);
    }

}
