import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { Connection } from 'mongoose';
import { DataSource } from 'typeorm';
import { Public } from '../../shared/decorators/public.decorator';
import { ResponseMessage } from '../../shared/decorators/response-message.decorator';

@ApiTags('Santé')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly config: ConfigService,
  ) {}

  /**
   * Avant la Phase 22, cet endpoint retournait toujours HTTP 200 quel que soit l'état réel des
   * dépendances — le healthcheck Docker de docker-compose.prod.yml (qui ne regarde que le code HTTP)
   * était donc purement décoratif. Renvoie maintenant 503 si une dépendance critique est down.
   */
  @Public()
  @Get()
  @ResponseMessage('État de santé de l’API.')
  async check() {
    const postgres = this.dataSource.isInitialized ? 'up' : 'down';
    const mongodb = this.mongoConnection.readyState === 1 ? 'up' : 'down';
    const redis = await this.checkRedis();

    const statut = { postgres, mongodb, redis };
    const indisponibles = Object.entries(statut)
      .filter(([, etat]) => etat === 'down')
      .map(([nom]) => nom);

    if (indisponibles.length > 0) {
      throw new ServiceUnavailableException(`Dépendance(s) indisponible(s) : ${indisponibles.join(', ')}.`);
    }

    return statut;
  }

  private async checkRedis(): Promise<'up' | 'down'> {
    const client = new Redis({
      host: this.config.get<string>('redis.host'),
      port: this.config.get<number>('redis.port'),
      password: this.config.get<string>('redis.password'),
      lazyConnect: true,
      connectTimeout: 2000,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
    });
    try {
      await client.connect();
      await client.ping();
      return 'up';
    } catch {
      return 'down';
    } finally {
      client.disconnect();
    }
  }
}
