import { Scope } from '@sih-saas/shared';
import { DataSource } from 'typeorm';
import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  function buildService(manager: unknown = {}, dataSourceOverrides: Record<string, unknown> = {}): TenantContextService {
    return new TenantContextService({ manager, ...dataSourceOverrides } as unknown as DataSource);
  }

  function buildQueryRunner() {
    return {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: { marker: 'rls' },
    };
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

  describe('runForEtablissement (Phase 32)', () => {
    it('ouvre sa propre transaction, positionne app.current_tenant_id, commit et restaure le contexte précédent', async () => {
      const queryRunner = buildQueryRunner();
      const createQueryRunner = jest.fn().mockReturnValue(queryRunner);
      const service = buildService({}, { createQueryRunner });

      await service.run(async () => {
        service.set({ etablissementId: 'etab-anterieur' });

        const resultat = await service.runForEtablissement('etab-A', async () => {
          expect(service.getEtablissementId()).toBe('etab-A');
          expect(service.getManager()).toBe(queryRunner.manager);
          return 'ok';
        });

        expect(resultat).toBe('ok');
        expect(queryRunner.query).toHaveBeenCalledWith(expect.stringContaining('set_config'), ['etab-A']);
        expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
        expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
        expect(queryRunner.release).toHaveBeenCalledTimes(1);
        // Contexte restauré à ce qu'il était avant l'appel — pas de fuite vers le reste de la requête.
        expect(service.getEtablissementId()).toBe('etab-anterieur');
        expect(service.getStore()?.queryRunner).toBeNull();
      });
    });

    it('rollback puis propage l’erreur si le callback échoue, tout en relâchant la transaction', async () => {
      const queryRunner = buildQueryRunner();
      const createQueryRunner = jest.fn().mockReturnValue(queryRunner);
      const service = buildService({}, { createQueryRunner });

      await service.run(async () => {
        await expect(
          service.runForEtablissement('etab-A', async () => {
            throw new Error('échec métier');
          }),
        ).rejects.toThrow('échec métier');

        expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
        expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
        expect(queryRunner.release).toHaveBeenCalledTimes(1);
      });
    });

    it('lève une erreur explicite si appelé hors contexte de requête', async () => {
      const service = buildService();
      await expect(service.runForEtablissement('etab-A', async () => 'x')).rejects.toThrow();
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
