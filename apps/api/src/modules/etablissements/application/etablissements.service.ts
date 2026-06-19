import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EtablissementStatut } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { deriverCodeBase } from '../domain/code-generator';
import { EtablissementEntity, EtablissementUsage } from '../infrastructure/entities/etablissement.entity';
import { CreateEtablissementDto } from '../presentation/dto/create-etablissement.dto';

@Injectable()
export class EtablissementsService {
  constructor(
    @InjectRepository(EtablissementEntity)
    private readonly repository: Repository<EtablissementEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateEtablissementDto, actingUserId: string | null): Promise<EtablissementEntity> {
    const code = await this.genererCodeUnique(dto.nom);
    const etablissement = await this.repository.save(this.repository.create({ ...dto, code }));

    await this.auditService.log({
      etablissementId: etablissement.id,
      userId: actingUserId,
      action: 'etablissement.create',
      ressource: 'etablissement',
      ressourceId: etablissement.id,
    });

    return etablissement;
  }

  async findAll(page: number, limit: number, statut?: EtablissementStatut) {
    const [items, total] = await this.repository.findAndCount({
      where: statut ? { statut } : {},
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<EtablissementEntity> {
    const etablissement = await this.repository.findOne({ where: { id } });
    if (!etablissement) {
      throw new NotFoundException('Établissement introuvable.');
    }
    return etablissement;
  }

  async updateStatut(
    id: string,
    statut: EtablissementStatut,
    actingUserId: string | null,
  ): Promise<EtablissementEntity> {
    const etablissement = await this.findById(id);
    etablissement.statut = statut;
    await this.repository.save(etablissement);

    await this.auditService.log({
      etablissementId: etablissement.id,
      userId: actingUserId,
      action: 'etablissement.statut.update',
      ressource: 'etablissement',
      ressourceId: etablissement.id,
      metadata: { statut },
    });

    return etablissement;
  }

  /** Renseigné par SubscriptionsService après création/migration d'un abonnement. */
  async setAbonnementActif(id: string, subscriptionId: string): Promise<void> {
    await this.repository.update(id, { abonnementActifId: subscriptionId });
  }

  /** Renseigné par RegistrationService une fois le compte ADMIN_ETABLISSEMENT créé (prompt maître §10.1). */
  async setAdmin(id: string, adminId: string): Promise<void> {
    await this.repository.update(id, { adminId });
  }

  /** Maintient etablissement.usage en phase avec la réalité (ex. après création d'un utilisateur). */
  async incrementUsage(id: string, champ: keyof EtablissementUsage, delta: number): Promise<void> {
    const etablissement = await this.findById(id);
    etablissement.usage = {
      ...etablissement.usage,
      [champ]: Math.max(0, etablissement.usage[champ] + delta),
    };
    await this.repository.save(etablissement);
  }

  /**
   * Incrément atomique d'un compteur de numérotation (ex. IDH patient) — une seule requête UPDATE,
   * le verrou de ligne Postgres pendant la transaction empêche deux créations concurrentes d'obtenir
   * le même numéro.
   */
  async incrementerCompteur(id: string, cle: string): Promise<number> {
    // TypeORM renvoie [lignes, nombreLignesAffectees] (un tuple) pour une requête UPDATE...RETURNING,
    // à la différence d'un SELECT classique qui renvoie directement le tableau de lignes.
    const [lignes] = await this.repository.query(
      `UPDATE platform.etablissements
       SET compteurs = jsonb_set(compteurs, $2::text[], (COALESCE((compteurs->>$3)::int, 0) + 1)::text::jsonb)
       WHERE id = $1
       RETURNING compteurs->>$3 AS valeur`,
      [id, `{${cle}}`, cle],
    );
    return parseInt(lignes[0].valeur, 10);
  }

  /** Lu par SubscriptionsService.getStatistiquesPlateforme() (dashboard super-admin, Phase 9). */
  async countParStatut(): Promise<Record<EtablissementStatut, number>> {
    const lignes = await this.repository
      .createQueryBuilder('etablissement')
      .select('etablissement.statut', 'statut')
      .addSelect('COUNT(*)', 'total')
      .groupBy('etablissement.statut')
      .getRawMany<{ statut: EtablissementStatut; total: string }>();

    const resultat = Object.fromEntries(
      Object.values(EtablissementStatut).map((statut) => [statut, 0]),
    ) as Record<EtablissementStatut, number>;

    for (const ligne of lignes) {
      resultat[ligne.statut] = parseInt(ligne.total, 10);
    }

    return resultat;
  }

  /** Lu par SubscriptionsService.getStatistiquesPlateforme() (dashboard super-admin, Phase 9). */
  async sommeUsage(): Promise<EtablissementUsage> {
    const ligne = await this.repository
      .createQueryBuilder('etablissement')
      .select(`COALESCE(SUM((etablissement.usage->>'utilisateurs')::int), 0)`, 'utilisateurs')
      .addSelect(`COALESCE(SUM((etablissement.usage->>'lits')::int), 0)`, 'lits')
      .addSelect(`COALESCE(SUM((etablissement.usage->>'stockageMo')::int), 0)`, 'stockageMo')
      .getRawOne<{ utilisateurs: string; lits: string; stockageMo: string }>();

    return {
      utilisateurs: parseInt(ligne?.utilisateurs ?? '0', 10),
      lits: parseInt(ligne?.lits ?? '0', 10),
      stockageMo: parseInt(ligne?.stockageMo ?? '0', 10),
    };
  }

  private async genererCodeUnique(nom: string): Promise<string> {
    const base = deriverCodeBase(nom);
    let code = base;
    let suffixe = 1;

    while (await this.repository.exists({ where: { code } })) {
      suffixe += 1;
      code = `${base}${suffixe}`;
    }

    return code;
  }
}
