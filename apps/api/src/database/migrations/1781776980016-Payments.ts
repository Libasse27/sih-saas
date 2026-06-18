import { MigrationInterface, QueryRunner } from "typeorm";

export class Payments1781776980016 implements MigrationInterface {
    name = 'Payments1781776980016'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "platform"."payments_periodicite_enum" AS ENUM('MENSUEL', 'ANNUEL')`);
        await queryRunner.query(`CREATE TYPE "platform"."payments_provider_enum" AS ENUM('SANDBOX', 'STRIPE', 'WAVE', 'ORANGE_MONEY', 'CARTE')`);
        await queryRunner.query(`CREATE TYPE "platform"."payments_statut_enum" AS ENUM('EN_ATTENTE', 'REUSSI', 'ECHOUE')`);
        await queryRunner.query(`CREATE TABLE "platform"."payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "plan_id" uuid NOT NULL, "periodicite" "platform"."payments_periodicite_enum" NOT NULL, "subscription_id" uuid, "provider" "platform"."payments_provider_enum" NOT NULL, "reference" character varying NOT NULL, "montant" numeric NOT NULL, "devise" character varying NOT NULL, "statut" "platform"."payments_statut_enum" NOT NULL DEFAULT 'EN_ATTENTE', "raw_payload" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_866ddee0e17d9385b4e3b86851d" UNIQUE ("reference"), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d3d47565a8c743e761dc79b21d" ON "platform"."payments" ("etablissement_id") `);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"utilisateurs":0,"lits":0,"stockageMo":0}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"lits": 0, "stockageMo": 0, "utilisateurs": 0}'`);
        await queryRunner.query(`DROP INDEX "platform"."IDX_d3d47565a8c743e761dc79b21d"`);
        await queryRunner.query(`DROP TABLE "platform"."payments"`);
        await queryRunner.query(`DROP TYPE "platform"."payments_statut_enum"`);
        await queryRunner.query(`DROP TYPE "platform"."payments_provider_enum"`);
        await queryRunner.query(`DROP TYPE "platform"."payments_periodicite_enum"`);
    }

}
