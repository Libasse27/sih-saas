import { Injectable } from '@nestjs/common';
import { Between, QueryFailedError, Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { EmployesService } from './employes.service';
import { PresenceEntity } from '../infrastructure/entities/presence.entity';
import { CreatePresenceDto } from '../presentation/dto/create-presence.dto';
import { FindPresencesQueryDto } from '../presentation/dto/find-presences-query.dto';

/** Code erreur Postgres "unique_violation" (23505) — voir https://www.postgresql.org/docs/current/errcodes-appendix.html. */
const POSTGRES_UNIQUE_VIOLATION = '23505';

/**
 * `clinic.presences` est protégée par RLS, index unique (etablissementId, employeId, date) — un seul
 * pointage par jour par employé. `create` fait un upsert : si la ligne du jour existe déjà, elle est
 * mise à jour plutôt que de laisser remonter une violation de contrainte unique en 500. Le find-then-save
 * est revérifié après une éventuelle 23505 (deux requêtes concurrentes sur le même employé/jour,
 * même réflexe que le fix jti des refresh tokens) au lieu de simplement la laisser remonter.
 */
@Injectable()
export class PresencesService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly employesService: EmployesService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<PresenceEntity> {
    return this.tenantContext.getManager().getRepository(PresenceEntity);
  }

  async create(employeId: string, dto: CreatePresenceDto, actingUserId: string): Promise<PresenceEntity> {
    await this.employesService.findById(employeId);
    const etablissementId = this.tenantContext.getEtablissementId()!;

    const { presence, etaitExistante } = await this.upsert(etablissementId, employeId, dto);

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: etaitExistante ? 'rh.presence.update' : 'rh.presence.create',
      ressource: 'presence',
      ressourceId: presence.id,
      metadata: { date: dto.date, statut: dto.statut },
    });

    return presence;
  }

  private async upsert(
    etablissementId: string,
    employeId: string,
    dto: CreatePresenceDto,
  ): Promise<{ presence: PresenceEntity; etaitExistante: boolean }> {
    const existante = await this.repository.findOne({ where: { employeId, date: dto.date } });
    const presence = existante ?? this.repository.create({ etablissementId, employeId, date: dto.date });
    Object.assign(presence, {
      heureArrivee: dto.heureArrivee ?? null,
      heureDepart: dto.heureDepart ?? null,
      statut: dto.statut,
      commentaire: dto.commentaire ?? null,
    });

    try {
      const saved = await this.repository.save(presence);
      return { presence: saved, etaitExistante: Boolean(existante) };
    } catch (error) {
      if (!existante && this.isUniqueViolation(error)) {
        // Course concurrente : une autre requête a créé la ligne du jour entre le findOne et le save.
        // On rejoue l'upsert une fois — la seconde lecture verra forcément la ligne créée entre-temps.
        const concurrente = await this.repository.findOneBy({ employeId, date: dto.date });
        if (concurrente) {
          Object.assign(concurrente, {
            heureArrivee: dto.heureArrivee ?? null,
            heureDepart: dto.heureDepart ?? null,
            statut: dto.statut,
            commentaire: dto.commentaire ?? null,
          });
          return { presence: await this.repository.save(concurrente), etaitExistante: true };
        }
      }
      throw error;
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return error instanceof QueryFailedError && (error as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION;
  }

  async findAllForEmploye(employeId: string, query: FindPresencesQueryDto): Promise<PresenceEntity[]> {
    await this.employesService.findById(employeId);

    if (query.date) {
      return this.repository.find({ where: { employeId, date: query.date }, order: { date: 'DESC' } });
    }
    if (query.dateDebut && query.dateFin) {
      return this.repository.find({
        where: { employeId, date: Between(query.dateDebut, query.dateFin) },
        order: { date: 'DESC' },
      });
    }
    return this.repository.find({ where: { employeId }, order: { date: 'DESC' } });
  }
}
