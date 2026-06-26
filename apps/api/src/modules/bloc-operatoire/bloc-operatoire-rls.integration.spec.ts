import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../database/data-source';

/**
 * Test d'isolation multi-tenant réel sur les 6 tables du module Bloc Opératoire (SalleOperation/
 * Intervention/EquipeOperatoire/Anesthesie/CompteRenduOperatoire/ConsommableIntervention, prompt
 * maître §10.4) — exige Postgres démarré (pnpm docker:dev:up) et la migration appliquée.
 * Référence : docs/phase-0/strategie-isolation.md §7.
 */
describe('Isolation RLS — tables module Bloc Opératoire (intégration Postgres réelle)', () => {
  const tables = [
    'salles_operation',
    'interventions',
    'equipes_operatoire',
    'anesthesies',
    'comptes_rendus_operatoires',
    'consommables_intervention',
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
    const result = await dataSource.query(`SELECT polname FROM pg_policy WHERE polrelid = $1::regclass`, [
      `"clinic"."${table}"`,
    ]);

    expect(result.map((row: { polname: string }) => row.polname)).toContain('tenant_isolation');
  });

  describe('comportement (lecture/écriture) sur clinic.salles_operation', () => {
    const etabA = randomUUID();
    const etabB = randomUUID();

    async function insertAs(etablissementId: string, nom: string): Promise<void> {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
      await queryRunner.query(
        `INSERT INTO "clinic"."salles_operation" (etablissement_id, nom, statut) VALUES ($1, $2, 'LIBRE')`,
        [etablissementId, nom],
      );
      await queryRunner.commitTransaction();
      await queryRunner.release();
    }

    async function selectAllAs(etablissementId: string): Promise<Array<{ nom: string }>> {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
      const rows = await queryRunner.query(`SELECT nom FROM "clinic"."salles_operation" WHERE etablissement_id = $1 OR true`, [
        etablissementId,
      ]);
      await queryRunner.commitTransaction();
      await queryRunner.release();
      return rows;
    }

    afterAll(async () => {
      await dataSource.query(`DELETE FROM "clinic"."salles_operation" WHERE etablissement_id IN ($1, $2)`, [etabA, etabB]);
    });

    it("l'établissement A ne voit jamais la salle créée par B, même sans WHERE explicite", async () => {
      await insertAs(etabA, 'Salle A1');
      await insertAs(etabB, 'Salle B1');

      const rowsForA = await selectAllAs(etabA);
      const rowsForB = await selectAllAs(etabB);

      expect(rowsForA.map((row) => row.nom)).toEqual(['Salle A1']);
      expect(rowsForB.map((row) => row.nom)).toEqual(['Salle B1']);
    });

    it('rejette un INSERT avec un etablissement_id falsifié (policy WITH CHECK)', async () => {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabA]);

      await expect(
        queryRunner.query(`INSERT INTO "clinic"."salles_operation" (etablissement_id, nom, statut) VALUES ($1, 'Frauduleuse', 'LIBRE')`, [
          etabB,
        ]),
      ).rejects.toThrow();

      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    });
  });

  describe('comportement (lecture/écriture) sur clinic.interventions', () => {
    const etabA = randomUUID();
    const etabB = randomUUID();
    let salleA: string;
    let salleB: string;

    beforeAll(async () => {
      const queryRunnerA = dataSource.createQueryRunner();
      await queryRunnerA.connect();
      await queryRunnerA.startTransaction();
      await queryRunnerA.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabA]);
      const insertedA = await queryRunnerA.query(
        `INSERT INTO "clinic"."salles_operation" (etablissement_id, nom, statut) VALUES ($1, 'Salle Interv A', 'LIBRE') RETURNING id`,
        [etabA],
      );
      salleA = insertedA[0].id;
      await queryRunnerA.commitTransaction();
      await queryRunnerA.release();

      const queryRunnerB = dataSource.createQueryRunner();
      await queryRunnerB.connect();
      await queryRunnerB.startTransaction();
      await queryRunnerB.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabB]);
      const insertedB = await queryRunnerB.query(
        `INSERT INTO "clinic"."salles_operation" (etablissement_id, nom, statut) VALUES ($1, 'Salle Interv B', 'LIBRE') RETURNING id`,
        [etabB],
      );
      salleB = insertedB[0].id;
      await queryRunnerB.commitTransaction();
      await queryRunnerB.release();
    });

    afterAll(async () => {
      await dataSource.query(`DELETE FROM "clinic"."interventions" WHERE etablissement_id IN ($1, $2)`, [etabA, etabB]);
      await dataSource.query(`DELETE FROM "clinic"."salles_operation" WHERE etablissement_id IN ($1, $2)`, [etabA, etabB]);
    });

    it("l'établissement A ne voit jamais l'intervention planifiée par B", async () => {
      const checklist = JSON.stringify({
        signIn: { valide: false, valideParId: null, valideLe: null },
        timeOut: { valide: false, valideParId: null, valideLe: null },
        signOut: { valide: false, valideParId: null, valideLe: null },
      });

      const queryRunnerA = dataSource.createQueryRunner();
      await queryRunnerA.connect();
      await queryRunnerA.startTransaction();
      await queryRunnerA.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabA]);
      await queryRunnerA.query(
        `INSERT INTO "clinic"."interventions"
           (etablissement_id, patient_id, salle_operation_id, chirurgien_principal_id, type_intervention, statut, date_heure_prevue, checklist_oms)
         VALUES ($1, $2, $3, $2, 'Appendicectomie', 'PLANIFIEE', now(), $4::jsonb)`,
        [etabA, randomUUID(), salleA, checklist],
      );
      await queryRunnerA.commitTransaction();
      await queryRunnerA.release();

      const queryRunnerB = dataSource.createQueryRunner();
      await queryRunnerB.connect();
      await queryRunnerB.startTransaction();
      await queryRunnerB.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabB]);
      const rowsForB = await queryRunnerB.query(`SELECT id FROM "clinic"."interventions"`);
      await queryRunnerB.commitTransaction();
      await queryRunnerB.release();

      expect(rowsForB).toHaveLength(0);
      void salleB;
    });
  });
});
