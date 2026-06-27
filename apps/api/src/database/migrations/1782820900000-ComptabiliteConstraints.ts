import { MigrationInterface, QueryRunner } from "typeorm";

export class ComptabiliteConstraints1782820900000 implements MigrationInterface {
    name = 'ComptabiliteConstraints1782820900000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "clinic"."ecritures_comptables" ADD CONSTRAINT "UQ_ecritures_etab_journal_numero" UNIQUE ("etablissement_id", "journal_code", "numero")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "clinic"."ecritures_comptables" DROP CONSTRAINT "UQ_ecritures_etab_journal_numero"`);
    }
}
