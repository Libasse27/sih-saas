import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../database/data-source';

/**
 * Test d'isolation multi-tenant réel sur les tables créées par la migration Phase 8
 * (FacturationPatient) — exige Postgres démarré (pnpm docker:dev:up). Les 3 tables sont tenant
 * (à la différence de clinic.medicaments_catalogue en Phase 7) : aucune exception cette fois.
 * Référence : docs/phase-0/strategie-isolation.md §7, plan-de-phases.md Phase 8.
 */
describe('Isolation RLS — tables Phase 8 (intégration Postgres réelle)', () => {
  const tables = ['assurances', 'factures_patient', 'paiements_patient'];
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({ ...dataSourceOptions, entities: [], migrations: [] });
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it.each(tables)('"clinic"."%s" a RLS activée et forcée', async (table) => {
    const result = await dataSource.query(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = $1::regclass`,
      [`"clinic"."${table}"`],
    );

    expect(result[0].relrowsecurity).toBe(true);
    expect(result[0].relforcerowsecurity).toBe(true);
  });

  it.each(tables)('"clinic"."%s" porte la policy tenant_isolation', async (table) => {
    const result = await dataSource.query(`SELECT polname FROM pg_policy WHERE polrelid = $1::regclass`, [
      `"clinic"."${table}"`,
    ]);

    expect(result.map((row: { polname: string }) => row.polname)).toContain('tenant_isolation');
  });

  describe('comportement (lecture/écriture) sur clinic.factures_patient', () => {
    const etabA = randomUUID();
    const etabB = randomUUID();

    async function insertAs(etablissementId: string, numero: string): Promise<void> {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
      await queryRunner.query(
        `INSERT INTO "clinic"."factures_patient"
           (etablissement_id, patient_id, numero, lignes, montant_total, part_assurance, part_patient, date_emission)
         VALUES ($1, $2, $3, '[]'::jsonb, 1000, 0, 1000, now())`,
        [etablissementId, randomUUID(), numero],
      );
      await queryRunner.commitTransaction();
      await queryRunner.release();
    }

    async function countAs(etablissementId: string): Promise<number> {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
      const rows = await queryRunner.query(`SELECT id FROM "clinic"."factures_patient"`);
      await queryRunner.commitTransaction();
      await queryRunner.release();
      return rows.length;
    }

    afterAll(async () => {
      await dataSource.query(`DELETE FROM "clinic"."factures_patient" WHERE etablissement_id IN ($1, $2)`, [
        etabA,
        etabB,
      ]);
    });

    it("l'établissement A ne voit jamais les factures de l'établissement B", async () => {
      await insertAs(etabA, `HMS-FACT-2026-${randomUUID().slice(0, 6)}`);
      await insertAs(etabB, `CLIN-FACT-2026-${randomUUID().slice(0, 6)}`);

      expect(await countAs(etabA)).toBe(1);
      expect(await countAs(etabB)).toBe(1);
    });

    it('rejette un INSERT avec un etablissement_id falsifié (policy WITH CHECK)', async () => {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabA]);

      await expect(
        queryRunner.query(
          `INSERT INTO "clinic"."factures_patient"
             (etablissement_id, patient_id, numero, lignes, montant_total, part_assurance, part_patient, date_emission)
           VALUES ($1, $2, $3, '[]'::jsonb, 1000, 0, 1000, now())`,
          [etabB, randomUUID(), `FRAUDE-${randomUUID().slice(0, 6)}`],
        ),
      ).rejects.toThrow();

      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    });
  });
});
