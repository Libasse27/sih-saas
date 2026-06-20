import { MigrationInterface, QueryRunner } from "typeorm";
import { disableTenantRls, enableTenantRls } from "../utils/enable-tenant-rls.util";

export class MessagingAndPushNotifications1781955487650 implements MigrationInterface {
    name = 'MessagingAndPushNotifications1781955487650'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // platform.device_tokens : pas de RLS, même convention que platform.users/platform.api_keys.
        await queryRunner.query(`CREATE TABLE "platform"."device_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token" character varying NOT NULL, "plateforme" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_977e24c520c49436d08e5eeea8a" UNIQUE ("token"), CONSTRAINT "PK_84700be257607cfb1f9dc2e52c3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_17e1f528b993c6d55def4cf5be" ON "platform"."device_tokens" ("user_id") `);
        await queryRunner.query(`CREATE TYPE "clinic"."messages_auteur_scope_enum" AS ENUM('PLATFORM', 'ETABLISSEMENT', 'PATIENT')`);
        await queryRunner.query(`CREATE TABLE "clinic"."messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "conversation_id" uuid NOT NULL, "auteur_id" uuid NOT NULL, "auteur_scope" "clinic"."messages_auteur_scope_enum" NOT NULL, "contenu" character varying NOT NULL, "lu_par_patient" boolean NOT NULL DEFAULT false, "lu_par_praticien" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9489930322b992071397a7b244" ON "clinic"."messages" ("etablissement_id", "conversation_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_9a4668a94efe737b27e531e29f" ON "clinic"."messages" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'messages');
        await queryRunner.query(`CREATE TABLE "clinic"."conversations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "patient_id" uuid NOT NULL, "praticien_id" uuid NOT NULL, "dernier_message_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a82a5e26594d57652badb8427a" ON "clinic"."conversations" ("etablissement_id", "patient_id", "praticien_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_23bb368d88ebabc2f777338d70" ON "clinic"."conversations" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'conversations');
        await queryRunner.query(`DROP INDEX "platform"."IDX_cd68dee04a4612c22eb6820926"`);
        await queryRunner.query(`ALTER TYPE "platform"."user_permissions_permission_enum" RENAME TO "user_permissions_permission_enum_old"`);
        await queryRunner.query(`CREATE TYPE "platform"."user_permissions_permission_enum" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage', 'api-key:manage', 'fhir:read', 'message:send', 'message:read')`);
        await queryRunner.query(`ALTER TABLE "platform"."user_permissions" ALTER COLUMN "permission" TYPE "platform"."user_permissions_permission_enum" USING "permission"::"text"::"platform"."user_permissions_permission_enum"`);
        await queryRunner.query(`DROP TYPE "platform"."user_permissions_permission_enum_old"`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_9c116ac03805ca80baf3e8d231"`);
        await queryRunner.query(`ALTER TYPE "platform"."role_permissions_permission_enum" RENAME TO "role_permissions_permission_enum_old"`);
        await queryRunner.query(`CREATE TYPE "platform"."role_permissions_permission_enum" AS ENUM('plan:manage', 'abonnement-plateforme:manage', 'etablissement:manage', 'etablissement:suspend', 'coupon:manage', 'setting-plateforme:manage', 'audit:read:global', 'utilisateur:manage', 'etablissement:settings', 'abonnement-etablissement:view', 'abonnement-etablissement:renew', 'audit:read:local', 'patient:create', 'patient:read', 'dossier:read', 'dossier:write', 'rdv:create', 'rdv:manage', 'consultation:create', 'admission:create', 'lit:view', 'lit:assign', 'lit:liberer', 'prescription:create', 'prescription:validate', 'dispensation:create', 'stock:view', 'stock:manage', 'administration:create', 'labo:request', 'labo:result:write', 'labo:result:validate', 'imagerie:request', 'imagerie:report:write', 'imagerie:report:validate', 'facture-patient:create', 'facture-patient:validate', 'paiement-patient:create', 'assurance:manage', 'rh:manage', 'social:manage', 'maintenance:manage', 'sterilisation:manage', 'api-key:manage', 'fhir:read', 'message:send', 'message:read')`);
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
        await queryRunner.query(`CREATE TYPE "platform"."role_permissions_permission_enum_old" AS ENUM('abonnement-etablissement:renew', 'abonnement-etablissement:view', 'abonnement-plateforme:manage', 'administration:create', 'admission:create', 'api-key:manage', 'assurance:manage', 'audit:read:global', 'audit:read:local', 'consultation:create', 'coupon:manage', 'dispensation:create', 'dossier:read', 'dossier:write', 'etablissement:manage', 'etablissement:settings', 'etablissement:suspend', 'facture-patient:create', 'facture-patient:validate', 'fhir:read', 'imagerie:report:validate', 'imagerie:report:write', 'imagerie:request', 'labo:request', 'labo:result:validate', 'labo:result:write', 'lit:assign', 'lit:liberer', 'lit:view', 'maintenance:manage', 'paiement-patient:create', 'patient:create', 'patient:read', 'plan:manage', 'prescription:create', 'prescription:validate', 'rdv:create', 'rdv:manage', 'rh:manage', 'setting-plateforme:manage', 'social:manage', 'sterilisation:manage', 'stock:manage', 'stock:view', 'utilisateur:manage')`);
        await queryRunner.query(`ALTER TABLE "platform"."role_permissions" ALTER COLUMN "permission" TYPE "platform"."role_permissions_permission_enum_old" USING "permission"::"text"::"platform"."role_permissions_permission_enum_old"`);
        await queryRunner.query(`DROP TYPE "platform"."role_permissions_permission_enum"`);
        await queryRunner.query(`ALTER TYPE "platform"."role_permissions_permission_enum_old" RENAME TO "role_permissions_permission_enum"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9c116ac03805ca80baf3e8d231" ON "platform"."role_permissions" ("role", "permission") `);
        await queryRunner.query(`CREATE TYPE "platform"."user_permissions_permission_enum_old" AS ENUM('abonnement-etablissement:renew', 'abonnement-etablissement:view', 'abonnement-plateforme:manage', 'administration:create', 'admission:create', 'api-key:manage', 'assurance:manage', 'audit:read:global', 'audit:read:local', 'consultation:create', 'coupon:manage', 'dispensation:create', 'dossier:read', 'dossier:write', 'etablissement:manage', 'etablissement:settings', 'etablissement:suspend', 'facture-patient:create', 'facture-patient:validate', 'fhir:read', 'imagerie:report:validate', 'imagerie:report:write', 'imagerie:request', 'labo:request', 'labo:result:validate', 'labo:result:write', 'lit:assign', 'lit:liberer', 'lit:view', 'maintenance:manage', 'paiement-patient:create', 'patient:create', 'patient:read', 'plan:manage', 'prescription:create', 'prescription:validate', 'rdv:create', 'rdv:manage', 'rh:manage', 'setting-plateforme:manage', 'social:manage', 'sterilisation:manage', 'stock:manage', 'stock:view', 'utilisateur:manage')`);
        await queryRunner.query(`ALTER TABLE "platform"."user_permissions" ALTER COLUMN "permission" TYPE "platform"."user_permissions_permission_enum_old" USING "permission"::"text"::"platform"."user_permissions_permission_enum_old"`);
        await queryRunner.query(`DROP TYPE "platform"."user_permissions_permission_enum"`);
        await queryRunner.query(`ALTER TYPE "platform"."user_permissions_permission_enum_old" RENAME TO "user_permissions_permission_enum"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cd68dee04a4612c22eb6820926" ON "platform"."user_permissions" ("user_id", "permission") `);
        await disableTenantRls(queryRunner, 'clinic', 'conversations');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_23bb368d88ebabc2f777338d70"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_a82a5e26594d57652badb8427a"`);
        await queryRunner.query(`DROP TABLE "clinic"."conversations"`);
        await disableTenantRls(queryRunner, 'clinic', 'messages');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_9a4668a94efe737b27e531e29f"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_9489930322b992071397a7b244"`);
        await queryRunner.query(`DROP TABLE "clinic"."messages"`);
        await queryRunner.query(`DROP TYPE "clinic"."messages_auteur_scope_enum"`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_17e1f528b993c6d55def4cf5be"`);
        await queryRunner.query(`DROP TABLE "platform"."device_tokens"`);
    }

}
