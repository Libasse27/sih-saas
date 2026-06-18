import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import mongoose, { Model, Schema } from 'mongoose';
import { Scope } from '@sih-saas/shared';
import { emptyTenantContext, tenantAls } from '../tenant/tenant-context.storage';
import { tenantPlugin } from './tenant.plugin';

config();

/**
 * Test d'isolation multi-tenant réel (pas de mock) — exige MongoDB démarré (pnpm docker:dev:up).
 * Référence : docs/phase-0/strategie-isolation.md §6 (tests d'isolation obligatoires).
 */
describe('tenantPlugin (intégration MongoDB réelle)', () => {
  interface TestDoc {
    label: string;
    etablissementId: string;
  }

  let TestModel: Model<TestDoc>;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI!);
    const schema = new Schema<TestDoc>({ label: String });
    schema.plugin(tenantPlugin);
    TestModel = mongoose.model<TestDoc>('Phase2IsolationTest', schema, 'phase2_isolation_test');
  });

  afterAll(async () => {
    await TestModel.collection.drop().catch(() => undefined);
    await mongoose.disconnect();
  });

  // Promise.resolve(fn()) à l'intérieur du callback de tenantAls.run() : les Query Mongoose sont
  // lazy (thenable), elles ne s'exécutent qu'au premier .then()/await. Si on laisse l'appelant
  // attendre la query APRÈS le retour de run(), le scope AsyncLocalStorage est déjà retombé.
  // Il faut donc déclencher cette résolution ICI, pendant que le contexte est encore actif.
  function runAs<T>(context: { etablissementId?: string | null; scope: Scope }, fn: () => T | PromiseLike<T>): Promise<T> {
    return tenantAls.run({ ...emptyTenantContext(), ...context }, () => Promise.resolve(fn()));
  }

  const etabA = randomUUID();
  const etabB = randomUUID();

  it('injecte automatiquement etablissementId à la création', async () => {
    const doc = await runAs({ etablissementId: etabA, scope: Scope.ETABLISSEMENT }, () =>
      TestModel.create({ label: 'doc-A' }),
    );

    expect(doc.etablissementId).toBe(etabA);
  });

  it('filtre automatiquement les lectures par etablissementId : A ne voit jamais les documents de B', async () => {
    await runAs({ etablissementId: etabA, scope: Scope.ETABLISSEMENT }, () =>
      TestModel.create({ label: 'doc-A-2' }),
    );
    await runAs({ etablissementId: etabB, scope: Scope.ETABLISSEMENT }, () =>
      TestModel.create({ label: 'doc-B' }),
    );

    const docsForA = await runAs({ etablissementId: etabA, scope: Scope.ETABLISSEMENT }, () =>
      TestModel.find().lean(),
    );
    const docsForB = await runAs({ etablissementId: etabB, scope: Scope.ETABLISSEMENT }, () =>
      TestModel.find().lean(),
    );

    expect(docsForA.length).toBeGreaterThan(0);
    expect(docsForA.every((doc) => doc.etablissementId === etabA)).toBe(true);
    expect(docsForB.every((doc) => doc.etablissementId === etabB)).toBe(true);
  });

  it('refuse une création sans contexte tenant positionné', async () => {
    await expect(TestModel.create({ label: 'sans-contexte' })).rejects.toThrow();
  });

  it('refuse une lecture sans contexte tenant positionné', async () => {
    await expect(
      runAs({ etablissementId: null, scope: Scope.ETABLISSEMENT }, () => TestModel.find()),
    ).rejects.toThrow();
  });

  it('bypassTenantScope est réservé au périmètre PLATFORM', async () => {
    await expect(
      runAs({ etablissementId: etabA, scope: Scope.ETABLISSEMENT }, () =>
        TestModel.find().setOptions({ bypassTenantScope: true }),
      ),
    ).rejects.toThrow();

    const all = await runAs({ etablissementId: null, scope: Scope.PLATFORM }, () =>
      TestModel.find().setOptions({ bypassTenantScope: true }),
    );

    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('etablissementId est immuable après création', async () => {
    const doc = await runAs({ etablissementId: etabA, scope: Scope.ETABLISSEMENT }, () =>
      TestModel.create({ label: 'doc-immuable' }),
    );

    doc.etablissementId = etabB;

    await expect(runAs({ etablissementId: etabA, scope: Scope.ETABLISSEMENT }, () => doc.save())).rejects.toThrow();
  });
});
