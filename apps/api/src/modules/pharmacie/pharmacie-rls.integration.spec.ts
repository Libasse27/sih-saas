import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../database/data-source';

/**
 * Test d'isolation multi-tenant réel sur les tables créées par la migration Phase 7
 * (PrescriptionPharmacieLaboImagerie) — exige Postgres démarré (pnpm docker:dev:up).
 * Référence : docs/phase-0/strategie-isolation.md §7, plan-de-phases.md Phase 7.
 */
describe('Isolation RLS — tables Phase 7 (intégration Postgres réelle)', () => {
  const tablesAvecRls = [
    'prescriptions',
    'prescription_lignes',
    'stock_medicament',
    'dispensations',
    'administration_medicament',
    'resultats_analyse',
    'demandes_analyse',
    'demandes_imagerie',
    'comptes_rendus_imagerie',
  ];
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({ ...dataSourceOptions, entities: [], migrations: [] });
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it.each(tablesAvecRls)('"clinic"."%s" a RLS activée et forcée', async (table) => {
    const result = await dataSource.query(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = $1::regclass`,
      [`"clinic"."${table}"`],
    );

    expect(result[0].relrowsecurity).toBe(true);
    expect(result[0].relforcerowsecurity).toBe(true);
  });

  it.each(tablesAvecRls)('"clinic"."%s" porte la policy tenant_isolation', async (table) => {
    const result = await dataSource.query(`SELECT polname FROM pg_policy WHERE polrelid = $1::regclass`, [
      `"clinic"."${table}"`,
    ]);

    expect(result.map((row: { polname: string }) => row.polname)).toContain('tenant_isolation');
  });

  it('"clinic"."medicaments_catalogue" n\'a PAS de RLS (référentiel global, non tenant)', async () => {
    const result = await dataSource.query(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = $1::regclass`,
      [`"clinic"."medicaments_catalogue"`],
    );

    expect(result[0].relrowsecurity).toBe(false);
    expect(result[0].relforcerowsecurity).toBe(false);
  });

  it('"clinic"."medicaments_catalogue" n\'a pas de colonne etablissement_id', async () => {
    const result = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'clinic' AND table_name = 'medicaments_catalogue'`,
    );

    expect(result.map((row: { column_name: string }) => row.column_name)).not.toContain('etablissement_id');
  });

  describe('comportement (lecture/écriture) sur clinic.demandes_analyse', () => {
    const etabA = randomUUID();
    const etabB = randomUUID();
    const patientA = randomUUID();

    async function insertAs(etablissementId: string, patientId: string): Promise<void> {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
      await queryRunner.query(
        `INSERT INTO "clinic"."demandes_analyse" (etablissement_id, patient_id, prescripteur_id, type_analyse, date_demande)
         VALUES ($1, $2, $3, 'NFS', now())`,
        [etablissementId, patientId, randomUUID()],
      );
      await queryRunner.commitTransaction();
      await queryRunner.release();
    }

    async function countAs(etablissementId: string): Promise<number> {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
      const rows = await queryRunner.query(`SELECT id FROM "clinic"."demandes_analyse"`);
      await queryRunner.commitTransaction();
      await queryRunner.release();
      return rows.length;
    }

    afterAll(async () => {
      await dataSource.query(`DELETE FROM "clinic"."demandes_analyse" WHERE etablissement_id IN ($1, $2)`, [
        etabA,
        etabB,
      ]);
    });

    it("l'établissement A ne voit jamais les demandes de l'établissement B", async () => {
      await insertAs(etabA, patientA);
      await insertAs(etabB, randomUUID());

      expect(await countAs(etabA)).toBe(1);
      expect(await countAs(etabB)).toBe(1);
    });
  });

  describe('comportement sur clinic.medicaments_catalogue (référentiel partagé)', () => {
    let medicamentId: string;

    afterAll(async () => {
      if (medicamentId) {
        await dataSource.query(`DELETE FROM "clinic"."medicaments_catalogue" WHERE id = $1`, [medicamentId]);
      }
    });

    it('un médicament créé est visible quel que soit le tenant courant (pas de filtre RLS)', async () => {
      const dci = `Paracétamol-test-${randomUUID().slice(0, 8)}`;
      const inserted = await dataSource.query(
        `INSERT INTO "clinic"."medicaments_catalogue" (dci, forme, dosage) VALUES ($1, 'comprimé', '500mg') RETURNING id`,
        [dci],
      );
      medicamentId = inserted[0].id;

      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [randomUUID()]);
      const rows = await queryRunner.query(`SELECT dci FROM "clinic"."medicaments_catalogue" WHERE id = $1`, [
        medicamentId,
      ]);
      await queryRunner.commitTransaction();
      await queryRunner.release();

      expect(rows).toHaveLength(1);
      expect(rows[0].dci).toBe(dci);
    });
  });
});
