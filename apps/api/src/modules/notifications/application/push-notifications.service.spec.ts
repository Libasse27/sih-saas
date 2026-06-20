import { PushNotificationsService } from './push-notifications.service';

describe('PushNotificationsService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; find: jest.Mock; update: jest.Mock; delete: jest.Mock };
  let pushProvider: { envoyer: jest.Mock };
  let service: PushNotificationsService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'token-1', ...entity })),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    pushProvider = { envoyer: jest.fn().mockResolvedValue(undefined) };

    service = new PushNotificationsService(repository as any, pushProvider as any);
  });

  describe('enregistrer', () => {
    it('crée un nouveau jeton si inexistant', async () => {
      repository.findOne.mockResolvedValue(null);

      await service.enregistrer('user-1', 'expo-token-abc', 'ios');

      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', token: 'expo-token-abc', plateforme: 'ios' }));
    });

    it('met à jour le propriétaire si le jeton existe déjà (réinstallation/changement de compte)', async () => {
      repository.findOne.mockResolvedValue({ id: 'token-1', userId: 'ancien-user', token: 'expo-token-abc' });

      await service.enregistrer('nouveau-user', 'expo-token-abc', 'android');

      expect(repository.update).toHaveBeenCalledWith('token-1', { userId: 'nouveau-user', plateforme: 'android' });
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  it('supprimer() supprime par jeton', async () => {
    await service.supprimer('expo-token-abc');

    expect(repository.delete).toHaveBeenCalledWith({ token: 'expo-token-abc' });
  });

  describe('envoyerATousLesAppareils', () => {
    it('envoie à chaque appareil enregistré de l’utilisateur', async () => {
      repository.find.mockResolvedValue([{ token: 'token-A' }, { token: 'token-B' }]);

      await service.envoyerATousLesAppareils('user-1', { titre: 'Titre', corps: 'Corps' });

      expect(pushProvider.envoyer).toHaveBeenCalledTimes(2);
      expect(pushProvider.envoyer).toHaveBeenCalledWith('token-A', { titre: 'Titre', corps: 'Corps' });
      expect(pushProvider.envoyer).toHaveBeenCalledWith('token-B', { titre: 'Titre', corps: 'Corps' });
    });

    it('un échec d’envoi sur un appareil ne bloque pas les autres ni n’interrompt l’appelant', async () => {
      repository.find.mockResolvedValue([{ token: 'token-A' }, { token: 'token-B' }]);
      pushProvider.envoyer.mockRejectedValueOnce(new Error('échec réseau'));

      await expect(service.envoyerATousLesAppareils('user-1', { titre: 'Titre', corps: 'Corps' })).resolves.toBeUndefined();
    });
  });
});
