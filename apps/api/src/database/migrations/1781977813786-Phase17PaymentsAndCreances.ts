import { MigrationInterface, QueryRunner } from "typeorm";
import { disableTenantRls, enableTenantRls } from "../utils/enable-tenant-rls.util";

export class Phase17PaymentsAndCreances1781977813786 implements MigrationInterface {
    name = 'Phase17PaymentsAndCreances1781977813786'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "clinic"."creances_assurance_statut_enum" AS ENUM('A_SOUMETTRE', 'SOUMISE', 'PAYEE', 'REJETEE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."creances_assurance" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "facture_patient_id" uuid NOT NULL, "assurance_id" uuid NOT NULL, "montant" numeric NOT NULL, "statut" "clinic"."creances_assurance_statut_enum" NOT NULL DEFAULT 'A_SOUMETTRE', "date_soumission" TIMESTAMP WITH TIME ZONE, "date_reglement" TIMESTAMP WITH TIME ZONE, "reference_reglement" character varying, "motif_rejet" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_577ee3b456a6a59621f4ab2cd77" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ebb8a4c042f99e3188553d878e" ON "clinic"."creances_assurance" ("etablissement_id", "statut") `);
        await queryRunner.query(`CREATE INDEX "IDX_764443704147c96fa90aaaa67a" ON "clinic"."creances_assurance" ("etablissement_id", "facture_patient_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c822dea1bcac9fb1179387eedc" ON "clinic"."creances_assurance" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'creances_assurance');
        await queryRunner.query(`ALTER TABLE "platform"."payments" ADD "provider_reference" character varying`);
        await queryRunner.query(`ALTER TABLE "clinic"."paiements_patient" ADD "provider_reference" character varying`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"utilisateurs":0,"lits":0,"stockageMo":0}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"lits": 0, "stockageMo": 0, "utilisateurs": 0}'`);
        await queryRunner.query(`ALTER TABLE "clinic"."paiements_patient" DROP COLUMN "provider_reference"`);
        await queryRunner.query(`ALTER TABLE "platform"."payments" DROP COLUMN "provider_reference"`);
        await disableTenantRls(queryRunner, 'clinic', 'creances_assurance');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_c822dea1bcac9fb1179387eedc"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_764443704147c96fa90aaaa67a"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_ebb8a4c042f99e3188553d878e"`);
        await queryRunner.query(`DROP TABLE "clinic"."creances_assurance"`);
        await queryRunner.query(`DROP TYPE "clinic"."creances_assurance_statut_enum"`);
    }

}
