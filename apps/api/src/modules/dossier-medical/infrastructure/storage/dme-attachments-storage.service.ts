import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ALGORITHME = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Stockage chiffré au repos des pièces jointes du DME (prompt maître §17 — "pas de données de santé
 * non chiffrées"). AES-256-GCM via le module `crypto` natif (pas de dépendance externe ni de
 * sous-processus, contrairement au chiffrement GPG des sauvegardes Phase 31 — ici le fichier doit
 * être déchiffré à la demande pour un téléchargement, pas seulement archivé). `cheminStockage` est
 * une référence interne opaque (jamais une URL) : le contenu n'est accessible que via un lien
 * signé/expirant, voir DmeAttachmentsLinkService.
 */
@Injectable()
export class DmeAttachmentsStorageService {
  private readonly racine: string;
  private readonly cle: Buffer;

  constructor(config: ConfigService) {
    this.racine = config.get<string>('dmeAttachments.storageDir')!;
    this.cle = Buffer.from(config.get<string>('dmeAttachments.encryptionKey')!, 'hex');
  }

  async sauvegarder(etablissementId: string, patientId: string, contenu: Buffer): Promise<string> {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHME, this.cle, iv);
    const chiffre = Buffer.concat([cipher.update(contenu), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const cheminStockage = path.posix.join(etablissementId, patientId, `${randomUUID()}.enc`);
    const cheminAbsolu = path.join(this.racine, cheminStockage);

    await fs.mkdir(path.dirname(cheminAbsolu), { recursive: true });
    await fs.writeFile(cheminAbsolu, Buffer.concat([iv, authTag, chiffre]));

    return cheminStockage;
  }

  async lire(cheminStockage: string): Promise<Buffer> {
    const brut = await fs.readFile(path.join(this.racine, cheminStockage));

    const iv = brut.subarray(0, IV_LENGTH);
    const authTag = brut.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const chiffre = brut.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHME, this.cle, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(chiffre), decipher.final()]);
  }

  async supprimer(cheminStockage: string): Promise<void> {
    await fs.rm(path.join(this.racine, cheminStockage), { force: true });
  }
}
