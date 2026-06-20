import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
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
}
