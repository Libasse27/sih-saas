import { MigrationInterface, QueryRunner } from "typeorm";
import { disableTenantRls, enableTenantRls } from "../utils/enable-tenant-rls.util";

export class FacturationPatient1781795090935 implements MigrationInterface {
    name = 'FacturationPatient1781795090935'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "clinic"."paiements_patient_mode_enum" AS ENUM('CAISSE', 'ORANGE_MONEY', 'WAVE', 'CARTE')`);
        await queryRunner.query(`CREATE TYPE "clinic"."paiements_patient_statut_enum" AS ENUM('EN_ATTENTE', 'REUSSI', 'ECHOUE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."paiements_patient" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "facture_patient_id" uuid NOT NULL, "montant" numeric NOT NULL, "mode" "clinic"."paiements_patient_mode_enum" NOT NULL, "reference" character varying NOT NULL, "statut" "clinic"."paiements_patient_statut_enum" NOT NULL DEFAULT 'EN_ATTENTE', "caissier_id" uuid, "date" TIMESTAMP WITH TIME ZONE NOT NULL, "raw_payload" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_ede733e83157f6a97f347866e28" UNIQUE ("reference"), CONSTRAINT "PK_33a1012124f51a6ba9cd6ac7234" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_bb2066f698c911993ea8fd5d47" ON "clinic"."paiements_patient" ("etablissement_id", "facture_patient_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_1c2b541a3ea95bc5b38f4759b2" ON "clinic"."paiements_patient" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'paiements_patient');
        await queryRunner.query(`CREATE TYPE "clinic"."factures_patient_statut_enum" AS ENUM('EN_ATTENTE', 'PARTIELLEMENT_PAYEE', 'PAYEE', 'ANNULEE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."factures_patient" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "patient_id" uuid NOT NULL, "admission_id" uuid, "numero" character varying NOT NULL, "lignes" jsonb NOT NULL, "montant_total" numeric NOT NULL, "part_assurance" numeric NOT NULL, "part_patient" numeric NOT NULL, "statut" "clinic"."factures_patient_statut_enum" NOT NULL DEFAULT 'EN_ATTENTE', "date_emission" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_16ad1c4f81b7fb07ad1f7c5763d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f71ad5b680f9e241cccb6371d3" ON "clinic"."factures_patient" ("etablissement_id", "numero") `);
        await queryRunner.query(`CREATE INDEX "IDX_cd5605e480603f939bcffe9b3e" ON "clinic"."factures_patient" ("etablissement_id", "patient_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_0c2e4adbfcd8c99e549e8847a3" ON "clinic"."factures_patient" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'factures_patient');
        await queryRunner.query(`CREATE TYPE "clinic"."assurances_organisme_enum" AS ENUM('IPM', 'MUTUELLE', 'CMU', 'PRIVEE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."assurances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "patient_id" uuid NOT NULL, "organisme" "clinic"."assurances_organisme_enum" NOT NULL, "numero_police" character varying NOT NULL, "taux_couverture" integer NOT NULL, "valide_du" date NOT NULL, "valide_au" date NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_a499a669bd3223a7436ff166812" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9744293b32edd6a2ae28f36e04" ON "clinic"."assurances" ("etablissement_id", "patient_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_3282f2e0773f2776c26769d480" ON "clinic"."assurances" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'assurances');
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"utilisateurs":0,"lits":0,"stockageMo":0}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"lits": 0, "stockageMo": 0, "utilisateurs": 0}'`);
        await disableTenantRls(queryRunner, 'clinic', 'assurances');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_3282f2e0773f2776c26769d480"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_9744293b32edd6a2ae28f36e04"`);
        await queryRunner.query(`DROP TABLE "clinic"."assurances"`);
        await queryRunner.query(`DROP TYPE "clinic"."assurances_organisme_enum"`);
        await disableTenantRls(queryRunner, 'clinic', 'factures_patient');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_0c2e4adbfcd8c99e549e8847a3"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_cd5605e480603f939bcffe9b3e"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_f71ad5b680f9e241cccb6371d3"`);
        await queryRunner.query(`DROP TABLE "clinic"."factures_patient"`);
        await queryRunner.query(`DROP TYPE "clinic"."factures_patient_statut_enum"`);
        await disableTenantRls(queryRunner, 'clinic', 'paiements_patient');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_1c2b541a3ea95bc5b38f4759b2"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_bb2066f698c911993ea8fd5d47"`);
        await queryRunner.query(`DROP TABLE "clinic"."paiements_patient"`);
        await queryRunner.query(`DROP TYPE "clinic"."paiements_patient_statut_enum"`);
        await queryRunner.query(`DROP TYPE "clinic"."paiements_patient_mode_enum"`);
    }

}
