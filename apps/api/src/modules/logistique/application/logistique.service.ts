import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { RealtimeGateway } from '../../notifications/presentation/realtime.gateway';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { ArticleStockEntity } from '../infrastructure/entities/article-stock.entity';
import { CreateArticleStockDto } from '../presentation/dto/create-article-stock.dto';
import { UpdateArticleStockDto } from '../presentation/dto/update-article-stock.dto';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** `clinic.articles_stock` est protégée par RLS — voir services.service.ts pour la convention tenantContext.getManager(). */
@Injectable()
export class LogistiqueService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  private get repository(): Repository<ArticleStockEntity> {
    return this.tenantContext.getManager().getRepository(ArticleStockEntity);
  }

  async create(dto: CreateArticleStockDto, actingUserId: string): Promise<ArticleStockEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const article = await this.repository.save(
      this.repository.create({ ...dto, etablissementId, categorie: dto.categorie ?? null }),
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'logistique.article.create',
      ressource: 'article_stock',
      ressourceId: article.id,
    });

    return article;
  }

  async findAll(page: number, limit: number): Promise<PaginatedResult<ArticleStockEntity>> {
    const [items, total] = await this.repository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { nom: 'ASC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<ArticleStockEntity> {
    const article = await this.repository.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException('Article de stock introuvable.');
    }
    return article;
  }

  async update(id: string, dto: UpdateArticleStockDto, actingUserId: string): Promise<ArticleStockEntity> {
    const article = await this.findById(id);
    Object.assign(article, dto);
    const saved = await this.repository.save(article);

    await this.auditService.log({
      etablissementId: article.etablissementId,
      userId: actingUserId,
      action: 'logistique.article.update',
      ressource: 'article_stock',
      ressourceId: article.id,
      metadata: { quantite: article.quantite },
    });

    return saved;
  }

  /**
   * Décrément atomique : `UPDATE ... WHERE quantite >= $1` garantit qu'aucune utilisation
   * concurrente ne peut faire passer la quantité sous zéro — même pattern que
   * `StockMedicamentService.decrementer` (Phase 7). 0 ligne affectée = stock insuffisant.
   */
  async decrementer(articleStockId: string, quantite: number): Promise<ArticleStockEntity> {
    const [lignes] = await this.repository.query(
      `UPDATE clinic.articles_stock SET quantite = quantite - $1 WHERE id = $2 AND quantite >= $1 RETURNING id`,
      [quantite, articleStockId],
    );

    if (!lignes.length) {
      throw new ConflictException('Stock insuffisant pour cet article.');
    }

    const article = await this.findById(articleStockId);
    if (article.quantite <= article.seuilAlerte) {
      this.tenantContext.afterCommit(() => {
        this.realtimeGateway.emitToEtablissement(article.etablissementId, 'stock:alerte', {
          articleStockId: article.id,
          nom: article.nom,
          quantite: article.quantite,
          seuilAlerte: article.seuilAlerte,
        });
      });
    }

    return article;
  }
}
