import { MigrationInterface, QueryRunner } from "typeorm";

export class Patients1781778818243 implements MigrationInterface {
    name = 'Patients1781778818243'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "clinic"`);
        await queryRunner.query(`CREATE TYPE "clinic"."patients_sexe_enum" AS ENUM('M', 'F')`);
        await queryRunner.query(`CREATE TABLE "clinic"."patients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "etablissement_id" uuid NOT NULL, "idh" character varying NOT NULL, "user_id" uuid, "nom" character varying NOT NULL, "prenom" character varying NOT NULL, "date_naissance" date NOT NULL, "sexe" "clinic"."patients_sexe_enum" NOT NULL, "telephone" character varying, "adresse" character varying, "assurance_id" uuid, "contact_urgence" jsonb, "consentements" jsonb NOT NULL DEFAULT '[]', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_a7f0b9fcbb3469d5ec0b0aceaa7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3c7680603746d1bcf9c827c5af" ON "clinic"."patients" ("etablissement_id") `);
        // IDH unique PAR établissement (pas globalement) — voir docs/phase-0/modele-de-donnees.md §2.2.
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_patients_etablissement_idh" ON "clinic"."patients" ("etablissement_id", "idh") `);

        // RLS réelle — premier usage concret de ce mécanisme (Phase 2). NULLIF indispensable :
        // voir docs/phase-0/strategie-isolation.md et enable-tenant-rls.util.ts.
        await queryRunner.query(`ALTER TABLE "clinic"."patients" ENABLE ROW LEVEL SECURITY`);
        await queryRunner.query(`ALTER TABLE "clinic"."patients" FORCE ROW LEVEL SECURITY`);
        await queryRunner.query(`
            CREATE POLICY tenant_isolation ON "clinic"."patients"
              USING (etablissement_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
              WITH CHECK (etablissement_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
        `);

        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ADD "code" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ADD CONSTRAINT "UQ_dcfcbe8c079176589bb0ca607b1" UNIQUE ("code")`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ADD "compteurs" jsonb NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"utilisateurs":0,"lits":0,"stockageMo":0}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"lits": 0, "stockageMo": 0, "utilisateurs": 0}'`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" DROP COLUMN "compteurs"`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" DROP CONSTRAINT "UQ_dcfcbe8c079176589bb0ca607b1"`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" DROP COLUMN "code"`);

        await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation ON "clinic"."patients"`);
        await queryRunner.query(`ALTER TABLE "clinic"."patients" NO FORCE ROW LEVEL SECURITY`);
        await queryRunner.query(`ALTER TABLE "clinic"."patients" DISABLE ROW LEVEL SECURITY`);

        await queryRunner.query(`DROP INDEX "clinic"."IDX_patients_etablissement_idh"`);
        await queryRunner.query(`DROP INDEX "clinic"."IDX_3c7680603746d1bcf9c827c5af"`);
        await queryRunner.query(`DROP TABLE "clinic"."patients"`);
        await queryRunner.query(`DROP TYPE "clinic"."patients_sexe_enum"`);
    }

}
