import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../database/data-source';

/**
 * Test d'isolation multi-tenant réel sur les tables créées par la migration Phase 11
 * (ApiKeysAndModulesSupport) — exige Postgres démarré (pnpm docker:dev:up). `platform.api_keys`
 * n'a volontairement pas de RLS (même convention que `platform.users`, voir api-key.entity.ts) et
 * n'est donc pas couverte ici.
 * Référence : docs/phase-0/strategie-isolation.md §7, plan-de-phases.md Phase 11.
 */
describe('Isolation RLS — tables Phase 11 (intégration Postgres réelle)', () => {
  const tables = ['cycles_sterilisation', 'notes_sociales', 'demandes_maintenance', 'articles_stock'];
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

  describe('comportement (lecture/écriture) sur clinic.articles_stock', () => {
    const etabA = randomUUID();
    const etabB = randomUUID();

    async function insertAs(etablissementId: string, nom: string): Promise<void> {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
      await queryRunner.query(
        `INSERT INTO "clinic"."articles_stock" (etablissement_id, nom, quantite, seuil_alerte, unite) VALUES ($1, $2, $3, $4, $5)`,
        [etablissementId, nom, 10, 5, 'boîte'],
      );
      await queryRunner.commitTransaction();
      await queryRunner.release();
    }

    async function selectAllAs(etablissementId: string): Promise<Array<{ nom: string }>> {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
      const rows = await queryRunner.query(`SELECT nom FROM "clinic"."articles_stock" WHERE etablissement_id = $1 OR true`, [
        etablissementId,
      ]);
      await queryRunner.commitTransaction();
      await queryRunner.release();
      return rows;
    }

    afterAll(async () => {
      await dataSource.query(`DELETE FROM "clinic"."articles_stock" WHERE etablissement_id IN ($1, $2)`, [etabA, etabB]);
    });

    it("l'établissement A ne voit jamais l'article créé par B, même sans WHERE explicite", async () => {
      await insertAs(etabA, 'Gants A');
      await insertAs(etabB, 'Gants B');

      const rowsForA = await selectAllAs(etabA);
      const rowsForB = await selectAllAs(etabB);

      expect(rowsForA.map((row) => row.nom)).toEqual(['Gants A']);
      expect(rowsForB.map((row) => row.nom)).toEqual(['Gants B']);
    });

    it('rejette un INSERT avec un etablissement_id falsifié (policy WITH CHECK)', async () => {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabA]);

      await expect(
        queryRunner.query(
          `INSERT INTO "clinic"."articles_stock" (etablissement_id, nom, quantite, seuil_alerte, unite) VALUES ($1, $2, $3, $4, $5)`,
          [etabB, 'Article frauduleux', 1, 0, 'unité'],
        ),
      ).rejects.toThrow();

      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    });
  });
});
