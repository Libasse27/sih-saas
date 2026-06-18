import { MigrationInterface, QueryRunner } from "typeorm";
import { disableTenantRls, enableTenantRls } from "../utils/enable-tenant-rls.util";

export class AdmissionsLitsRdvConsultations1781789776809 implements MigrationInterface {
    name = 'AdmissionsLitsRdvConsultations1781789776809'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "clinic"."IDX_patients_etablissement_idh"`);
        await queryRunner.query(`CREATE TYPE "clinic"."rendez_vous_statut_enum" AS ENUM('PLANIFIE', 'CONFIRME', 'TERMINE', 'ANNULE', 'NO_SHOW')`);
        await queryRunner.query(`CREATE TYPE "clinic"."rendez_vous_canal_enum" AS ENUM('SUR_SITE', 'TELECONSULTATION')`);
        await queryRunner.query(`CREATE TABLE "clinic"."rendez_vous" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "patient_id" uuid NOT NULL, "praticien_id" uuid NOT NULL, "service_id" uuid, "date_heure" TIMESTAMP WITH TIME ZONE NOT NULL, "duree_min" integer NOT NULL DEFAULT '30', "motif" character varying, "statut" "clinic"."rendez_vous_statut_enum" NOT NULL DEFAULT 'PLANIFIE', "canal" "clinic"."rendez_vous_canal_enum" NOT NULL DEFAULT 'SUR_SITE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_598446f3a79c17ce39850c91abd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_385ea565b0eeef28c9a894c479" ON "clinic"."rendez_vous" ("etablissement_id", "patient_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_7c057edef050a2ccee10fe5250" ON "clinic"."rendez_vous" ("etablissement_id", "praticien_id", "date_heure") `);
        await queryRunner.query(`CREATE INDEX "IDX_57f316e754bff9ee88969ba2b3" ON "clinic"."rendez_vous" ("etablissement_id", "date_heure") `);
        await queryRunner.query(`CREATE INDEX "IDX_0ddfe983a768ef5cc1192ea383" ON "clinic"."rendez_vous" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'rendez_vous');
        await queryRunner.query(`CREATE TABLE "clinic"."consultations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "patient_id" uuid NOT NULL, "praticien_id" uuid NOT NULL, "rendez_vous_id" uuid, "admission_id" uuid, "date" TIMESTAMP WITH TIME ZONE NOT NULL, "motif" text NOT NULL, "examen_clinique" text, "diagnostic_cim10" character varying, "conclusion" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_c5b78e9424d9bc68464f6a12103" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fd45251a501394dda4ad2e0e12" ON "clinic"."consultations" ("etablissement_id", "praticien_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_fa3d30073fd503d6db1f2de1fe" ON "clinic"."consultations" ("etablissement_id", "patient_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_8002564d71dcfe7999492cbcea" ON "clinic"."consultations" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'consultations');
        await queryRunner.query(`CREATE TABLE "clinic"."services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "nom" character varying NOT NULL, "code" character varying NOT NULL, "type" character varying, "responsable_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3b77114f1f2c566b5ce07f2239" ON "clinic"."services" ("etablissement_id", "code") `);
        await queryRunner.query(`CREATE INDEX "IDX_769010c8944136e0122ebb1a70" ON "clinic"."services" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'services');
        await queryRunner.query(`CREATE TYPE "clinic"."mouvements_patient_type_enum" AS ENUM('ENTREE', 'TRANSFERT', 'SORTIE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."mouvements_patient" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "patient_id" uuid NOT NULL, "admission_id" uuid NOT NULL, "type" "clinic"."mouvements_patient_type_enum" NOT NULL, "service_origine_id" uuid, "lit_origine_id" uuid, "service_destination_id" uuid, "lit_destination_id" uuid, "date_mouvement" TIMESTAMP WITH TIME ZONE NOT NULL, "effectue_par_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3d79fe9610c7adb498c89e6895e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d370764012aa9d7108e146f695" ON "clinic"."mouvements_patient" ("etablissement_id", "admission_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_72b130768b1685969a3f83da1f" ON "clinic"."mouvements_patient" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'mouvements_patient');
        await queryRunner.query(`CREATE TYPE "clinic"."lits_statut_enum" AS ENUM('LIBRE', 'OCCUPE', 'RESERVE', 'MAINTENANCE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."lits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "chambre_id" uuid NOT NULL, "service_id" uuid NOT NULL, "numero" character varying NOT NULL, "statut" "clinic"."lits_statut_enum" NOT NULL DEFAULT 'LIBRE', "patient_actuel_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_56aab48a2c7ee2874c76c30a77e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ab0b78ba9d5e65070d3e6b9cee" ON "clinic"."lits" ("etablissement_id", "chambre_id", "numero") `);
        await queryRunner.query(`CREATE INDEX "IDX_0cb5075699176c4c7191a7e341" ON "clinic"."lits" ("etablissement_id", "service_id", "statut") `);
        await queryRunner.query(`CREATE INDEX "IDX_3c66f5f6ae815278ccacb5173b" ON "clinic"."lits" ("etablissement_id", "statut") `);
        await queryRunner.query(`CREATE INDEX "IDX_aee58e23893153d75876ce7e72" ON "clinic"."lits" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'lits');
        await queryRunner.query(`CREATE TABLE "clinic"."chambres" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "service_id" uuid NOT NULL, "numero" character varying NOT NULL, "type" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_315f56d8af925e5acf5aeaf4606" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cee38d60eb58f9134a448ac9fe" ON "clinic"."chambres" ("etablissement_id", "service_id", "numero") `);
        await queryRunner.query(`CREATE INDEX "IDX_2699d76580eea11c0f55cd22ce" ON "clinic"."chambres" ("etablissement_id", "service_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_9ef01669a307f2816d32855714" ON "clinic"."chambres" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'chambres');
        await queryRunner.query(`CREATE TYPE "clinic"."admissions_statut_enum" AS ENUM('EN_COURS', 'TERMINEE', 'ANNULEE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."admissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "patient_id" uuid NOT NULL, "lit_id" uuid, "service_id" uuid NOT NULL, "medecin_referent_id" uuid NOT NULL, "motif" text NOT NULL, "date_admission" TIMESTAMP WITH TIME ZONE NOT NULL, "date_sortie_prevue" TIMESTAMP WITH TIME ZONE, "date_sortie_reelle" TIMESTAMP WITH TIME ZONE, "statut" "clinic"."admissions_statut_enum" NOT NULL DEFAULT 'EN_COURS', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_6d47682a899dfa0a78ce11fe98a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c1d549fc2afe58fcfb31ef5ddc" ON "clinic"."admissions" ("etablissement_id", "patient_id", "statut") `);
        await queryRunner.query(`CREATE INDEX "IDX_cc6c81c24aee91fbcf5005a98d" ON "clinic"."admissions" ("etablissement_id", "patient_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_1cc5b6682de3a67015f0492cb0" ON "clinic"."admissions" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'admissions');
        await queryRunner.query(`ALTER TABLE "platform"."users" ADD "service_id" uuid`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"utilisateurs":0,"lits":0,"stockageMo":0}'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_aadc6a0605dbdf5aaa6cefc604" ON "clinic"."patients" ("etablissement_id", "idh") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "clinic"."IDX_aadc6a0605dbdf5aaa6cefc604"`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"lits": 0, "stockageMo": 0, "utilisateurs": 0}'`);
        await queryRunner.query(`ALTER TABLE "platform"."users" DROP COLUMN "service_id"`);
        await disableTenantRls(queryRunner, 'clinic', 'admissions');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_1cc5b6682de3a67015f0492cb0"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_cc6c81c24aee91fbcf5005a98d"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_c1d549fc2afe58fcfb31ef5ddc"`);
        await queryRunner.query(`DROP TABLE "clinic"."admissions"`);
        await queryRunner.query(`DROP TYPE "clinic"."admissions_statut_enum"`);
        await disableTenantRls(queryRunner, 'clinic', 'chambres');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_9ef01669a307f2816d32855714"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_2699d76580eea11c0f55cd22ce"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_cee38d60eb58f9134a448ac9fe"`);
        await queryRunner.query(`DROP TABLE "clinic"."chambres"`);
        await disableTenantRls(queryRunner, 'clinic', 'lits');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_aee58e23893153d75876ce7e72"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_3c66f5f6ae815278ccacb5173b"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_0cb5075699176c4c7191a7e341"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_ab0b78ba9d5e65070d3e6b9cee"`);
        await queryRunner.query(`DROP TABLE "clinic"."lits"`);
        await queryRunner.query(`DROP TYPE "clinic"."lits_statut_enum"`);
        await disableTenantRls(queryRunner, 'clinic', 'mouvements_patient');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_72b130768b1685969a3f83da1f"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_d370764012aa9d7108e146f695"`);
        await queryRunner.query(`DROP TABLE "clinic"."mouvements_patient"`);
        await queryRunner.query(`DROP TYPE "clinic"."mouvements_patient_type_enum"`);
        await disableTenantRls(queryRunner, 'clinic', 'services');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_769010c8944136e0122ebb1a70"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_3b77114f1f2c566b5ce07f2239"`);
        await queryRunner.query(`DROP TABLE "clinic"."services"`);
        await disableTenantRls(queryRunner, 'clinic', 'consultations');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_8002564d71dcfe7999492cbcea"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_fa3d30073fd503d6db1f2de1fe"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_fd45251a501394dda4ad2e0e12"`);
        await queryRunner.query(`DROP TABLE "clinic"."consultations"`);
        await disableTenantRls(queryRunner, 'clinic', 'rendez_vous');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_0ddfe983a768ef5cc1192ea383"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_57f316e754bff9ee88969ba2b3"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_7c057edef050a2ccee10fe5250"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_385ea565b0eeef28c9a894c479"`);
        await queryRunner.query(`DROP TABLE "clinic"."rendez_vous"`);
        await queryRunner.query(`DROP TYPE "clinic"."rendez_vous_canal_enum"`);
        await queryRunner.query(`DROP TYPE "clinic"."rendez_vous_statut_enum"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_patients_etablissement_idh" ON "clinic"."patients" ("etablissement_id", "idh") `);
    }

}
