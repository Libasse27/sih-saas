import { QueryRunner } from 'typeorm';

/**
 * À appeler dans la migration de création de chaque table du schéma `clinic` (Phase 5+).
 * `FORCE ROW LEVEL SECURITY` est indispensable : sans elle, Postgres exempte le propriétaire
 * de la table (notre rôle applicatif, qui crée les tables via les migrations) de toute policy RLS.
 * Référence : docs/phase-0/strategie-isolation.md §2.
 */
export async function enableTenantRls(
  queryRunner: QueryRunner,
  schema: string,
  table: string,
): Promise<void> {
  const qualified = `"${schema}"."${table}"`;
  await queryRunner.query(`ALTER TABLE ${qualified} ENABLE ROW LEVEL SECURITY`);
  await queryRunner.query(`ALTER TABLE ${qualified} FORCE ROW LEVEL SECURITY`);
  // NULLIF(..., '') est indispensable : une fois qu'une connexion (réutilisée par le pool) a positionné
  // app.current_tenant_id au moins une fois, Postgres renvoie '' (pas NULL) une fois la transaction
  // locale terminée — un cast direct ''::uuid lèverait une erreur au lieu d'un fail-closed silencieux.
  await queryRunner.query(`
    CREATE POLICY tenant_isolation ON ${qualified}
      USING (etablissement_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
      WITH CHECK (etablissement_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  `);
}

export async function disableTenantRls(
  queryRunner: QueryRunner,
  schema: string,
  table: string,
): Promise<void> {
  const qualified = `"${schema}"."${table}"`;
  await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation ON ${qualified}`);
  await queryRunner.query(`ALTER TABLE ${qualified} NO FORCE ROW LEVEL SECURITY`);
  await queryRunner.query(`ALTER TABLE ${qualified} DISABLE ROW LEVEL SECURITY`);
}

/** Index composé {etablissementId, ...} — voir docs/phase-0/modele-de-donnees.md (convention sur toutes les tables clinic). */
export async function createTenantIndex(
  queryRunner: QueryRunner,
  schema: string,
  table: string,
  columns: string[],
): Promise<void> {
  const indexName = `idx_${table}_${columns.join('_')}`;
  const columnList = columns.map((column) => `"${column}"`).join(', ');
  await queryRunner.query(
    `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${schema}"."${table}" (${columnList})`,
  );
}
