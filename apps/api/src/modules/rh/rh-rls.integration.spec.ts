import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../database/data-source';

/**
 * Test d'isolation multi-tenant réel sur les 5 tables du module RH (Employe/ContratTravail/Conge/
 * Presence/Formation, prompt maître §10.4) — exige Postgres démarré (pnpm docker:dev:up).
 * Référence : docs/phase-0/strategie-isolation.md §7.
 */
describe('Isolation RLS — tables module RH (intégration Postgres réelle)', () => {
  const tables = ['employes', 'contrats_travail', 'conges', 'presences', 'formations'];
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

  describe('comportement (lecture/écriture) sur clinic.employes', () => {
    const etabA = randomUUID();
    const etabB = randomUUID();

    async function insertAs(etablissementId: string, matricule: string, nom: string): Promise<void> {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
      await queryRunner.query(
        `INSERT INTO "clinic"."employes" (etablissement_id, matricule, nom, prenom, poste, date_embauche)
         VALUES ($1, $2, $3, 'Test', 'Agent', now())`,
        [etablissementId, matricule, nom],
      );
      await queryRunner.commitTransaction();
      await queryRunner.release();
    }

    async function selectAllAs(etablissementId: string): Promise<Array<{ nom: string }>> {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
      const rows = await queryRunner.query(`SELECT nom FROM "clinic"."employes" WHERE etablissement_id = $1 OR true`, [
        etablissementId,
      ]);
      await queryRunner.commitTransaction();
      await queryRunner.release();
      return rows;
    }

    afterAll(async () => {
      await dataSource.query(`DELETE FROM "clinic"."employes" WHERE etablissement_id IN ($1, $2)`, [etabA, etabB]);
    });

    it("l'établissement A ne voit jamais l'employé créé par B, même sans WHERE explicite", async () => {
      await insertAs(etabA, `EMP-A-${randomUUID().slice(0, 8)}`, 'Employé A');
      await insertAs(etabB, `EMP-B-${randomUUID().slice(0, 8)}`, 'Employé B');

      const rowsForA = await selectAllAs(etabA);
      const rowsForB = await selectAllAs(etabB);

      expect(rowsForA.map((row) => row.nom)).toEqual(['Employé A']);
      expect(rowsForB.map((row) => row.nom)).toEqual(['Employé B']);
    });

    it('rejette un INSERT avec un etablissement_id falsifié (policy WITH CHECK)', async () => {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabA]);

      await expect(
        queryRunner.query(
          `INSERT INTO "clinic"."employes" (etablissement_id, matricule, nom, prenom, poste, date_embauche)
           VALUES ($1, $2, 'Frauduleux', 'Test', 'Agent', now())`,
          [etabB, `EMP-FRAUD-${randomUUID().slice(0, 8)}`],
        ),
      ).rejects.toThrow();

      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    });
  });

  describe('comportement (lecture/écriture) sur clinic.presences', () => {
    const etabA = randomUUID();
    const etabB = randomUUID();
    let employeA: string;
    let employeB: string;

    beforeAll(async () => {
      const queryRunnerA = dataSource.createQueryRunner();
      await queryRunnerA.connect();
      await queryRunnerA.startTransaction();
      await queryRunnerA.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabA]);
      const insertedA = await queryRunnerA.query(
        `INSERT INTO "clinic"."employes" (etablissement_id, matricule, nom, prenom, poste, date_embauche)
         VALUES ($1, $2, 'Présence A', 'Test', 'Agent', now()) RETURNING id`,
        [etabA, `EMP-PRES-A-${randomUUID().slice(0, 8)}`],
      );
      employeA = insertedA[0].id;
      await queryRunnerA.commitTransaction();
      await queryRunnerA.release();

      const queryRunnerB = dataSource.createQueryRunner();
      await queryRunnerB.connect();
      await queryRunnerB.startTransaction();
      await queryRunnerB.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabB]);
      const insertedB = await queryRunnerB.query(
        `INSERT INTO "clinic"."employes" (etablissement_id, matricule, nom, prenom, poste, date_embauche)
         VALUES ($1, $2, 'Présence B', 'Test', 'Agent', now()) RETURNING id`,
        [etabB, `EMP-PRES-B-${randomUUID().slice(0, 8)}`],
      );
      employeB = insertedB[0].id;
      await queryRunnerB.commitTransaction();
      await queryRunnerB.release();
    });

    afterAll(async () => {
      await dataSource.query(`DELETE FROM "clinic"."presences" WHERE etablissement_id IN ($1, $2)`, [etabA, etabB]);
      await dataSource.query(`DELETE FROM "clinic"."employes" WHERE etablissement_id IN ($1, $2)`, [etabA, etabB]);
    });

    it("l'établissement A ne voit jamais le pointage de l'établissement B", async () => {
      const queryRunnerA = dataSource.createQueryRunner();
      await queryRunnerA.connect();
      await queryRunnerA.startTransaction();
      await queryRunnerA.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabA]);
      await queryRunnerA.query(
        `INSERT INTO "clinic"."presences" (etablissement_id, employe_id, date, statut) VALUES ($1, $2, CURRENT_DATE, 'PRESENT')`,
        [etabA, employeA],
      );
      await queryRunnerA.commitTransaction();
      await queryRunnerA.release();

      const queryRunnerB = dataSource.createQueryRunner();
      await queryRunnerB.connect();
      await queryRunnerB.startTransaction();
      await queryRunnerB.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabB]);
      await queryRunnerB.query(
        `INSERT INTO "clinic"."presences" (etablissement_id, employe_id, date, statut) VALUES ($1, $2, CURRENT_DATE, 'PRESENT')`,
        [etabB, employeB],
      );
      const rowsForB = await queryRunnerB.query(`SELECT employe_id FROM "clinic"."presences"`);
      await queryRunnerB.commitTransaction();
      await queryRunnerB.release();

      expect(rowsForB).toHaveLength(1);
      expect(rowsForB[0].employe_id).toBe(employeB);
    });

    it('un seul pointage par jour par employé (contrainte unique etablissement_id, employe_id, date)', async () => {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabA]);
      await queryRunner.query(
        `INSERT INTO "clinic"."presences" (etablissement_id, employe_id, date, statut) VALUES ($1, $2, '2026-01-10', 'PRESENT')`,
        [etabA, employeA],
      );

      await expect(
        queryRunner.query(
          `INSERT INTO "clinic"."presences" (etablissement_id, employe_id, date, statut) VALUES ($1, $2, '2026-01-10', 'RETARD')`,
          [etabA, employeA],
        ),
      ).rejects.toThrow();

      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    });
  });
});
