import { PaymentProviderType } from '@sih-saas/shared';
import { SettingEntity } from '../infrastructure/entities/setting.entity';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let repository: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: SettingsService;

  const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => entity),
    };
    auditService = { log: jest.fn() };
    service = new SettingsService(repository as any, auditService as any);
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
  });
});
