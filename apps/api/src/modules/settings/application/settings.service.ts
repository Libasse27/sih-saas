import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentProviderType } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { RedisService } from '../../../shared/redis/redis.service';
import { AuditService } from '../../audit/application/audit.service';
import { SettingEntity } from '../infrastructure/entities/setting.entity';
import { UpdateSettingsDto } from '../presentation/dto/update-settings.dto';

/** Ligne unique — id figé plutôt qu'une table à plusieurs lignes ambiguës (voir setting.entity.ts). */
const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';
// Lu par MailService à chaque envoi et par PaymentsService à chaque initiation de paiement (Flux
// A) — jamais mis en cache avant la Phase 27, alors que ces réglages changent rarement.
const CACHE_KEY = 'cache:settings';
const CACHE_TTL_SECONDS = 300;

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SettingEntity) private readonly repository: Repository<SettingEntity>,
    private readonly auditService: AuditService,
    private readonly redis: RedisService,
  ) {}

  /** Find-or-create : aucune migration de seed séparée, la ligne par défaut apparaît au premier accès. */
  async getOrCreate(): Promise<SettingEntity> {
    const cached = await this.redis.getJSON<SettingEntity>(CACHE_KEY);
    if (cached) {
      return cached;
    }

    const existing = await this.repository.findOne({ where: { id: SETTINGS_ID } });
    const settings =
      existing ??
      (await this.repository.save(
        this.repository.create({
          id: SETTINGS_ID,
          email: { nomExpediteur: null, emailExpediteur: null, emailSupport: null },
          paiements: { actifs: true, passerelleActive: PaymentProviderType.SANDBOX },
        }),
      ));

    await this.redis.setJSON(CACHE_KEY, settings, CACHE_TTL_SECONDS);
    return settings;
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
    await this.redis.del(CACHE_KEY);

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
