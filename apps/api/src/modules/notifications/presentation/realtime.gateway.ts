import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { JwtPayload } from '@sih-saas/shared';
import { Server, Socket } from 'socket.io';

/**
 * Temps réel filtré par tenant (prompt maître §16, docs/phase-0/plan-de-phases.md Phase 6).
 *
 * Décision volontaire : ce gateway ne fait que de la diffusion serveur->client (lits, etc.) —
 * aucune écriture n'est acceptée via WS, tout passe par l'API REST (cohérent avec "API-first" et
 * évite de redupliquer tout le pipeline de guards/RLS sur les sockets). L'authentification au
 * handshake sert uniquement à déterminer dans quel salon `tenant:{etablissementId}` placer le
 * client, garantissant qu'un établissement ne reçoit jamais les événements d'un autre.
 */
@Injectable()
@WebSocketGateway({ namespace: 'realtime', cors: true })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('jwt.accessSecret'),
      });
      client.data.user = payload;

      if (payload.etablissementId) {
        await client.join(this.tenantRoom(payload.etablissementId));
      }
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Socket déconnecté : ${client.id}`);
  }

  /** Diffuse un événement uniquement aux clients connectés de cet établissement. */
  emitToEtablissement(etablissementId: string, event: string, payload: unknown): void {
    this.server.to(this.tenantRoom(etablissementId)).emit(event, payload);
  }

  private tenantRoom(etablissementId: string): string {
    return `tenant:${etablissementId}`;
  }

  private extractToken(client: Socket): string | null {
    const fromAuth = client.handshake.auth?.token as string | undefined;
    if (fromAuth) {
      return fromAuth;
    }

    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }

    return null;
  }
}
