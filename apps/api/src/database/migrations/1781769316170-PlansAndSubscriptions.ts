import { MigrationInterface, QueryRunner } from "typeorm";

export class PlansAndSubscriptions1781769316170 implements MigrationInterface {
    name = 'PlansAndSubscriptions1781769316170'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "platform"."subscriptions_periodicite_enum" AS ENUM('MENSUEL', 'ANNUEL')`);
        await queryRunner.query(`CREATE TYPE "platform"."subscriptions_statut_enum" AS ENUM('ESSAI', 'ACTIF', 'EN_PERIODE_GRACE', 'EXPIRE', 'SUSPENDU', 'ANNULE', 'EN_ATTENTE')`);
        await queryRunner.query(`CREATE TABLE "platform"."subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "plan_id" uuid NOT NULL, "plan_snapshot" jsonb NOT NULL, "periodicite" "platform"."subscriptions_periodicite_enum" NOT NULL, "date_debut" TIMESTAMP WITH TIME ZONE NOT NULL, "date_fin" TIMESTAMP WITH TIME ZONE NOT NULL, "statut" "platform"."subscriptions_statut_enum" NOT NULL, "montant" numeric NOT NULL, "devise" character varying NOT NULL, "renouvellement_auto" boolean NOT NULL DEFAULT true, "coupon_applique" character varying, "historique" jsonb NOT NULL DEFAULT '[]', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_323112111eb54ba48e3e98897d" ON "platform"."subscriptions" ("etablissement_id") `);
        await queryRunner.query(`CREATE TYPE "platform"."plans_modules_enum" AS ENUM('DME', 'RDV', 'ADMISSIONS', 'PHARMACIE', 'LABORATOIRE', 'IMAGERIE', 'FACTURATION', 'TELEMEDECINE', 'API')`);
        await queryRunner.query(`CREATE TABLE "platform"."plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "nom" character varying NOT NULL, "description" text, "tarifs" jsonb NOT NULL, "limites" jsonb NOT NULL, "modules" "platform"."plans_modules_enum" array NOT NULL DEFAULT '{}', "features" jsonb NOT NULL, "essai_gratuit_jours" integer NOT NULL DEFAULT '0', "visible" boolean NOT NULL DEFAULT true, "actif" boolean NOT NULL DEFAULT true, "ordre_affichage" integer NOT NULL DEFAULT '0', "version" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_95f7ef3fc4c31a3545b4d825dd4" UNIQUE ("code"), CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ADD "abonnement_actif_id" uuid`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"utilisateurs":0,"lits":0,"stockageMo":0}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"lits": 0, "stockageMo": 0, "utilisateurs": 0}'`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" DROP COLUMN "abonnement_actif_id"`);
        await queryRunner.query(`DROP TABLE "platform"."plans"`);
        await queryRunner.query(`DROP TYPE "platform"."plans_modules_enum"`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_323112111eb54ba48e3e98897d"`);
        await queryRunner.query(`DROP TABLE "platform"."subscriptions"`);
        await queryRunner.query(`DROP TYPE "platform"."subscriptions_statut_enum"`);
        await queryRunner.query(`DROP TYPE "platform"."subscriptions_periodicite_enum"`);
    }

}
