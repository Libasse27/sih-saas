import { MigrationInterface, QueryRunner } from "typeorm";
import { disableTenantRls, enableTenantRls } from "../utils/enable-tenant-rls.util";

export class Sites1782083843866 implements MigrationInterface {
    name = 'Sites1782083843866'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "clinic"."sites" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "nom" character varying NOT NULL, "code" character varying NOT NULL, "adresse" character varying, "ville" character varying, "telephone" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_clinic_sites" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_sites_etablissement_code" ON "clinic"."sites" ("etablissement_id", "code") `);
        await queryRunner.query(`CREATE INDEX "IDX_sites_etablissement" ON "clinic"."sites" ("etablissement_id") `);

        // RLS sur clinic.* est FORCE (voir enable-tenant-rls.util.ts) : elle s'applique donc même au
        // rôle propriétaire qui exécute cette migration, et aucun app.current_tenant_id n'est jamais
        // positionné pendant une migration — sans ce désactivage temporaire, les SELECT/UPDATE/INSERT
        // de backfill ci-dessous ne verraient AUCUNE ligne (filtrage RLS silencieux), laissant tous les
        // site_id à NULL et faisant échouer le SET NOT NULL plus bas dès qu'au moins un établissement
        // réel existe déjà (jamais détecté par la CI, dont la base est toujours vide à ce stade).
        await disableTenantRls(queryRunner, 'clinic', 'services');
        await disableTenantRls(queryRunner, 'clinic', 'chambres');
        await disableTenantRls(queryRunner, 'clinic', 'lits');

        // Backfill : un "Site principal" par établissement ayant déjà au moins un service — aucun
        // établissement existant ne doit rester sans site une fois site_id rendu NOT NULL ci-dessous.
        await queryRunner.query(`
            INSERT INTO "clinic"."sites" ("etablissement_id", "nom", "code")
            SELECT DISTINCT "etablissement_id", 'Site principal', 'PRINCIPAL' FROM "clinic"."services"
        `);

        await queryRunner.query(`ALTER TABLE "clinic"."services" ADD "site_id" uuid`);
        await queryRunner.query(`
            UPDATE "clinic"."services" s SET "site_id" = (
                SELECT "id" FROM "clinic"."sites" WHERE "etablissement_id" = s."etablissement_id" LIMIT 1
            )
        `);
        await queryRunner.query(`ALTER TABLE "clinic"."services" ALTER COLUMN "site_id" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_services_etablissement_site" ON "clinic"."services" ("etablissement_id", "site_id") `);

        await queryRunner.query(`ALTER TABLE "clinic"."chambres" ADD "site_id" uuid`);
        await queryRunner.query(`
            UPDATE "clinic"."chambres" c SET "site_id" = (
                SELECT "site_id" FROM "clinic"."services" WHERE "id" = c."service_id"
            )
        `);
        await queryRunner.query(`ALTER TABLE "clinic"."chambres" ALTER COLUMN "site_id" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_chambres_etablissement_site" ON "clinic"."chambres" ("etablissement_id", "site_id") `);

        await queryRunner.query(`ALTER TABLE "clinic"."lits" ADD "site_id" uuid`);
        await queryRunner.query(`
            UPDATE "clinic"."lits" l SET "site_id" = (
                SELECT "site_id" FROM "clinic"."chambres" WHERE "id" = l."chambre_id"
            )
        `);
        await queryRunner.query(`ALTER TABLE "clinic"."lits" ALTER COLUMN "site_id" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_lits_etablissement_site" ON "clinic"."lits" ("etablissement_id", "site_id") `);

        await enableTenantRls(queryRunner, 'clinic', 'services');
        await enableTenantRls(queryRunner, 'clinic', 'chambres');
        await enableTenantRls(queryRunner, 'clinic', 'lits');
        await enableTenantRls(queryRunner, 'clinic', 'sites');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "clinic"."IDX_lits_etablissement_site"`);
        await queryRunner.query(`ALTER TABLE "clinic"."lits" DROP COLUMN "site_id"`);

        await queryRunner.query(`DROP INDEX "clinic"."IDX_chambres_etablissement_site"`);
        await queryRunner.query(`ALTER TABLE "clinic"."chambres" DROP COLUMN "site_id"`);

        await queryRunner.query(`DROP INDEX "clinic"."IDX_services_etablissement_site"`);
        await queryRunner.query(`ALTER TABLE "clinic"."services" DROP COLUMN "site_id"`);

        await disableTenantRls(queryRunner, 'clinic', 'sites');
        await queryRunner.query(`DROP INDEX "clinic"."IDX_sites_etablissement"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_sites_etablissement_code"`);
        await queryRunner.query(`DROP TABLE "clinic"."sites"`);
    }

}
