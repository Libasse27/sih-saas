import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { RealtimeGateway } from '../../notifications/presentation/realtime.gateway';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { StockMedicamentEntity } from '../infrastructure/entities/stock-medicament.entity';
import { CreateStockMedicamentDto } from '../presentation/dto/create-stock-medicament.dto';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** `clinic.stock_medicament` est protégée par RLS — convention tenantContext.getManager(). */
@Injectable()
export class StockMedicamentService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  private get repository(): Repository<StockMedicamentEntity> {
    return this.tenantContext.getManager().getRepository(StockMedicamentEntity);
  }

  async create(dto: CreateStockMedicamentDto, actingUserId: string): Promise<StockMedicamentEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const stock = await this.repository.save(
      this.repository.create({ ...dto, etablissementId, emplacement: dto.emplacement ?? null }),
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'stock.create',
      ressource: 'stock_medicament',
      ressourceId: stock.id,
    });

    return stock;
  }

  async findAll(page: number, limit: number, medicamentId?: string): Promise<PaginatedResult<StockMedicamentEntity>> {
    const [items, total] = await this.repository.findAndCount({
      where: medicamentId ? { medicamentId } : {},
      skip: (page - 1) * limit,
      take: limit,
      order: { dateExpiration: 'ASC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<StockMedicamentEntity> {
    const stock = await this.repository.findOne({ where: { id } });
    if (!stock) {
      throw new NotFoundException('Lot de stock introuvable.');
    }
    return stock;
  }

  /**
   * Décrément atomique : `UPDATE ... WHERE quantite >= $1` garantit qu'aucune dispensation
   * concurrente ne peut faire passer la quantité sous zéro (même piège tuple que
   * EtablissementsService.incrementerCompteur — `repository.query()` renvoie [lignes, nbAffectees]
   * pour un UPDATE...RETURNING). 0 ligne affectée = stock insuffisant.
   */
  async decrementer(stockMedicamentId: string, quantite: number): Promise<StockMedicamentEntity> {
    const [lignes] = await this.repository.query(
      `UPDATE clinic.stock_medicament SET quantite = quantite - $1 WHERE id = $2 AND quantite >= $1 RETURNING id`,
      [quantite, stockMedicamentId],
    );

    if (!lignes.length) {
      throw new ConflictException('Stock insuffisant pour ce lot.');
    }

    const stock = await this.findById(stockMedicamentId);
    if (stock.quantite <= stock.seuilAlerte) {
      this.tenantContext.afterCommit(() => {
        this.realtimeGateway.emitToEtablissement(stock.etablissementId, 'stock:alerte', {
          stockMedicamentId: stock.id,
          medicamentId: stock.medicamentId,
          lot: stock.lot,
          quantite: stock.quantite,
          seuilAlerte: stock.seuilAlerte,
        });
      });
    }

    return stock;
  }
}
