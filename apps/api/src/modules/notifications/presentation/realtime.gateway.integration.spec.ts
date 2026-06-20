import { INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Scope } from '@sih-saas/shared';
import { io, Socket } from 'socket.io-client';
import { NotificationsModule } from '../notifications.module';
import { RealtimeGateway } from './realtime.gateway';

/**
 * Test de validation explicitement exigé par docs/phase-0/plan-de-phases.md Phase 6 : un client
 * de l'établissement A ne doit jamais recevoir les événements de l'établissement B. Ne nécessite
 * PAS les conteneurs docker-compose (aucune DB impliquée) — placé en .integration.spec.ts car il
 * démarre un vrai serveur HTTP/Socket.io et de vraies connexions réseau, contrairement aux specs
 * unitaires qui mockent tout.
 */
const JWT_SECRET = 'integration-test-secret';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [() => ({ jwt: { accessSecret: JWT_SECRET } })] }), NotificationsModule],
})
class TestAppModule {}

describe('RealtimeGateway (isolation cross-tenant)', () => {
  let app: INestApplication;
  let gateway: RealtimeGateway;
  let baseUrl: string;
  const jwtService = new JwtService({});

  function signToken(etablissementId: string | null, userId = 'user-1'): string {
    return jwtService.sign(
      { sub: userId, scope: etablissementId ? Scope.ETABLISSEMENT : Scope.PLATFORM, etablissementId, roles: [], permissions: [] },
      { secret: JWT_SECRET },
    );
  }

  function connect(token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const socket = io(`${baseUrl}/realtime`, { auth: { token }, transports: ['websocket'], forceNew: true });
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', reject);
    });
  }

  /**
   * Un JWT invalide n'empêche pas l'établissement de la connexion transport (le serveur appelle
   * client.disconnect(true) APRÈS coup, dans handleConnection) — il faut donc observer
   * l'événement 'disconnect' côté client plutôt qu'un rejet de la promesse de connexion.
   */
  function connectAndExpectRejection(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = io(`${baseUrl}/realtime`, { auth: { token }, transports: ['websocket'], forceNew: true });
      const timer = setTimeout(() => {
        socket.close();
        reject(new Error('Le serveur n’a jamais déconnecté le client au JWT invalide.'));
      }, 2000);
      socket.on('disconnect', () => {
        clearTimeout(timer);
        resolve();
      });
      socket.on('connect_error', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  beforeAll(async () => {
    app = await NestFactory.create(TestAppModule, { logger: false });
    await app.listen(0);
    const address = app.getHttpServer().address() as { port: number };
    baseUrl = `http://127.0.0.1:${address.port}`;
    gateway = app.get(RealtimeGateway);
  });

  afterAll(async () => {
    await app.close();
  });

  it("un client de l'établissement A ne reçoit jamais les événements de l'établissement B", async () => {
    const socketA = await connect(signToken('etab-A'));
    const socketB = await connect(signToken('etab-B'));

    try {
      const receivedByA: unknown[] = [];
      const receivedByB: unknown[] = [];
      socketA.on('lits:updated', (payload) => receivedByA.push(payload));
      socketB.on('lits:updated', (payload) => receivedByB.push(payload));

      gateway.emitToEtablissement('etab-A', 'lits:updated', { litId: 'lit-1', statut: 'OCCUPE' });

      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(receivedByA).toEqual([{ litId: 'lit-1', statut: 'OCCUPE' }]);
      expect(receivedByB).toEqual([]);
    } finally {
      socketA.disconnect();
      socketB.disconnect();
    }
  });

  it('rejette la connexion sans JWT valide', async () => {
    await connectAndExpectRejection('jeton-invalide');
  });

  it("un message ciblé via emitToUser n'atteint que le destinataire, jamais un autre utilisateur du même établissement (Phase 14, messagerie)", async () => {
    const socketDestinataire = await connect(signToken('etab-A', 'user-destinataire'));
    const socketAutre = await connect(signToken('etab-A', 'user-autre'));

    try {
      const recuParDestinataire: unknown[] = [];
      const recuParAutre: unknown[] = [];
      socketDestinataire.on('message:nouveau', (payload) => recuParDestinataire.push(payload));
      socketAutre.on('message:nouveau', (payload) => recuParAutre.push(payload));

      gateway.emitToUser('user-destinataire', 'message:nouveau', { conversationId: 'conv-1' });

      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(recuParDestinataire).toEqual([{ conversationId: 'conv-1' }]);
      expect(recuParAutre).toEqual([]);
    } finally {
      socketDestinataire.disconnect();
      socketAutre.disconnect();
    }
  });
});
