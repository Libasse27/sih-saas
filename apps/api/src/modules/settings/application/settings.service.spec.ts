import { PaymentProviderType } from '@sih-saas/shared';
import { SettingEntity } from '../infrastructure/entities/setting.entity';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let repository: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let auditService: { log: jest.Mock };
  let redis: { getJSON: jest.Mock; setJSON: jest.Mock; del: jest.Mock };
  let service: SettingsService;

  const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => entity),
    };
    auditService = { log: jest.fn() };
    const store = new Map<string, unknown>();
    redis = {
      getJSON: jest.fn((key: string) => Promise.resolve(store.has(key) ? store.get(key) : null)),
      setJSON: jest.fn((key: string, value: unknown) => {
        store.set(key, value);
        return Promise.resolve();
      }),
      del: jest.fn((key: string) => {
        store.delete(key);
        return Promise.resolve();
      }),
    };
    service = new SettingsService(repository as any, auditService as any, redis as any);
  });

  describe('getOrCreate', () => {
    it('crée la ligne unique avec des valeurs par défaut si elle n\'existe pas encore', async () => {
      repository.findOne.mockResolvedValue(null);

      const settings = await service.getOrCreate();

      expect(settings.id).toBe(SETTINGS_ID);
      expect(settings.paiements.actifs).toBe(true);
      expect(settings.paiements.passerelleActive).toBe(PaymentProviderType.SANDBOX);
      expect(repository.save).toHaveBeenCalled();
    });

    it('réutilise la ligne existante sans la recréer (y compris une ligne pré-Phase 17 sans passerelleActive)', async () => {
      const existing = {
        id: SETTINGS_ID,
        email: { nomExpediteur: 'SIH', emailExpediteur: 'a@b.sn', emailSupport: null },
        paiements: { actifs: true },
      } as SettingEntity;
      repository.findOne.mockResolvedValue(existing);

      const settings = await service.getOrCreate();

      expect(settings).toBe(existing);
      expect(settings.paiements.passerelleActive).toBeUndefined();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('met en cache et ne réinterroge pas le repository au second appel (Phase 27)', async () => {
      repository.findOne.mockResolvedValue({ id: SETTINGS_ID, email: {}, paiements: { actifs: true } });

      await service.getOrCreate();
      await service.getOrCreate();

      expect(repository.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('fusionne partiellement email/paiements sans écraser les champs non fournis', async () => {
      repository.findOne.mockResolvedValue({
        id: SETTINGS_ID,
        email: { nomExpediteur: 'SIH', emailExpediteur: 'a@b.sn', emailSupport: null },
        paiements: { actifs: true },
      } as SettingEntity);

      const saved = await service.update({ paiements: { actifs: false } }, 'admin-1');

      expect(saved.paiements.actifs).toBe(false);
      expect(saved.email.emailExpediteur).toBe('a@b.sn');
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'setting.update' }));
    });

    it('invalide le cache — un appel getOrCreate après update réinterroge le repository', async () => {
      repository.findOne.mockResolvedValue({
        id: SETTINGS_ID,
        email: { nomExpediteur: 'SIH', emailExpediteur: 'a@b.sn', emailSupport: null },
        paiements: { actifs: true },
      } as SettingEntity);

      await service.getOrCreate();
      // update() relit via getOrCreate() en interne — déjà en cache à ce stade, ne réinterroge pas.
      await service.update({ paiements: { actifs: false } }, 'admin-1');
      await service.getOrCreate();

      expect(repository.findOne).toHaveBeenCalledTimes(2);
    });
  });
});
