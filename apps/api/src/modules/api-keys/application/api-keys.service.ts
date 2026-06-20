import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Permission } from '@sih-saas/shared';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { ApiKeyEntity } from '../infrastructure/entities/api-key.entity';
import { CreateApiKeyDto } from '../presentation/dto/create-api-key.dto';

const PREFIXE_LONGUEUR = 12;

export interface CreateApiKeyResult {
  apiKey: ApiKeyEntity;
  /** Clé brute en clair — retournée UNE seule fois, jamais persistée ni ré-affichable. */
  cle: string;
}

/**
 * Clés API scopées par établissement (Phase 11), prérequis du module FHIR : un système externe
 * n'a pas de compte utilisateur, donc pas de JWT — l'authentification passe par cette clé
 * (vérifiée par JwtAuthGuard via `verifier()`), pas par un login.
 */
@Injectable()
export class ApiKeysService {
  /** Seules permissions qu'une clé API peut porter — jamais un rôle/permission humain (ex. UTILISATEUR_MANAGE). */
  private static readonly PERMISSIONS_AUTORISEES: ReadonlySet<Permission> = new Set([Permission.FHIR_READ]);

  constructor(
    @InjectRepository(ApiKeyEntity) private readonly repository: Repository<ApiKeyEntity>,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async create(etablissementId: string, dto: CreateApiKeyDto, actingUserId: string): Promise<CreateApiKeyResult> {
    const permissionsInterdites = dto.permissions.filter(
      (permission) => !ApiKeysService.PERMISSIONS_AUTORISEES.has(permission),
    );
    if (permissionsInterdites.length) {
      throw new BadRequestException(
        `Permission(s) non autorisée(s) pour une clé API : ${permissionsInterdites.join(', ')}.`,
      );
    }

    const cleComplete = `sk_live_${randomBytes(24).toString('hex')}`;
    const prefixe = cleComplete.slice(0, PREFIXE_LONGUEUR);
    const rounds = this.config.get<number>('security.bcryptRounds') ?? 12;
    const secretHash = await bcrypt.hash(cleComplete, rounds);

    const apiKey = await this.repository.save(
      this.repository.create({
        etablissementId,
        nom: dto.nom,
        prefixe,
        secretHash,
        permissions: dto.permissions,
        expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : null,
      }),
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'api-key.create',
      ressource: 'api_key',
      ressourceId: apiKey.id,
      metadata: { nom: dto.nom, permissions: dto.permissions, prefixe },
    });

    return { apiKey, cle: cleComplete };
  }

  async findAllForEtablissement(etablissementId: string): Promise<ApiKeyEntity[]> {
    return this.repository.find({ where: { etablissementId }, order: { createdAt: 'DESC' } });
  }

  async revoquer(id: string, etablissementId: string, actingUserId: string): Promise<ApiKeyEntity> {
    const apiKey = await this.repository.findOne({ where: { id, etablissementId } });
    if (!apiKey) {
      throw new NotFoundException('Clé API introuvable.');
    }

    apiKey.actif = false;
    const saved = await this.repository.save(apiKey);

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'api-key.revoquer',
      ressource: 'api_key',
      ressourceId: apiKey.id,
    });

    return saved;
  }

  /** Utilisé par JwtAuthGuard (header `X-Api-Key`) — `null` si introuvable, inactive, expirée ou invalide. */
  async verifier(cleComplete: string): Promise<ApiKeyEntity | null> {
    if (!cleComplete.startsWith('sk_live_')) {
      return null;
    }

    const prefixe = cleComplete.slice(0, PREFIXE_LONGUEUR);
    const candidate = await this.repository
      .createQueryBuilder('apiKey')
      .addSelect('apiKey.secretHash')
      .where('apiKey.prefixe = :prefixe', { prefixe })
      .andWhere('apiKey.actif = true')
      .getOne();

    if (!candidate) {
      return null;
    }
    if (candidate.expirationDate && candidate.expirationDate.getTime() < Date.now()) {
      return null;
    }

    const valide = await bcrypt.compare(cleComplete, candidate.secretHash);
    if (!valide) {
      return null;
    }

    await this.repository.update(candidate.id, { derniereUtilisation: new Date() });
    return candidate;
  }
}
