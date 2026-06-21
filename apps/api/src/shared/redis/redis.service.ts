import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Client Redis persistant partagé (Phase 27) — distinct du ping ponctuel de HealthController
 * (Phase 22), qui ouvre/ferme volontairement sa propre connexion à chaque appel pour tester la
 * disponibilité réelle plutôt que l'état d'un client déjà en mémoire. Celui-ci sert l'usage
 * applicatif (cache de lecture, store du rate-limiting) où une connexion réutilisée est voulue.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis({
      host: config.get<string>('redis.host'),
      port: config.get<number>('redis.port'),
      password: config.get<string>('redis.password'),
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async setJSON(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
