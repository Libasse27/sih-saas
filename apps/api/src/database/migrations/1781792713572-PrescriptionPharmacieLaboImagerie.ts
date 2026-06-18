import { MigrationInterface, QueryRunner } from "typeorm";
import { disableTenantRls, enableTenantRls } from "../utils/enable-tenant-rls.util";

export class PrescriptionPharmacieLaboImagerie1781792713572 implements MigrationInterface {
    name = 'PrescriptionPharmacieLaboImagerie1781792713572'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "clinic"."prescriptions_statut_enum" AS ENUM('EN_ATTENTE', 'VALIDEE', 'DISPENSEE', 'ANNULEE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."prescriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "patient_id" uuid NOT NULL, "consultation_id" uuid, "prescripteur_id" uuid NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, "statut" "clinic"."prescriptions_statut_enum" NOT NULL DEFAULT 'EN_ATTENTE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_097b2cc2f2b7e56825468188503" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fcdfa827c5f7af150f21f4b537" ON "clinic"."prescriptions" ("etablissement_id", "patient_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_ac2718e4d719e83bd182f144c0" ON "clinic"."prescriptions" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'prescriptions');
        await queryRunner.query(`CREATE TABLE "clinic"."prescription_lignes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "prescription_id" uuid NOT NULL, "medicament_id" uuid NOT NULL, "posologie" character varying NOT NULL, "duree" character varying NOT NULL, "voie" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_474b9069a4d486e23db5dc3b4d1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e5eba065f2e9666c626d804aad" ON "clinic"."prescription_lignes" ("etablissement_id", "prescription_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_7d1cbb157baed780e64f2bcbd3" ON "clinic"."prescription_lignes" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'prescription_lignes');
        await queryRunner.query(`CREATE TABLE "clinic"."stock_medicament" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "medicament_id" uuid NOT NULL, "lot" character varying NOT NULL, "quantite" integer NOT NULL, "seuil_alerte" integer NOT NULL, "date_expiration" date NOT NULL, "emplacement" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_34ae2e8745563a8e12fa1eb43f0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_80df6e54c4c76be0dc6bf5ea20" ON "clinic"."stock_medicament" ("etablissement_id", "medicament_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c176a68bb48cefd37aa03f65eb" ON "clinic"."stock_medicament" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'stock_medicament');
        // Référentiel global, non tenant (modele-de-donnees.md §2) — PAS de etablissement_id, PAS de RLS.
        await queryRunner.query(`CREATE TABLE "clinic"."medicaments_catalogue" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "dci" character varying NOT NULL, "code_atc" character varying, "forme" character varying NOT NULL, "dosage" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_44afc343c5c86bf01725173e977" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3d8435922e7ace504761fa3001" ON "clinic"."medicaments_catalogue" ("dci") `);
        await queryRunner.query(`CREATE TABLE "clinic"."dispensations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "prescription_id" uuid NOT NULL, "pharmacien_id" uuid NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, "lignes_dispensees" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2fd4df898cc037676b04fffbe7c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2a96f3a2dbfdf0db1a6afeb74e" ON "clinic"."dispensations" ("etablissement_id", "prescription_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_fab25c6e26e5cb3ce7719fdfa0" ON "clinic"."dispensations" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'dispensations');
        await queryRunner.query(`CREATE TYPE "clinic"."administration_medicament_statut_enum" AS ENUM('ADMINISTRE', 'REFUSE', 'OMIS')`);
        await queryRunner.query(`CREATE TABLE "clinic"."administration_medicament" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "prescription_ligne_id" uuid NOT NULL, "patient_id" uuid NOT NULL, "infirmier_id" uuid NOT NULL, "date_heure" TIMESTAMP WITH TIME ZONE NOT NULL, "statut" "clinic"."administration_medicament_statut_enum" NOT NULL, "commentaire" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6d6183b9a73c76c0fae42607824" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c6d24fc42a5d389ae85c48b518" ON "clinic"."administration_medicament" ("etablissement_id", "patient_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_b69c8c6e25967a39b203f7f454" ON "clinic"."administration_medicament" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'administration_medicament');
        await queryRunner.query(`CREATE TABLE "clinic"."resultats_analyse" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "demande_id" uuid NOT NULL, "biologiste_id" uuid NOT NULL, "resultats" jsonb NOT NULL, "valeurs_critiques" boolean NOT NULL DEFAULT false, "date_validation" TIMESTAMP WITH TIME ZONE, "fichier_url" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6cd53a55c10e85a5d6ce01db42c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e68c5d1b04b8072176ab492bad" ON "clinic"."resultats_analyse" ("etablissement_id", "demande_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_6b60e96d4ece28aa40163cb8e4" ON "clinic"."resultats_analyse" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'resultats_analyse');
        await queryRunner.query(`CREATE TYPE "clinic"."demandes_analyse_statut_enum" AS ENUM('EN_ATTENTE', 'EN_COURS', 'TERMINEE', 'ANNULEE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."demandes_analyse" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "patient_id" uuid NOT NULL, "prescripteur_id" uuid NOT NULL, "type_analyse" character varying NOT NULL, "urgence" boolean NOT NULL DEFAULT false, "statut" "clinic"."demandes_analyse_statut_enum" NOT NULL DEFAULT 'EN_ATTENTE', "date_demande" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_01c9b42be0714e72f8c051c28f2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fbd01af19645bbc538255d4c47" ON "clinic"."demandes_analyse" ("etablissement_id", "statut") `);
        await queryRunner.query(`CREATE INDEX "IDX_edaaf4b1b10e325e93aed4630a" ON "clinic"."demandes_analyse" ("etablissement_id", "patient_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_543a685b43666122dcce371a5e" ON "clinic"."demandes_analyse" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'demandes_analyse');
        await queryRunner.query(`CREATE TYPE "clinic"."demandes_imagerie_statut_enum" AS ENUM('EN_ATTENTE', 'EN_COURS', 'TERMINEE', 'ANNULEE')`);
        await queryRunner.query(`CREATE TABLE "clinic"."demandes_imagerie" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "patient_id" uuid NOT NULL, "prescripteur_id" uuid NOT NULL, "type_examen" character varying NOT NULL, "urgence" boolean NOT NULL DEFAULT false, "statut" "clinic"."demandes_imagerie_statut_enum" NOT NULL DEFAULT 'EN_ATTENTE', "date_demande" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_ea4af5cb23a947068d5033bb3c7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_29599c1dd75e026a6d9f8eb485" ON "clinic"."demandes_imagerie" ("etablissement_id", "statut") `);
        await queryRunner.query(`CREATE INDEX "IDX_f663f35cfc1c39f64a0d9f9e08" ON "clinic"."demandes_imagerie" ("etablissement_id", "patient_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_ec1889de35f7d24d5707279544" ON "clinic"."demandes_imagerie" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'demandes_imagerie');
        await queryRunner.query(`CREATE TABLE "clinic"."comptes_rendus_imagerie" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "demande_id" uuid NOT NULL, "radiologue_id" uuid NOT NULL, "conclusion" text, "fichier_dicom_url" character varying, "date_validation" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_dbd93ebfa47759f1a39499fdd7b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d4020b1127f06ead001edae2db" ON "clinic"."comptes_rendus_imagerie" ("etablissement_id", "demande_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_dc49f6986f22f4649d43b9da48" ON "clinic"."comptes_rendus_imagerie" ("etablissement_id") `);
        await enableTenantRls(queryRunner, 'clinic', 'comptes_rendus_imagerie');
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"utilisateurs":0,"lits":0,"stockageMo":0}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"lits": 0, "stockageMo": 0, "utilisateurs": 0}'`);
        await disableTenantRls(queryRunner, 'clinic', 'comptes_rendus_imagerie');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_dc49f6986f22f4649d43b9da48"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_d4020b1127f06ead001edae2db"`);
        await queryRunner.query(`DROP TABLE "clinic"."comptes_rendus_imagerie"`);
        await disableTenantRls(queryRunner, 'clinic', 'demandes_imagerie');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_ec1889de35f7d24d5707279544"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_f663f35cfc1c39f64a0d9f9e08"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_29599c1dd75e026a6d9f8eb485"`);
        await queryRunner.query(`DROP TABLE "clinic"."demandes_imagerie"`);
        await queryRunner.query(`DROP TYPE "clinic"."demandes_imagerie_statut_enum"`);
        await disableTenantRls(queryRunner, 'clinic', 'demandes_analyse');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_543a685b43666122dcce371a5e"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_edaaf4b1b10e325e93aed4630a"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_fbd01af19645bbc538255d4c47"`);
        await queryRunner.query(`DROP TABLE "clinic"."demandes_analyse"`);
        await queryRunner.query(`DROP TYPE "clinic"."demandes_analyse_statut_enum"`);
        await disableTenantRls(queryRunner, 'clinic', 'resultats_analyse');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_6b60e96d4ece28aa40163cb8e4"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_e68c5d1b04b8072176ab492bad"`);
        await queryRunner.query(`DROP TABLE "clinic"."resultats_analyse"`);
        await disableTenantRls(queryRunner, 'clinic', 'administration_medicament');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_b69c8c6e25967a39b203f7f454"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_c6d24fc42a5d389ae85c48b518"`);
        await queryRunner.query(`DROP TABLE "clinic"."administration_medicament"`);
        await queryRunner.query(`DROP TYPE "clinic"."administration_medicament_statut_enum"`);
        await disableTenantRls(queryRunner, 'clinic', 'dispensations');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_fab25c6e26e5cb3ce7719fdfa0"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_2a96f3a2dbfdf0db1a6afeb74e"`);
        await queryRunner.query(`DROP TABLE "clinic"."dispensations"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_3d8435922e7ace504761fa3001"`);
        await queryRunner.query(`DROP TABLE "clinic"."medicaments_catalogue"`);
        await disableTenantRls(queryRunner, 'clinic', 'stock_medicament');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_c176a68bb48cefd37aa03f65eb"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_80df6e54c4c76be0dc6bf5ea20"`);
        await queryRunner.query(`DROP TABLE "clinic"."stock_medicament"`);
        await disableTenantRls(queryRunner, 'clinic', 'prescription_lignes');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_7d1cbb157baed780e64f2bcbd3"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_e5eba065f2e9666c626d804aad"`);
        await queryRunner.query(`DROP TABLE "clinic"."prescription_lignes"`);
        await disableTenantRls(queryRunner, 'clinic', 'prescriptions');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_ac2718e4d719e83bd182f144c0"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_fcdfa827c5f7af150f21f4b537"`);
        await queryRunner.query(`DROP TABLE "clinic"."prescriptions"`);
        await queryRunner.query(`DROP TYPE "clinic"."prescriptions_statut_enum"`);
    }

}
