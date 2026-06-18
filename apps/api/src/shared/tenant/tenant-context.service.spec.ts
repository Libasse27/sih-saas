import { Scope } from '@sih-saas/shared';
import { DataSource } from 'typeorm';
import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  function buildService(manager: unknown = {}): TenantContextService {
    return new TenantContextService({ manager } as unknown as DataSource);
  }

  it('isole deux contextes concurrents (deux "requêtes" simulées en parallèle)', async () => {
    const service = buildService();
    const observed: string[] = [];

    const requestA = service.run(async () => {
      service.set({ etablissementId: 'etab-A', scope: Scope.ETABLISSEMENT });
      await new Promise((resolve) => setTimeout(resolve, 20));
      observed.push(service.getEtablissementId()!);
    });

    const requestB = service.run(async () => {
      service.set({ etablissementId: 'etab-B', scope: Scope.ETABLISSEMENT });
      await new Promise((resolve) => setTimeout(resolve, 5));
      observed.push(service.getEtablissementId()!);
    });

    await Promise.all([requestA, requestB]);

    expect(observed.sort()).toEqual(['etab-A', 'etab-B']);
  });

  it('getManager() retombe sur le manager par défaut hors transaction RLS', () => {
    const fakeManager = { marker: 'default' };
    const service = buildService(fakeManager);

    service.run(() => {
      expect(service.getManager()).toBe(fakeManager);
    });
  });

  it('getManager() utilise le manager du queryRunner si une transaction RLS est ouverte', () => {
    const fakeManager = { marker: 'default' };
    const fakeRlsManager = { marker: 'rls' };
    const service = buildService(fakeManager);

    service.run(() => {
      service.set({ queryRunner: { manager: fakeRlsManager } as never });
      expect(service.getManager()).toBe(fakeRlsManager);
    });
  });

  it('set() appelé hors contexte de requête lève une erreur explicite', () => {
    const service = buildService();
    expect(() => service.set({ etablissementId: 'x' })).toThrow();
  });

  it('afterCommit() exécute immédiatement hors transaction RLS (ex. scope PLATFORM)', () => {
    const service = buildService();
    const callback = jest.fn();

    service.run(() => {
      service.afterCommit(callback);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('afterCommit() met en file le callback tant que la transaction RLS est ouverte', () => {
    const service = buildService();
    const callback = jest.fn();

    service.run(() => {
      service.set({ queryRunner: {} as never });
      service.afterCommit(callback);
      expect(callback).not.toHaveBeenCalled();
      expect(service.getStore()?.afterCommitCallbacks).toEqual([callback]);
    });
  });

  it('les getters renvoient des valeurs neutres hors contexte', () => {
    const service = buildService();
    expect(service.getUserId()).toBeNull();
    expect(service.getScope()).toBeNull();
    expect(service.getEtablissementId()).toBeNull();
    expect(service.getRoles()).toEqual([]);
    expect(service.getPermissions()).toEqual([]);
  });
});
