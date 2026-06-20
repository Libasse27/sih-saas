import { MigrationInterface, QueryRunner } from "typeorm";

export class CouponsPromotionsSettings1781970048992 implements MigrationInterface {
    name = 'CouponsPromotionsSettings1781970048992'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "platform"."settings" ("id" uuid NOT NULL, "email" jsonb NOT NULL, "paiements" jsonb NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0669fe20e252eb692bf4d344975" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "platform"."promotions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nom" character varying NOT NULL, "description" text, "regle" jsonb NOT NULL DEFAULT '{}', "periode_debut" TIMESTAMP WITH TIME ZONE NOT NULL, "periode_fin" TIMESTAMP WITH TIME ZONE NOT NULL, "actif" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_380cecbbe3ac11f0e5a7c452c34" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "platform"."coupons_type_reduction_enum" AS ENUM('POURCENTAGE', 'MONTANT_FIXE')`);
        await queryRunner.query(`CREATE TABLE "platform"."coupons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "type_reduction" "platform"."coupons_type_reduction_enum" NOT NULL, "valeur" numeric NOT NULL, "description" text, "plan_ids" uuid array, "date_debut" TIMESTAMP WITH TIME ZONE NOT NULL, "date_fin" TIMESTAMP WITH TIME ZONE NOT NULL, "limite_utilisation" integer NOT NULL DEFAULT '-1', "utilisations_count" integer NOT NULL DEFAULT '0', "actif" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_e025109230e82925843f2a14c48" UNIQUE ("code"), CONSTRAINT "PK_d7ea8864a0150183770f3e9a8cb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "platform"."payments" ADD "coupon_code" character varying`);
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"utilisateurs":0,"lits":0,"stockageMo":0}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "platform"."etablissements" ALTER COLUMN "usage" SET DEFAULT '{"lits": 0, "stockageMo": 0, "utilisateurs": 0}'`);
        await queryRunner.query(`ALTER TABLE "platform"."payments" DROP COLUMN "coupon_code"`);
        await queryRunner.query(`DROP TABLE "platform"."coupons"`);
        await queryRunner.query(`DROP TYPE "platform"."coupons_type_reduction_enum"`);
        await queryRunner.query(`DROP TABLE "platform"."promotions"`);
        await queryRunner.query(`DROP TABLE "platform"."settings"`);
    }

}
