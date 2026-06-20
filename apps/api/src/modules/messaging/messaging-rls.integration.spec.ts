import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../database/data-source';

/**
 * Test d'isolation multi-tenant réel sur les tables créées par la migration Phase 14
 * (MessagingAndPushNotifications) — exige Postgres démarré (pnpm docker:dev:up). `platform.device_tokens`
 * n'a volontairement pas de RLS (même convention que `platform.users`) et n'est donc pas couverte ici.
 */
describe('Isolation RLS — tables Phase 14 (intégration Postgres réelle)', () => {
  const tables = ['conversations', 'messages'];
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({ ...dataSourceOptions, entities: [], migrations: [] });
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it.each(tables)('"clinic"."%s" a RLS activée et forcée (FORCE ROW LEVEL SECURITY)', async (table) => {
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

  describe('comportement (lecture/écriture) sur clinic.conversations', () => {
    const etabA = randomUUID();
    const etabB = randomUUID();

    async function insertAs(etablissementId: string, patientId: string, praticienId: string): Promise<void> {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
      await queryRunner.query(
        `INSERT INTO "clinic"."conversations" (etablissement_id, patient_id, praticien_id) VALUES ($1, $2, $3)`,
        [etablissementId, patientId, praticienId],
      );
      await queryRunner.commitTransaction();
      await queryRunner.release();
    }

    async function selectAllAs(etablissementId: string): Promise<Array<{ patient_id: string }>> {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
      const rows = await queryRunner.query(`SELECT patient_id FROM "clinic"."conversations" WHERE etablissement_id = $1 OR true`, [
        etablissementId,
      ]);
      await queryRunner.commitTransaction();
      await queryRunner.release();
      return rows;
    }

    afterAll(async () => {
      await dataSource.query(`DELETE FROM "clinic"."conversations" WHERE etablissement_id IN ($1, $2)`, [etabA, etabB]);
    });

    it("l'établissement A ne voit jamais la conversation créée par B, même sans WHERE explicite", async () => {
      const patientA = randomUUID();
      const patientB = randomUUID();
      await insertAs(etabA, patientA, randomUUID());
      await insertAs(etabB, patientB, randomUUID());

      const rowsForA = await selectAllAs(etabA);
      const rowsForB = await selectAllAs(etabB);

      expect(rowsForA.map((row) => row.patient_id)).toEqual([patientA]);
      expect(rowsForB.map((row) => row.patient_id)).toEqual([patientB]);
    });

    it('rejette un INSERT avec un etablissement_id falsifié (policy WITH CHECK)', async () => {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabA]);

      await expect(
        queryRunner.query(`INSERT INTO "clinic"."conversations" (etablissement_id, patient_id, praticien_id) VALUES ($1, $2, $3)`, [
          etabB,
          randomUUID(),
          randomUUID(),
        ]),
      ).rejects.toThrow();

      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    });
  });
});
