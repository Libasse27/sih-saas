import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../infrastructure/entities/audit-log.entity';

export interface AuditEntry {
  etablissementId?: string | null;
  userId?: string | null;
  action: string;
  ressource?: string;
  ressourceId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLogEntity) private readonly repository: Repository<AuditLogEntity>) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.repository.save(
      this.repository.create({
        etablissementId: entry.etablissementId ?? null,
        userId: entry.userId ?? null,
        action: entry.action,
        ressource: entry.ressource ?? null,
        ressourceId: entry.ressourceId ?? null,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
        metadata: entry.metadata ?? null,
      }),
    );
  }

  /** Lecture seule — table append-only, voir audit-log.entity.ts. Console super-admin, Phase 9. */
  async findAll(page: number, limit: number, etablissementId?: string): Promise<PaginatedResult<AuditLogEntity>> {
    const [items, total] = await this.repository.findAndCount({
      where: etablissementId ? { etablissementId } : {},
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }
}
