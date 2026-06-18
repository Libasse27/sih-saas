import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialPlatformSchema1781748217226 implements MigrationInterface {
    name = 'InitialPlatformSchema1781748217226'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "platform"`);
        await queryRunner.query(`CREATE TYPE "platform"."user_permissions_permission_enum" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage')`);
        await queryRunner.query(`CREATE TYPE "platform"."user_permissions_effect_enum" AS ENUM('ALLOW', 'DENY')`);
        await queryRunner.query(`CREATE TABLE "platform"."user_permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "permission" "platform"."user_permissions_permission_enum" NOT NULL, "effect" "platform"."user_permissions_effect_enum" NOT NULL, CONSTRAINT "PK_01f4295968ba33d73926684264f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cd68dee04a4612c22eb6820926" ON "platform"."user_permissions" ("user_id", "permission") `);
        await queryRunner.query(`CREATE TYPE "platform"."user_roles_role_enum" AS ENUM('SUPER_ADMIN', 'ADMIN_ETABLISSEMENT', 'DIRECTEUR', 'ADMIN_SYSTEME', 'MEDECIN', 'CHIRURGIEN', 'INFIRMIER', 'ANESTHESISTE', 'SAGE_FEMME', 'PSYCHIATRE', 'KINESITHERAPEUTE', 'DIETETICIEN', 'RADIOLOGUE', 'MANIPULATEUR_RADIO', 'LABORANTIN', 'BIOLOGISTE', 'PHARMACIEN', 'AGENT_STERILISATION', 'MAGASINIER', 'TECHNICIEN_MAINTENANCE', 'AGENT_ACCUEIL_ADMISSION', 'SECRETAIRE_MEDICALE', 'CAISSIER_FACTURATION', 'GESTIONNAIRE_LITS', 'ASSISTANT_SOCIAL', 'RH', 'PATIENT')`);
        await queryRunner.query(`CREATE TABLE "platform"."user_roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "role" "platform"."user_roles_role_enum" NOT NULL, CONSTRAINT "PK_8acd5cf26ebd158416f477de799" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_09d115a69b6014d324d592f9c4" ON "platform"."user_roles" ("user_id", "role") `);
        await queryRunner.query(`CREATE TYPE "platform"."users_scope_enum" AS ENUM('PLATFORM', 'ETABLISSEMENT', 'PATIENT')`);
        await queryRunner.query(`CREATE TABLE "platform"."users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "scope" "platform"."users_scope_enum" NOT NULL, "etablissement_id" uuid, "nom" character varying NOT NULL, "prenom" character varying NOT NULL, "email" character varying NOT NULL, "telephone" character varying, "password_hash" character varying NOT NULL, "mfa_enabled" boolean NOT NULL DEFAULT false, "mfa_secret" character varying, "dernier_login" TIMESTAMP WITH TIME ZONE, "tentatives_echouees" integer NOT NULL DEFAULT '0', "verrouille_jusqua" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e2635ef6c392d8666d3d408f32" ON "platform"."users" ("etablissement_id") `);
        await queryRunner.query(`CREATE TYPE "platform"."role_permissions_role_enum" AS ENUM('SUPER_ADMIN', 'ADMIN_ETABLISSEMENT', 'DIRECTEUR', 'ADMIN_SYSTEME', 'MEDECIN', 'CHIRURGIEN', 'INFIRMIER', 'ANESTHESISTE', 'SAGE_FEMME', 'PSYCHIATRE', 'KINESITHERAPEUTE', 'DIETETICIEN', 'RADIOLOGUE', 'MANIPULATEUR_RADIO', 'LABORANTIN', 'BIOLOGISTE', 'PHARMACIEN', 'AGENT_STERILISATION', 'MAGASINIER', 'TECHNICIEN_MAINTENANCE', 'AGENT_ACCUEIL_ADMISSION', 'SECRETAIRE_MEDICALE', 'CAISSIER_FACTURATION', 'GESTIONNAIRE_LITS', 'ASSISTANT_SOCIAL', 'RH', 'PATIENT')`);
        await queryRunner.query(`CREATE TYPE "platform"."role_permissions_permission_enum" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage')`);
        await queryRunner.query(`CREATE TABLE "platform"."role_permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role" "platform"."role_permissions_role_enum" NOT NULL, "permission" "platform"."role_permissions_permission_enum" NOT NULL, CONSTRAINT "PK_84059017c90bfcb701b8fa42297" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9c116ac03805ca80baf3e8d231" ON "platform"."role_permissions" ("role", "permission") `);
        await queryRunner.query(`CREATE TYPE "platform"."etablissements_type_enum" AS ENUM('HOPITAL', 'CLINIQUE')`);
        await queryRunner.query(`CREATE TYPE "platform"."etablissements_statut_enum" AS ENUM('ACTIF', 'SUSPENDU', 'EXPIRE', 'EN_ATTENTE_PAIEMENT', 'ESSAI')`);
        await queryRunner.query(`CREATE TABLE "platform"."etablissements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nom" character varying NOT NULL, "type" "platform"."etablissements_type_enum" NOT NULL, "rccm" character varying, "ninea" character varying, "adresse" character varying, "ville" character varying, "pays" character varying NOT NULL DEFAULT 'Sénégal', "telephone" character varying, "email" character varying, "logo" character varying, "devise" character varying NOT NULL DEFAULT 'XOF', "langue" character varying NOT NULL DEFAULT 'fr-SN', "fuseau" character varying NOT NULL DEFAULT 'Africa/Dakar', "admin_id" uuid, "statut" "platform"."etablissements_statut_enum" NOT NULL DEFAULT 'EN_ATTENTE_PAIEMENT', "usage" jsonb NOT NULL DEFAULT '{"utilisateurs":0,"lits":0,"stockageMo":0}', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_7451c2494e724b35040748d0a65" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "platform"."refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" character varying NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_a7838d2ba25be1342091b6695f1" UNIQUE ("token_hash"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3ddc983c5f7bcf132fd8732c3f" ON "platform"."refresh_tokens" ("user_id") `);
        await queryRunner.query(`CREATE TABLE "platform"."audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid, "user_id" uuid, "action" character varying NOT NULL, "ressource" character varying, "ressource_id" uuid, "ip" character varying, "user_agent" character varying, "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ae365c576beca6167d4e3580d4" ON "platform"."audit_logs" ("etablissement_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "platform"."user_permissions" ADD CONSTRAINT "FK_3495bd31f1862d02931e8e8d2e8" FOREIGN KEY ("user_id") REFERENCES "platform"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "platform"."user_roles" ADD CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY ("user_id") REFERENCES "platform"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "platform"."user_roles" DROP CONSTRAINT "FK_87b8888186ca9769c960e926870"`);
        await queryRunner.query(`ALTER TABLE "platform"."user_permissions" DROP CONSTRAINT "FK_3495bd31f1862d02931e8e8d2e8"`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_ae365c576beca6167d4e3580d4"`);
        await queryRunner.query(`DROP TABLE "platform"."audit_logs"`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_3ddc983c5f7bcf132fd8732c3f"`);
        await queryRunner.query(`DROP TABLE "platform"."refresh_tokens"`);
        await queryRunner.query(`DROP TABLE "platform"."etablissements"`);
        await queryRunner.query(`DROP TYPE "platform"."etablissements_statut_enum"`);
        await queryRunner.query(`DROP TYPE "platform"."etablissements_type_enum"`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_9c116ac03805ca80baf3e8d231"`);
        await queryRunner.query(`DROP TABLE "platform"."role_permissions"`);
        await queryRunner.query(`DROP TYPE "platform"."role_permissions_permission_enum"`);
        await queryRunner.query(`DROP TYPE "platform"."role_permissions_role_enum"`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_e2635ef6c392d8666d3d408f32"`);
        await queryRunner.query(`DROP TABLE "platform"."users"`);
        await queryRunner.query(`DROP TYPE "platform"."users_scope_enum"`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_09d115a69b6014d324d592f9c4"`);
        await queryRunner.query(`DROP TABLE "platform"."user_roles"`);
        await queryRunner.query(`DROP TYPE "platform"."user_roles_role_enum"`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_cd68dee04a4612c22eb6820926"`);
        await queryRunner.query(`DROP TABLE "platform"."user_permissions"`);
        await queryRunner.query(`DROP TYPE "platform"."user_permissions_effect_enum"`);
        await queryRunner.query(`DROP TYPE "platform"."user_permissions_permission_enum"`);
    }

}
