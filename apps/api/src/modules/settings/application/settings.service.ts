import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { SettingEntity } from '../infrastructure/entities/setting.entity';
import { UpdateSettingsDto } from '../presentation/dto/update-settings.dto';

/** Ligne unique — id figé plutôt qu'une table à plusieurs lignes ambiguës (voir setting.entity.ts). */
const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SettingEntity) private readonly repository: Repository<SettingEntity>,
    private readonly auditService: AuditService,
  ) {}

  /** Find-or-create : aucune migration de seed séparée, la ligne par défaut apparaît au premier accès. */
  async getOrCreate(): Promise<SettingEntity> {
    const existing = await this.repository.findOne({ where: { id: SETTINGS_ID } });
    if (existing) {
      return existing;
    }
    return this.repository.save(
      this.repository.create({
        id: SETTINGS_ID,
        email: { nomExpediteur: null, emailExpediteur: null, emailSupport: null },
        paiements: { actifs: true },
      }),
    );
  }

  async update(dto: UpdateSettingsDto, actingUserId: string): Promise<SettingEntity> {
    const settings = await this.getOrCreate();
    if (dto.email) {
      settings.email = { ...settings.email, ...dto.email };
    }
    if (dto.paiements) {
      settings.paiements = { ...settings.paiements, ...dto.paiements };
    }
    const saved = await this.repository.save(settings);

    await this.auditService.log({
      userId: actingUserId,
      action: 'setting.update',
      ressource: 'setting',
      ressourceId: saved.id,
      metadata: { email: saved.email, paiements: saved.paiements },
    });

    return saved;
  }
}
