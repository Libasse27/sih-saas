import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { TenantRlsInterceptor } from './tenant-rls.interceptor';

describe('TenantRlsInterceptor', () => {
  function buildQueryRunner() {
    return {
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    };
  }

  function buildHandler<T>(observable: Observable<T>): CallHandler {
    return { handle: () => observable } as CallHandler;
  }

  // Laisse les microtasks (commit/rollback/release, tous des Promise.resolve()) se vider avant d'asserter :
  // finalize() ne s'exécute qu'après que next()/error() a fini de se propager jusqu'au subscriber.
  function flushMicrotasks(): Promise<void> {
    return new Promise((resolve) => setImmediate(resolve));
  }

  it('laisse passer sans transaction si aucun queryRunner n’est ouvert (ex. scope PLATFORM)', async () => {
    const tenantContext = { getStore: () => undefined, set: jest.fn() };
    const interceptor = new TenantRlsInterceptor(tenantContext as any);
    let valeurRecue: string | undefined;

    interceptor
      .intercept({} as ExecutionContext, buildHandler(of('résultat')))
      .subscribe((value) => (valeurRecue = value as string));
    await flushMicrotasks();

    expect(valeurRecue).toBe('résultat');
  });

  it('commit la transaction et libère le queryRunner après une réponse réussie', async () => {
    const queryRunner = buildQueryRunner();
    const tenantContext = { getStore: () => ({ queryRunner, afterCommitCallbacks: [] }), set: jest.fn() };
    const interceptor = new TenantRlsInterceptor(tenantContext as any);
    let valeurRecue: string | undefined;

    interceptor
      .intercept({} as ExecutionContext, buildHandler(of('résultat')))
      .subscribe((value) => (valeurRecue = value as string));
    await flushMicrotasks();

    expect(valeurRecue).toBe('résultat');
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
    expect(tenantContext.set).toHaveBeenCalledWith({ queryRunner: null, afterCommitCallbacks: [] });
  });

  it('exécute les callbacks afterCommit uniquement après le commit réussi', async () => {
    const queryRunner = buildQueryRunner();
    const afterCommitCallbacks = [jest.fn(), jest.fn()];
    const tenantContext = { getStore: () => ({ queryRunner, afterCommitCallbacks }), set: jest.fn() };
    const interceptor = new TenantRlsInterceptor(tenantContext as any);

    interceptor.intercept({} as ExecutionContext, buildHandler(of('résultat'))).subscribe();
    await flushMicrotasks();

    expect(afterCommitCallbacks[0]).toHaveBeenCalled();
    expect(afterCommitCallbacks[1]).toHaveBeenCalled();
  });

  it("n'exécute jamais les callbacks afterCommit en cas de rollback", async () => {
    const queryRunner = buildQueryRunner();
    const afterCommitCallback = jest.fn();
    const tenantContext = {
      getStore: () => ({ queryRunner, afterCommitCallbacks: [afterCommitCallback] }),
      set: jest.fn(),
    };
    const interceptor = new TenantRlsInterceptor(tenantContext as any);

    interceptor
      .intercept({} as ExecutionContext, buildHandler(throwError(() => new Error('Échec métier'))))
      .subscribe({ error: () => undefined });
    await flushMicrotasks();

    expect(afterCommitCallback).not.toHaveBeenCalled();
  });

  it('rollback la transaction et relaie l’erreur quand le handler échoue', async () => {
    const queryRunner = buildQueryRunner();
    const tenantContext = { getStore: () => ({ queryRunner }), set: jest.fn() };
    const interceptor = new TenantRlsInterceptor(tenantContext as any);
    const erreur = new Error('Échec métier');
    let erreurRecue: unknown;

    interceptor
      .intercept({} as ExecutionContext, buildHandler(throwError(() => erreur)))
      .subscribe({ error: (err) => (erreurRecue = err) });
    await flushMicrotasks();

    expect(erreurRecue).toBe(erreur);
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });
});
