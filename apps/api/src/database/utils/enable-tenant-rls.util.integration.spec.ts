import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { disableTenantRls, enableTenantRls } from './enable-tenant-rls.util';

/**
 * Test d'isolation multi-tenant réel (pas de mock) — exige Postgres démarré (pnpm docker:dev:up).
 * Référence : docs/phase-0/strategie-isolation.md §6 (tests d'isolation obligatoires).
 */
describe('enableTenantRls (intégration Postgres réelle)', () => {
  const schema = 'clinic';
  const table = 'phase2_isolation_test';
  const qualified = `"${schema}"."${table}"`;
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({ ...dataSourceOptions, entities: [], migrations: [] });
    await dataSource.initialize();
    await dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await dataSource.query(`
      CREATE TABLE ${qualified} (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        etablissement_id uuid NOT NULL,
        label text NOT NULL,
        CONSTRAINT pk_phase2_isolation_test PRIMARY KEY (id)
      )
    `);

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await enableTenantRls(queryRunner, schema, table);
    await queryRunner.release();
  });

  afterAll(async () => {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await disableTenantRls(queryRunner, schema, table);
    await queryRunner.release();
    await dataSource.query(`DROP TABLE IF EXISTS ${qualified}`);
    await dataSource.destroy();
  });

  async function insertAs(etablissementId: string, label: string): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
    await queryRunner.query(`INSERT INTO ${qualified} (etablissement_id, label) VALUES ($1, $2)`, [
      etablissementId,
      label,
    ]);
    await queryRunner.commitTransaction();
    await queryRunner.release();
  }

  async function selectAllAs(etablissementId: string): Promise<Array<{ label: string }>> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
    const rows = await queryRunner.query(`SELECT label FROM ${qualified}`);
    await queryRunner.commitTransaction();
    await queryRunner.release();
    return rows;
  }

  const etabA = randomUUID();
  const etabB = randomUUID();

  it("isole les lectures : l'établissement A ne voit jamais les lignes de B", async () => {
    await insertAs(etabA, 'ligne-A');
    await insertAs(etabB, 'ligne-B');

    const rowsForA = await selectAllAs(etabA);
    const rowsForB = await selectAllAs(etabB);

    expect(rowsForA.map((row) => row.label)).toEqual(['ligne-A']);
    expect(rowsForB.map((row) => row.label)).toEqual(['ligne-B']);
  });

  it('rejette une tentative d’INSERT avec un etablissement_id falsifié (policy WITH CHECK)', async () => {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabA]);

    await expect(
      queryRunner.query(`INSERT INTO ${qualified} (etablissement_id, label) VALUES ($1, $2)`, [
        etabB,
        'tentative-frauduleuse',
      ]),
    ).rejects.toThrow();

    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  });

  it('sans contexte tenant positionné, aucune ligne visible (fail-closed par défaut)', async () => {
    const rows = await dataSource.query(`SELECT label FROM ${qualified}`);
    expect(rows).toEqual([]);
  });

  it('FORCE ROW LEVEL SECURITY s’applique même au rôle propriétaire de la table', async () => {
    const result = await dataSource.query(
      `SELECT relforcerowsecurity FROM pg_class WHERE oid = $1::regclass`,
      [qualified],
    );
    expect(result[0].relforcerowsecurity).toBe(true);
  });
});
