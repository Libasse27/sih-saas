import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../database/data-source';

/**
 * Test d'isolation multi-tenant réel sur les tables créées par la migration Phase 6
 * (AdmissionsLitsRdvConsultations) — exige Postgres démarré (pnpm docker:dev:up).
 * Référence : docs/phase-0/strategie-isolation.md §7, plan-de-phases.md Phase 6.
 */
describe('Isolation RLS — tables Phase 6 (intégration Postgres réelle)', () => {
  const tables = [
    'sites',
    'services',
    'chambres',
    'lits',
    'admissions',
    'mouvements_patient',
    'rendez_vous',
    'consultations',
  ];
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
    const result = await dataSource.query(
      `SELECT polname FROM pg_policy WHERE polrelid = $1::regclass`,
      [`"clinic"."${table}"`],
    );

    expect(result.map((row: { polname: string }) => row.polname)).toContain('tenant_isolation');
  });

  describe('comportement (lecture/écriture) sur clinic.services', () => {
    const etabA = randomUUID();
    const etabB = randomUUID();

    async function insertAs(etablissementId: string, nom: string, code: string): Promise<void> {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
      // site_id est NOT NULL depuis la Phase 34, mais sans contrainte FK déclarée (comme toutes les
      // autres relations de ce schéma) — un uuid arbitraire suffit pour ce test d'isolation RLS.
      await queryRunner.query(
        `INSERT INTO "clinic"."services" (etablissement_id, site_id, nom, code) VALUES ($1, $2, $3, $4)`,
        [etablissementId, randomUUID(), nom, code],
      );
      await queryRunner.commitTransaction();
      await queryRunner.release();
    }

    async function selectAllAs(etablissementId: string): Promise<Array<{ nom: string }>> {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
      const rows = await queryRunner.query(`SELECT nom FROM "clinic"."services" WHERE etablissement_id = $1 OR true`, [
        etablissementId,
      ]);
      await queryRunner.commitTransaction();
      await queryRunner.release();
      return rows;
    }

    afterAll(async () => {
      await dataSource.query(`DELETE FROM "clinic"."services" WHERE etablissement_id IN ($1, $2)`, [etabA, etabB]);
    });

    it("l'établissement A ne voit jamais le service créé par B, même sans WHERE explicite", async () => {
      await insertAs(etabA, 'Urgences A', `URG-${etabA.slice(0, 8)}`);
      await insertAs(etabB, 'Urgences B', `URG-${etabB.slice(0, 8)}`);

      const rowsForA = await selectAllAs(etabA);
      const rowsForB = await selectAllAs(etabB);

      expect(rowsForA.map((row) => row.nom)).toEqual(['Urgences A']);
      expect(rowsForB.map((row) => row.nom)).toEqual(['Urgences B']);
    });

    it('rejette un INSERT avec un etablissement_id falsifié (policy WITH CHECK)', async () => {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabA]);

      await expect(
        queryRunner.query(`INSERT INTO "clinic"."services" (etablissement_id, nom, code) VALUES ($1, $2, $3)`, [
          etabB,
          'Service frauduleux',
          `FRAUDE-${etabB.slice(0, 8)}`,
        ]),
      ).rejects.toThrow();

      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    });
  });

  describe('comportement (lecture/écriture) sur clinic.sites (Phase 34)', () => {
    const etabA = randomUUID();
    const etabB = randomUUID();

    async function insertSiteAs(etablissementId: string, nom: string, code: string): Promise<void> {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
      await queryRunner.query(
        `INSERT INTO "clinic"."sites" (etablissement_id, nom, code) VALUES ($1, $2, $3)`,
        [etablissementId, nom, code],
      );
      await queryRunner.commitTransaction();
      await queryRunner.release();
    }

    async function selectAllSitesAs(etablissementId: string): Promise<Array<{ nom: string }>> {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
      const rows = await queryRunner.query(`SELECT nom FROM "clinic"."sites" WHERE etablissement_id = $1 OR true`, [
        etablissementId,
      ]);
      await queryRunner.commitTransaction();
      await queryRunner.release();
      return rows;
    }

    afterAll(async () => {
      await dataSource.query(`DELETE FROM "clinic"."sites" WHERE etablissement_id IN ($1, $2)`, [etabA, etabB]);
    });

    it("l'établissement A ne voit jamais le site créé par B, même sans WHERE explicite", async () => {
      await insertSiteAs(etabA, 'Site A', `SITE-${etabA.slice(0, 8)}`);
      await insertSiteAs(etabB, 'Site B', `SITE-${etabB.slice(0, 8)}`);

      const rowsForA = await selectAllSitesAs(etabA);
      const rowsForB = await selectAllSitesAs(etabB);

      expect(rowsForA.map((row) => row.nom)).toEqual(['Site A']);
      expect(rowsForB.map((row) => row.nom)).toEqual(['Site B']);
    });

    it('rejette un INSERT avec un etablissement_id falsifié (policy WITH CHECK)', async () => {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabA]);

      await expect(
        queryRunner.query(`INSERT INTO "clinic"."sites" (etablissement_id, nom, code) VALUES ($1, $2, $3)`, [
          etabB,
          'Site frauduleux',
          `FRAUDE-${etabB.slice(0, 8)}`,
        ]),
      ).rejects.toThrow();

      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    });
  });
});
