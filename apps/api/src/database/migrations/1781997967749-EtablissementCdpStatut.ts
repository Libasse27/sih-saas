import { MigrationInterface, QueryRunner } from "typeorm";

export class EtablissementCdpStatut1781997967749 implements MigrationInterface {
    name = 'EtablissementCdpStatut1781997967749'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "platform"."etablissements_statut_cdp_enum" AS ENUM('NON_INITIEE', 'DEMANDE_SOUMISE', 'AUTORISEE', 'REFUSEE', 'RETIREE')`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ADD "statut_cdp" "platform"."etablissements_statut_cdp_enum" NOT NULL DEFAULT 'NON_INITIEE'`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ADD "numero_recepisse_cdp" character varying`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ADD "date_demande_cdp" date`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ADD "date_decision_cdp" date`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ADD "commentaire_cdp" text`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"utilisateurs":0,"lits":0,"stockageMo":0}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"lits": 0, "stockageMo": 0, "utilisateurs": 0}'`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" DROP COLUMN "commentaire_cdp"`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" DROP COLUMN "date_decision_cdp"`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" DROP COLUMN "date_demande_cdp"`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" DROP COLUMN "numero_recepisse_cdp"`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" DROP COLUMN "statut_cdp"`);
        await queryRunner.query(`DROP TYPE "platform"."etablissements_statut_cdp_enum"`);
    }

}
