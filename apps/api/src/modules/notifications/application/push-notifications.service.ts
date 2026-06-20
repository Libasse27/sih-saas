import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushProvider } from '../domain/push-provider.interface';
import { DeviceTokenEntity } from '../infrastructure/entities/device-token.entity';

export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');

/**
 * `platform.device_tokens` n'a pas de RLS (jamais de contexte tenant ouvert hors d'une requête
 * HTTP authentifiée classique pour ce module) — accès direct par `@InjectRepository`, même
 * convention que `UsersService`/`ApiKeysService`.
 */
@Injectable()
export class PushNotificationsService {
  constructor(
    @InjectRepository(DeviceTokenEntity) private readonly repository: Repository<DeviceTokenEntity>,
    @Inject(PUSH_PROVIDER) private readonly pushProvider: PushProvider,
  ) {}

  /** Upsert par jeton : un appareil ré-enregistré (réinstallation, changement de compte) met simplement à jour le propriétaire. */
  async enregistrer(userId: string, token: string, plateforme: string): Promise<void> {
    const existant = await this.repository.findOne({ where: { token } });
    if (existant) {
      await this.repository.update(existant.id, { userId, plateforme });
      return;
    }
    await this.repository.save(this.repository.create({ userId, token, plateforme }));
  }

  async supprimer(token: string): Promise<void> {
    await this.repository.delete({ token });
  }

  /** Diffuse vers tous les appareils enregistrés de cet utilisateur (jamais bloquant : un échec d'envoi n'interrompt pas l'appelant). */
  async envoyerATousLesAppareils(userId: string, notification: { titre: string; corps: string; data?: Record<string, string> }): Promise<void> {
    const jetons = await this.repository.find({ where: { userId } });
    await Promise.all(jetons.map((jeton) => this.pushProvider.envoyer(jeton.token, notification).catch(() => undefined)));
  }
}
