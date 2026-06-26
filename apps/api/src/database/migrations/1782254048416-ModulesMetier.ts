import { MigrationInterface, QueryRunner } from "typeorm";

export class ModulesMetier1782254048416 implements MigrationInterface {
    name = 'ModulesMetier1782254048416'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Restructuration taxonomie §10.4 : DME/RDV/ADMISSIONS/FACTURATION/IMAGERIE/TELEMEDECINE/API
        // disparaissent au profit de 15 modules métiers. Aucune valeur existante n'est mappable 1:1
        // automatiquement (regroupements/éclatements) — on vide la colonne des 3 plans seedés AVANT
        // l'ALTER TYPE (sinon le USING ci-dessous échoue, ces valeurs n'existeront plus dans le nouvel
        // enum), puis on repeuple à la fin de cette même migration avec les valeurs finales attendues.
        await queryRunner.query(`UPDATE "platform"."plans" SET "modules" = ARRAY[]::"platform"."plans_modules_enum"[] WHERE "code" IN ('STANDARD', 'PROFESSIONNEL', 'COMPLET')`);
        await queryRunner.query(`ALTER TYPE "platform"."plans_modules_enum" RENAME TO "plans_modules_enum_old"`);
        await queryRunner.query(`CREATE TYPE "platform"."plans_modules_enum" AS ENUM('ACCUEIL_ADMISSION', 'ADMINISTRATION_DIRECTION', 'BLOC_OPERATOIRE', 'COMPTABILITE_FACTURATION', 'CONSULTATIONS_MEDICALES', 'HOSPITALISATION', 'IMAGERIE_MEDICALE', 'KINESITHERAPIE_READAPTATION', 'LABORATOIRE', 'LOGISTIQUE_STOCK', 'PHARMACIE', 'RH', 'SECURITE_CONFORMITE', 'URGENCES', 'TABLEAU_DE_BORD_STATISTIQUES')`);
        await queryRunner.query(`ALTER TABLE "platform"."plans" ALTER COLUMN "modules" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "platform"."plans" ALTER COLUMN "modules" TYPE "platform"."plans_modules_enum"[] USING "modules"::"text"::"platform"."plans_modules_enum"[]`);
        await queryRunner.query(`ALTER TABLE "platform"."plans" ALTER COLUMN "modules" SET DEFAULT '{}'`);
        await queryRunner.query(`DROP TYPE "platform"."plans_modules_enum_old"`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"utilisateurs":0,"lits":0,"stockageMo":0}'`);

        // Migration auto-suffisante (le seed plans.seed.ts est SKIP si le `code` existe déjà — il ne
        // repeuplera donc jamais ces 3 lignes vidées ci-dessus). Mêmes listes que plans.seed.ts §10.4.
        await queryRunner.query(`
            UPDATE "platform"."plans" SET "modules" = ARRAY[
                'ACCUEIL_ADMISSION', 'CONSULTATIONS_MEDICALES', 'HOSPITALISATION', 'ADMINISTRATION_DIRECTION', 'LOGISTIQUE_STOCK'
            ]::"platform"."plans_modules_enum"[] WHERE "code" = 'STANDARD'
        `);
        await queryRunner.query(`
            UPDATE "platform"."plans" SET "modules" = ARRAY[
                'ACCUEIL_ADMISSION', 'CONSULTATIONS_MEDICALES', 'HOSPITALISATION', 'ADMINISTRATION_DIRECTION', 'LOGISTIQUE_STOCK',
                'URGENCES', 'PHARMACIE', 'LABORATOIRE', 'IMAGERIE_MEDICALE', 'COMPTABILITE_FACTURATION', 'RH', 'TABLEAU_DE_BORD_STATISTIQUES'
            ]::"platform"."plans_modules_enum"[] WHERE "code" = 'PROFESSIONNEL'
        `);
        await queryRunner.query(`
            UPDATE "platform"."plans" SET "modules" = ARRAY[
                'ACCUEIL_ADMISSION', 'ADMINISTRATION_DIRECTION', 'BLOC_OPERATOIRE', 'COMPTABILITE_FACTURATION', 'CONSULTATIONS_MEDICALES',
                'HOSPITALISATION', 'IMAGERIE_MEDICALE', 'KINESITHERAPIE_READAPTATION', 'LABORATOIRE', 'LOGISTIQUE_STOCK',
                'PHARMACIE', 'RH', 'SECURITE_CONFORMITE', 'URGENCES', 'TABLEAU_DE_BORD_STATISTIQUES'
            ]::"platform"."plans_modules_enum"[] WHERE "code" = 'COMPLET'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Rollback destructif sur `modules` (symétrique du `up`) : aucune valeur des 15 modules
        // métiers n'est mappable vers les 10 anciennes, on vide avant l'ALTER TYPE plutôt que de
        // tenter un USING qui échouerait sur des valeurs inconnues du type cible.
        await queryRunner.query(`UPDATE "platform"."plans" SET "modules" = ARRAY[]::"platform"."plans_modules_enum"[]`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"lits": 0, "stockageMo": 0, "utilisateurs": 0}'`);
        await queryRunner.query(`CREATE TYPE "platform"."plans_modules_enum_old" AS ENUM('ADMISSIONS', 'API', 'DME', 'FACTURATION', 'IMAGERIE', 'LABORATOIRE', 'PHARMACIE', 'RDV', 'TELEMEDECINE', 'URGENCES')`);
        await queryRunner.query(`ALTER TABLE "platform"."plans" ALTER COLUMN "modules" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "platform"."plans" ALTER COLUMN "modules" TYPE "platform"."plans_modules_enum_old"[] USING "modules"::"text"::"platform"."plans_modules_enum_old"[]`);
        await queryRunner.query(`ALTER TABLE "platform"."plans" ALTER COLUMN "modules" SET DEFAULT '{}'`);
        await queryRunner.query(`DROP TYPE "platform"."plans_modules_enum"`);
        await queryRunner.query(`ALTER TYPE "platform"."plans_modules_enum_old" RENAME TO "plans_modules_enum"`);
    }

}
