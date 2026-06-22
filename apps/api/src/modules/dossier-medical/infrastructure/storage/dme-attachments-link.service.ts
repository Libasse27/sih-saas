import { createHmac, timingSafeEqual } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface PieceJointeTokenPayload {
  patientId: string;
  etablissementId: string;
  pieceJointeId: string;
  exp: number;
}

export interface LienSigne {
  token: string;
  expireLe: Date;
}

/**
 * Liens de fichiers signés/expirants (prompt maître §17) — HMAC-SHA256 sur un payload base64url,
 * sans dépendance JWT : le porteur du token n'a besoin d'aucun bearer JWT pour récupérer le fichier
 * (comme une URL pré-signée S3), la signature + l'expiration SONT le contrôle d'accès. Distinct du
 * JWT applicatif (qui a une durée de vie bien plus longue et n'est jamais destiné à être partagé).
 */
@Injectable()
export class DmeAttachmentsLinkService {
  constructor(private readonly config: ConfigService) {}

  genererToken(payload: Omit<PieceJointeTokenPayload, 'exp'>): LienSigne {
    const ttlMinutes = this.config.get<number>('dmeAttachments.linkTtlMinutes')!;
    const expireLe = new Date(Date.now() + ttlMinutes * 60_000);
    const complet: PieceJointeTokenPayload = { ...payload, exp: expireLe.getTime() };

    const corps = Buffer.from(JSON.stringify(complet)).toString('base64url');
    return { token: `${corps}.${this.signer(corps)}`, expireLe };
  }

  verifierToken(token: string): PieceJointeTokenPayload {
    const [corps, signature] = token.split('.');
    if (!corps || !signature) {
      throw new UnauthorizedException('Lien de téléchargement invalide.');
    }

    const signatureAttendue = this.signer(corps);
    const signatureBuffer = Buffer.from(signature);
    const signatureAttendueBuffer = Buffer.from(signatureAttendue);
    if (
      signatureBuffer.length !== signatureAttendueBuffer.length ||
      !timingSafeEqual(signatureBuffer, signatureAttendueBuffer)
    ) {
      throw new UnauthorizedException('Lien de téléchargement invalide.');
    }

    const payload: PieceJointeTokenPayload = JSON.parse(Buffer.from(corps, 'base64url').toString());
    if (payload.exp < Date.now()) {
      throw new UnauthorizedException('Lien de téléchargement expiré.');
    }

    return payload;
  }

  private signer(corps: string): string {
    const secret = this.config.get<string>('dmeAttachments.linkSecret')!;
    return createHmac('sha256', secret).update(corps).digest('hex');
  }
}
