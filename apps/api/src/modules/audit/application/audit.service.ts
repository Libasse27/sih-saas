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
}
