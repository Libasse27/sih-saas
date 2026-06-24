# Module Bloc Opératoire — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend-only "Bloc Opératoire" module (salles d'opération, planification chirurgicale, équipe opératoire, check-list OMS, anesthésie, consommables, compte rendu opératoire) per `docs/superpowers/specs/2026-06-24-bloc-operatoire-design.md`.

**Architecture:** New self-contained NestJS module `BlocOperatoireModule` (`apps/api/src/modules/bloc-operatoire/`) following the exact pattern of the existing Urgences module: a flat board controller (`/salles-operation`, `/interventions`) for planning actions never requiring `CareContextGuard`, plus a patient-nested controller (`/patients/:patientId/interventions/:id/...`) for clinical actions that do. RLS-protected `clinic.*` tables, `tenantContext.getManager()` repository access, `ModuleMetier.BLOC_OPERATOIRE` plan-feature gating.

**Tech Stack:** NestJS, TypeORM (Postgres, schema `clinic`), class-validator/class-transformer, Jest.

## Global Constraints

- Every `clinic.*` table migration MUST call `enableTenantRls`/`disableTenantRls` (`apps/api/src/database/utils/enable-tenant-rls.util.ts`) — TypeORM `migration:generate` never adds RLS automatically.
- Every service touching a `clinic.*` entity MUST access it via `tenantContext.getManager().getRepository(Entity)` in a private getter — never `@InjectRepository` directly in a service.
- Every mutating service method MUST call `auditService.log(...)` with `action` in the form `<resource>.<verb>`.
- DTOs use `class-validator` decorators + `@nestjs/swagger` `@ApiProperty`/`@ApiPropertyOptional` — same style as `apps/api/src/modules/urgences/presentation/dto/*.ts`.
- Controllers: `@RequirePermissions(...)` for RBAC, `@UseGuards(PlanFeatureGuard)` + `@RequirePlanFeature(ModuleMetier.BLOC_OPERATOIRE)` at class level, `@UseGuards(CareContextGuard)` at method level only on the patient-nested controller.
- There is substantial **uncommitted** work already in the working tree from a prior session (the `ClinicalModule`→`ModuleMetier` rename across the whole codebase, plus a complete RH module) — verified buildable, all 446 existing tests passing. This plan builds directly on top of it (e.g. `ModuleMetier.BLOC_OPERATOIRE` already exists in `packages/shared/src/enums/module-metier.enum.ts`). Committing that prior work is a separate decision for the user — do not commit files outside this plan's own changes without being asked.
- Run `pnpm --filter @sih-saas/api build` and the relevant `pnpm --filter @sih-saas/api test -- <pattern>` after every task, before committing.

---

## Task 1: Shared package — enums + permissions

**Files:**
- Create: `packages/shared/src/enums/bloc-operatoire.enum.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/src/enums/permission.enum.ts`

**Interfaces:**
- Produces: `SalleOperationStatut` (`LIBRE`/`OCCUPEE`/`MAINTENANCE`), `InterventionStatut` (`PLANIFIEE`/`EN_COURS`/`TERMINEE`/`ANNULEE`), `RoleEquipeOperatoire` (`CHIRURGIEN_PRINCIPAL`/`CHIRURGIEN_AIDE`/`ANESTHESISTE`/`INFIRMIER_INSTRUMENTISTE`/`INFIRMIER_CIRCULANTE`), `TypeAnesthesie` (`GENERALE`/`LOCOREGIONALE`/`LOCALE`/`SEDATION`), `PhaseChecklistOms` (`SIGN_IN`/`TIME_OUT`/`SIGN_OUT`) — all from `@sih-saas/shared`.
- Produces: `Permission.BLOC_PLANIFICATION`, `Permission.BLOC_VIEW`, `Permission.BLOC_REALISATION`, `Permission.BLOC_COMPTE_RENDU`.

This package has no dedicated unit tests for enum files (confirmed: no `packages/shared/**/*.spec.ts` exist, e.g. `urgence.enum.ts`/`rh.enum.ts` have none either) — verification is the package build plus downstream tasks importing these symbols successfully.

- [ ] **Step 1: Create the enum file**

```ts
// packages/shared/src/enums/bloc-operatoire.enum.ts
// Référence : prompt maître §10.4 (module métier "Bloc Opératoire").

/** Même vocabulaire que LitStatut (Phase 6) — pas de nouveaux termes. */
export enum SalleOperationStatut {
  LIBRE = 'LIBRE',
  OCCUPEE = 'OCCUPEE',
  MAINTENANCE = 'MAINTENANCE',
}

export enum InterventionStatut {
  PLANIFIEE = 'PLANIFIEE',
  EN_COURS = 'EN_COURS',
  TERMINEE = 'TERMINEE',
  ANNULEE = 'ANNULEE',
}

export enum RoleEquipeOperatoire {
  CHIRURGIEN_PRINCIPAL = 'CHIRURGIEN_PRINCIPAL',
  CHIRURGIEN_AIDE = 'CHIRURGIEN_AIDE',
  ANESTHESISTE = 'ANESTHESISTE',
  INFIRMIER_INSTRUMENTISTE = 'INFIRMIER_INSTRUMENTISTE',
  INFIRMIER_CIRCULANTE = 'INFIRMIER_CIRCULANTE',
}

export enum TypeAnesthesie {
  GENERALE = 'GENERALE',
  LOCOREGIONALE = 'LOCOREGIONALE',
  LOCALE = 'LOCALE',
  SEDATION = 'SEDATION',
}

/** Les 3 phases de la check-list de sécurité chirurgicale de l'OMS — noms conservés en anglais,
 * terminologie internationale utilisée telle quelle par les équipes francophones. */
export enum PhaseChecklistOms {
  SIGN_IN = 'SIGN_IN',
  TIME_OUT = 'TIME_OUT',
  SIGN_OUT = 'SIGN_OUT',
}
```

- [ ] **Step 2: Export it from the package index**

In `packages/shared/src/index.ts`, add this line after `export * from './enums/rh.enum';`:

```ts
export * from './enums/bloc-operatoire.enum';
```

- [ ] **Step 3: Add the 4 new permissions**

In `packages/shared/src/enums/permission.enum.ts`, add this block right after `MESSAGE_READ = 'message:read',` and before the closing `}` of the `Permission` enum:

```ts

  // Bloc opératoire (prompt maître §10.4)
  BLOC_PLANIFICATION = 'bloc:planification',
  BLOC_VIEW = 'bloc:view',
  BLOC_REALISATION = 'bloc:realisation', // 🩺
  BLOC_COMPTE_RENDU = 'bloc:compte-rendu', // 🩺
```

Then add the two 🩺 permissions to `CARE_CONTEXT_PERMISSIONS` (same file), inside the `new Set([...])` call, after `Permission.URGENCE_ALERTE,`:

```ts
  Permission.BLOC_REALISATION,
  Permission.BLOC_COMPTE_RENDU,
```

- [ ] **Step 4: Build the shared package**

Run: `pnpm --filter @sih-saas/shared build`
Expected: exits 0, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/enums/bloc-operatoire.enum.ts packages/shared/src/index.ts packages/shared/src/enums/permission.enum.ts
git commit -m "feat(shared): enums et permissions du module Bloc Opératoire"
```

---

## Task 2: `LogistiqueService.decrementer` + RealtimeGateway wiring

**Files:**
- Modify: `apps/api/src/modules/logistique/application/logistique.service.ts`
- Modify: `apps/api/src/modules/logistique/application/logistique.service.spec.ts`
- Modify: `apps/api/src/modules/logistique/logistique.module.ts`

**Interfaces:**
- Consumes: `RealtimeGateway.emitToEtablissement(etablissementId: string, event: string, payload: unknown): void` (`apps/api/src/modules/notifications/presentation/realtime.gateway.ts`), `TenantContextService.afterCommit(cb: () => void): void`.
- Produces: `LogistiqueService.decrementer(articleStockId: string, quantite: number): Promise<ArticleStockEntity>` — atomic, throws `ConflictException` if insufficient stock. This is what `InterventionsService.enregistrerConsommable` (Task 4) will call.

This activates `ArticleStockEntity.seuilAlerte` (exists since Phase 11, never wired to a real decrement before now) — same atomic pattern as `StockMedicamentService.decrementer` (Phase 7).

- [ ] **Step 1: Write the failing tests**

Add to `apps/api/src/modules/logistique/application/logistique.service.spec.ts`, replacing the `service = new LogistiqueService(tenantContext as any, auditService as any);` line with:

```ts
    realtimeGateway = { emitToEtablissement: jest.fn() };
    tenantContext.afterCommit = jest.fn((cb: () => void) => cb());
    service = new LogistiqueService(tenantContext as any, auditService as any, realtimeGateway as any);
```

Add `let realtimeGateway: { emitToEtablissement: jest.Mock };` next to the other `let` declarations at the top of the `describe` block.

Add this `repository.query` mock to the `beforeEach`'s `repository = {...}` object: `query: jest.fn()`.

Add this new `describe` block at the end of the file, before the final closing `});`:

```ts
  describe('decrementer', () => {
    it('décrémente atomiquement et renvoie l’article à jour', async () => {
      repository.query.mockResolvedValue([[{ id: 'article-1' }], 1]);
      repository.findOne.mockResolvedValue({ id: 'article-1', etablissementId: 'etab-1', quantite: 480, seuilAlerte: 100 });

      const article = await service.decrementer('article-1', 20);

      expect(repository.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE clinic.articles_stock'), [20, 'article-1']);
      expect(article.quantite).toBe(480);
    });

    it('lève ConflictException si le stock est insuffisant (0 ligne affectée)', async () => {
      repository.query.mockResolvedValue([[], 0]);

      await expect(service.decrementer('article-1', 9999)).rejects.toThrow(ConflictException);
    });

    it('émet stock:alerte après commit si la quantité tombe sous le seuil', async () => {
      repository.query.mockResolvedValue([[{ id: 'article-1' }], 1]);
      repository.findOne.mockResolvedValue({ id: 'article-1', etablissementId: 'etab-1', quantite: 50, seuilAlerte: 100 });

      await service.decrementer('article-1', 20);

      expect(realtimeGateway.emitToEtablissement).toHaveBeenCalledWith(
        'etab-1',
        'stock:alerte',
        expect.objectContaining({ articleStockId: 'article-1', quantite: 50, seuilAlerte: 100 }),
      );
    });

    it('n’émet rien si la quantité reste au-dessus du seuil', async () => {
      repository.query.mockResolvedValue([[{ id: 'article-1' }], 1]);
      repository.findOne.mockResolvedValue({ id: 'article-1', etablissementId: 'etab-1', quantite: 480, seuilAlerte: 100 });

      await service.decrementer('article-1', 20);

      expect(realtimeGateway.emitToEtablissement).not.toHaveBeenCalled();
    });
  });
```

Add `ConflictException` to the existing `import { NotFoundException } from '@nestjs/common';` line, making it `import { ConflictException, NotFoundException } from '@nestjs/common';`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @sih-saas/api test -- logistique.service`
Expected: FAIL — `LogistiqueService.decrementer is not a function` and a constructor-arity error.

- [ ] **Step 3: Implement `decrementer` and wire `RealtimeGateway`**

In `apps/api/src/modules/logistique/application/logistique.service.ts`, change the imports and constructor:

```ts
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
```

Add this method at the end of the class, before the closing `}`:

```ts

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
```

- [ ] **Step 4: Wire `NotificationsModule` into `LogistiqueModule`**

In `apps/api/src/modules/logistique/logistique.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { LogistiqueService } from './application/logistique.service';
import { ArticleStockEntity } from './infrastructure/entities/article-stock.entity';
import { LogistiqueController } from './presentation/logistique.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ArticleStockEntity]), SubscriptionsModule, NotificationsModule, AuditModule],
  controllers: [LogistiqueController],
  providers: [LogistiqueService],
  exports: [LogistiqueService],
})
export class LogistiqueModule {}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @sih-saas/api test -- logistique.service`
Expected: PASS, all tests including the 4 new ones.

- [ ] **Step 6: Build and run the full suite to check for regressions**

Run: `pnpm --filter @sih-saas/api build`
Expected: exits 0.

Run: `pnpm --filter @sih-saas/api test`
Expected: all suites pass (was 82 suites/446 tests before this task — this task adds tests to an existing suite, no new suite, so the count of test cases increases but the suite count for this file stays the same).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/logistique/application/logistique.service.ts apps/api/src/modules/logistique/application/logistique.service.spec.ts apps/api/src/modules/logistique/logistique.module.ts
git commit -m "feat(logistique): décrément atomique de stock + alerte de seuil temps réel"
```

---

## Task 3: `SalleOperationEntity` + `SallesOperationService`

**Files:**
- Create: `apps/api/src/modules/bloc-operatoire/infrastructure/entities/salle-operation.entity.ts`
- Create: `apps/api/src/modules/bloc-operatoire/application/paginated-result.ts`
- Create: `apps/api/src/modules/bloc-operatoire/application/salles-operation.service.ts`
- Create: `apps/api/src/modules/bloc-operatoire/application/salles-operation.service.spec.ts`
- Create: `apps/api/src/modules/bloc-operatoire/presentation/dto/create-salle-operation.dto.ts`
- Create: `apps/api/src/modules/bloc-operatoire/presentation/dto/update-salle-operation.dto.ts`

**Interfaces:**
- Consumes: `TenantContextService` (`getManager()`, `getEtablissementId()`), `AuditService.log(entry)` — both from Task 1/existing infra, no new signatures.
- Produces: `SalleOperationEntity { id, etablissementId, nom, equipement, statut: SalleOperationStatut, createdAt, updatedAt }`. `SallesOperationService.findById(id): Promise<SalleOperationEntity>` (throws `NotFoundException`) and `SallesOperationService.changerStatutOccupation(id, statut: SalleOperationStatut): Promise<SalleOperationEntity>` — **both consumed directly by Task 4's `InterventionsService`**.

This is the first piece of the new module — no module file yet (that's Task 5); the spec instantiates the service directly with mocked dependencies, same pattern as `urgences.service.spec.ts`.

- [ ] **Step 1: Create the entity**

```ts
// apps/api/src/modules/bloc-operatoire/infrastructure/entities/salle-operation.entity.ts
import { SalleOperationStatut } from '@sih-saas/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Salle d'opération (prompt maître §10.4, module "Bloc Opératoire") — distincte de `ChambreEntity`
 * (Phase 6) : pas d'occupation patient sur plusieurs jours. `statut` reflète l'occupation
 * *courante* du bloc, piloté automatiquement par `InterventionsService` (démarrage/clôture),
 * jamais par une action manuelle (voir `SallesOperationService.update`, même garde que
 * `LitsService.changerStatutStructurel`).
 */
@Entity({ schema: 'clinic', name: 'salles_operation' })
@Index(['etablissementId'])
export class SalleOperationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column()
  nom: string;

  @Column({ type: 'text', nullable: true })
  equipement: string | null;

  @Column({ type: 'enum', enum: SalleOperationStatut, default: SalleOperationStatut.LIBRE })
  statut: SalleOperationStatut;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
```

- [ ] **Step 2: Create the paginated-result interface and DTOs**

```ts
// apps/api/src/modules/bloc-operatoire/application/paginated-result.ts
export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

```ts
// apps/api/src/modules/bloc-operatoire/presentation/dto/create-salle-operation.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateSalleOperationDto {
  @ApiProperty()
  @IsString()
  nom: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  equipement?: string;
}
```

```ts
// apps/api/src/modules/bloc-operatoire/presentation/dto/update-salle-operation.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SalleOperationStatut } from '@sih-saas/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateSalleOperationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  equipement?: string;

  @ApiPropertyOptional({
    enum: SalleOperationStatut,
    description: 'LIBRE ou MAINTENANCE uniquement — OCCUPEE est piloté automatiquement par une intervention.',
  })
  @IsOptional()
  @IsEnum(SalleOperationStatut)
  statut?: SalleOperationStatut;
}
```

- [ ] **Step 3: Write the failing test**

```ts
// apps/api/src/modules/bloc-operatoire/application/salles-operation.service.spec.ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalleOperationStatut } from '@sih-saas/shared';
import { SallesOperationService } from './salles-operation.service';

describe('SallesOperationService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: SallesOperationService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({ id: 'salle-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };
    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: () => repository })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
    };
    auditService = { log: jest.fn() };

    service = new SallesOperationService(tenantContext as any, auditService as any);
  });

  describe('create', () => {
    it('crée une salle LIBRE rattachée au tenant courant et journalise', async () => {
      const salle = await service.create({ nom: 'Salle 1', equipement: 'Bistouri électrique' }, 'user-1');

      expect(salle.etablissementId).toBe('etab-1');
      expect(salle.statut).toBe(SalleOperationStatut.LIBRE);
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'salle-operation.create' }));
    });
  });

  describe('findById', () => {
    it('lève NotFoundException si la salle est introuvable', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById('inconnue')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('refuse de fixer manuellement le statut à OCCUPEE', async () => {
      await expect(service.update('salle-1', { statut: SalleOperationStatut.OCCUPEE }, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('autorise le passage manuel à MAINTENANCE', async () => {
      repository.findOne.mockResolvedValue({ id: 'salle-1', etablissementId: 'etab-1', statut: SalleOperationStatut.LIBRE });

      const salle = await service.update('salle-1', { statut: SalleOperationStatut.MAINTENANCE }, 'user-1');

      expect(salle.statut).toBe(SalleOperationStatut.MAINTENANCE);
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'salle-operation.update' }));
    });
  });

  describe('changerStatutOccupation', () => {
    it('bascule le statut sans passer par la garde de update (réservé à InterventionsService)', async () => {
      repository.findOne.mockResolvedValue({ id: 'salle-1', etablissementId: 'etab-1', statut: SalleOperationStatut.LIBRE });

      const salle = await service.changerStatutOccupation('salle-1', SalleOperationStatut.OCCUPEE);

      expect(salle.statut).toBe(SalleOperationStatut.OCCUPEE);
    });
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm --filter @sih-saas/api test -- salles-operation.service`
Expected: FAIL — `Cannot find module './salles-operation.service'`.

- [ ] **Step 5: Implement the service**

```ts
// apps/api/src/modules/bloc-operatoire/application/salles-operation.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SalleOperationStatut } from '@sih-saas/shared';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/application/audit.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { CreateSalleOperationDto } from '../presentation/dto/create-salle-operation.dto';
import { UpdateSalleOperationDto } from '../presentation/dto/update-salle-operation.dto';
import { SalleOperationEntity } from '../infrastructure/entities/salle-operation.entity';
import { PaginatedResult } from './paginated-result';

/** `clinic.salles_operation` est protégée par RLS — convention tenantContext.getManager(). */
@Injectable()
export class SallesOperationService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
  ) {}

  private get repository(): Repository<SalleOperationEntity> {
    return this.tenantContext.getManager().getRepository(SalleOperationEntity);
  }

  async create(dto: CreateSalleOperationDto, actingUserId: string): Promise<SalleOperationEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    const salle = await this.repository.save(
      this.repository.create({
        etablissementId,
        nom: dto.nom,
        equipement: dto.equipement ?? null,
        statut: SalleOperationStatut.LIBRE,
      }),
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'salle-operation.create',
      ressource: 'salle_operation',
      ressourceId: salle.id,
    });

    return salle;
  }

  async findAll(page: number, limit: number): Promise<PaginatedResult<SalleOperationEntity>> {
    const [items, total] = await this.repository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { nom: 'ASC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<SalleOperationEntity> {
    const salle = await this.repository.findOne({ where: { id } });
    if (!salle) {
      throw new NotFoundException('Salle d’opération introuvable.');
    }
    return salle;
  }

  async update(id: string, dto: UpdateSalleOperationDto, actingUserId: string): Promise<SalleOperationEntity> {
    if (dto.statut === SalleOperationStatut.OCCUPEE) {
      throw new BadRequestException("Le statut OCCUPEE ne se fixe qu'en démarrant une intervention (PATCH .../demarrer).");
    }

    const salle = await this.findById(id);
    Object.assign(salle, dto);
    const saved = await this.repository.save(salle);

    await this.auditService.log({
      etablissementId: salle.etablissementId,
      userId: actingUserId,
      action: 'salle-operation.update',
      ressource: 'salle_operation',
      ressourceId: salle.id,
      metadata: { statut: saved.statut },
    });

    return saved;
  }

  /** Réservé à InterventionsService — bascule automatique LIBRE/OCCUPEE (démarrage/clôture). */
  async changerStatutOccupation(id: string, statut: SalleOperationStatut): Promise<SalleOperationEntity> {
    const salle = await this.findById(id);
    salle.statut = statut;
    return this.repository.save(salle);
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @sih-saas/api test -- salles-operation.service`
Expected: PASS, all 6 tests.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/bloc-operatoire/infrastructure/entities/salle-operation.entity.ts apps/api/src/modules/bloc-operatoire/application/paginated-result.ts apps/api/src/modules/bloc-operatoire/application/salles-operation.service.ts apps/api/src/modules/bloc-operatoire/application/salles-operation.service.spec.ts apps/api/src/modules/bloc-operatoire/presentation/dto/create-salle-operation.dto.ts apps/api/src/modules/bloc-operatoire/presentation/dto/update-salle-operation.dto.ts
git commit -m "feat(bloc-operatoire): entité SalleOperation + service CRUD"
```

---

## Task 4: `InterventionsService` — entités, DTOs et logique complète

This is the core of the module. One service backs both controllers built in Task 5 (`InterventionsController` flat + `InterventionsPatientController` nested) — same shape as `UrgencesService`, which backs `UrgencesController`/`UrgencesPatientController`. Keeping it one file/one task (rather than splitting "planning" vs "clinical" methods across two tasks) avoids reviewing one half of a tightly-coupled class without the other.

**Files:**
- Create: `apps/api/src/modules/bloc-operatoire/infrastructure/entities/intervention.entity.ts`
- Create: `apps/api/src/modules/bloc-operatoire/infrastructure/entities/equipe-operatoire.entity.ts`
- Create: `apps/api/src/modules/bloc-operatoire/infrastructure/entities/anesthesie.entity.ts`
- Create: `apps/api/src/modules/bloc-operatoire/infrastructure/entities/compte-rendu-operatoire.entity.ts`
- Create: `apps/api/src/modules/bloc-operatoire/infrastructure/entities/consommable-intervention.entity.ts`
- Create: `apps/api/src/modules/bloc-operatoire/presentation/dto/create-intervention.dto.ts`
- Create: `apps/api/src/modules/bloc-operatoire/presentation/dto/update-intervention.dto.ts`
- Create: `apps/api/src/modules/bloc-operatoire/presentation/dto/ajouter-membre-equipe.dto.ts`
- Create: `apps/api/src/modules/bloc-operatoire/presentation/dto/valider-checklist.dto.ts`
- Create: `apps/api/src/modules/bloc-operatoire/presentation/dto/create-anesthesie.dto.ts`
- Create: `apps/api/src/modules/bloc-operatoire/presentation/dto/create-surveillance-anesthesie.dto.ts`
- Create: `apps/api/src/modules/bloc-operatoire/presentation/dto/create-consommable-intervention.dto.ts`
- Create: `apps/api/src/modules/bloc-operatoire/presentation/dto/create-compte-rendu-operatoire.dto.ts`
- Create: `apps/api/src/modules/bloc-operatoire/application/interventions.service.ts`
- Create: `apps/api/src/modules/bloc-operatoire/application/interventions.service.spec.ts`

**Interfaces:**
- Consumes: `SallesOperationService.findById`/`changerStatutOccupation` (Task 3) ; `LogistiqueService.decrementer` (Task 2) ; `PatientsService.findById(id): Promise<PatientEntity>` ; `AdmissionsService.findById(id): Promise<AdmissionEntity>` ; `DossierMedicalService.ajouterCompteRendu(patientId, {auteurId, type, contenu}, etablissementId)` ; `RealtimeGateway.emitToEtablissement` ; `AuditService.log`.
- Produces: `InterventionsService` with methods `create`, `findAll`, `findById`, `findDetailComplet`, `update`, `annuler`, `ajouterMembreEquipe`, `retirerMembreEquipe`, `demarrer`, `validerChecklist`, `creerOuCompleterAnesthesie`, `ajouterSurveillanceAnesthesie`, `enregistrerConsommable`, `terminer`, `redigerCompteRendu` — **all consumed directly by Task 5's two controllers**, exact signatures as implemented below.

- [ ] **Step 1: Create the 5 entities**

```ts
// apps/api/src/modules/bloc-operatoire/infrastructure/entities/intervention.entity.ts
import { InterventionStatut } from '@sih-saas/shared';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export interface ChecklistPhaseEtat {
  valide: boolean;
  valideParId: string | null;
  valideLe: string | null;
}

export interface ChecklistOms {
  signIn: ChecklistPhaseEtat;
  timeOut: ChecklistPhaseEtat;
  signOut: ChecklistPhaseEtat;
}

export const CHECKLIST_OMS_INITIALE: ChecklistOms = {
  signIn: { valide: false, valideParId: null, valideLe: null },
  timeOut: { valide: false, valideParId: null, valideLe: null },
  signOut: { valide: false, valideParId: null, valideLe: null },
};

/**
 * Intervention chirurgicale (prompt maître §10.4) — liée directement à `patientId` (comme
 * `Consultation`/`Prescription`), `admissionId` optionnel (chirurgie ambulatoire possible). Voir
 * docs/superpowers/specs/2026-06-24-bloc-operatoire-design.md.
 */
@Entity({ schema: 'clinic', name: 'interventions' })
@Index(['etablissementId'])
@Index(['etablissementId', 'patientId'])
@Index(['etablissementId', 'salleOperationId'])
export class InterventionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @Column({ type: 'uuid', nullable: true })
  admissionId: string | null;

  @Column({ type: 'uuid' })
  salleOperationId: string;

  @Column({ type: 'uuid' })
  chirurgienPrincipalId: string;

  @Column()
  typeIntervention: string;

  @Column({ type: 'enum', enum: InterventionStatut, default: InterventionStatut.PLANIFIEE })
  statut: InterventionStatut;

  @Column({ type: 'timestamptz' })
  dateHeurePrevue: Date;

  @Column({ type: 'int', nullable: true })
  dureeEstimeeMinutes: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  dateHeureDebutReelle: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  dateHeureFinReelle: Date | null;

  @Column({ type: 'jsonb' })
  checklistOms: ChecklistOms;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
```

```ts
// apps/api/src/modules/bloc-operatoire/infrastructure/entities/equipe-operatoire.entity.ts
import { RoleEquipeOperatoire } from '@sih-saas/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Une ligne par membre par intervention — traçabilité "qui a opéré qui", pas d'équipes-modèles réutilisables. */
@Entity({ schema: 'clinic', name: 'equipes_operatoire' })
@Index(['etablissementId'])
@Index(['etablissementId', 'interventionId'])
export class EquipeOperatoireEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  interventionId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: RoleEquipeOperatoire })
  role: RoleEquipeOperatoire;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
```

```ts
// apps/api/src/modules/bloc-operatoire/infrastructure/entities/anesthesie.entity.ts
import { TypeAnesthesie } from '@sih-saas/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export interface ProduitAnesthesie {
  nom: string;
  dose: string;
  voie: string;
}

export interface ReleveSurveillanceAnesthesie {
  heure: string;
  tensionArterielle: string | null;
  pouls: number | null;
  saturationO2: number | null;
  observation: string | null;
}

/** Une seule par intervention (unique sur interventionId) — produits/surveillance en jsonb : volume
 * attendu plus faible que SurveillanceUrgenceEntity (quelques relevés par intervention, pas un flux
 * continu multi-jours). */
@Entity({ schema: 'clinic', name: 'anesthesies' })
@Index(['etablissementId'])
@Index(['interventionId'], { unique: true })
export class AnesthesieEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  interventionId: string;

  @Column({ type: 'uuid' })
  anesthesisteId: string;

  @Column({ type: 'enum', enum: TypeAnesthesie })
  type: TypeAnesthesie;

  @Column({ type: 'int', nullable: true })
  scoreAsa: number | null;

  @Column({ type: 'jsonb' })
  produits: ProduitAnesthesie[];

  @Column({ type: 'jsonb' })
  surveillance: ReleveSurveillanceAnesthesie[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
```

```ts
// apps/api/src/modules/bloc-operatoire/infrastructure/entities/compte-rendu-operatoire.entity.ts
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Une seule par intervention — répliquée dans le DME Mongo via DossierMedicalService.ajouterCompteRendu. */
@Entity({ schema: 'clinic', name: 'comptes_rendus_operatoires' })
@Index(['etablissementId'])
@Index(['interventionId'], { unique: true })
export class CompteRenduOperatoireEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  interventionId: string;

  @Column({ type: 'uuid' })
  redacteurId: string;

  @Column({ type: 'text' })
  diagnosticPreOperatoire: string;

  @Column({ type: 'text' })
  diagnosticPostOperatoire: string;

  @Column({ type: 'text' })
  techniqueUtilisee: string;

  @Column({ type: 'text', nullable: true })
  incidents: string | null;

  @Column({ type: 'text' })
  contenu: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
```

```ts
// apps/api/src/modules/bloc-operatoire/infrastructure/entities/consommable-intervention.entity.ts
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Décrémente réellement clinic.articles_stock (module Logistique) à la création — voir LogistiqueService.decrementer. */
@Entity({ schema: 'clinic', name: 'consommables_intervention' })
@Index(['etablissementId'])
@Index(['etablissementId', 'interventionId'])
export class ConsommableInterventionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  interventionId: string;

  @Column({ type: 'uuid' })
  articleStockId: string;

  @Column({ type: 'int' })
  quantite: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
```

- [ ] **Step 2: Create the DTOs**

```ts
// apps/api/src/modules/bloc-operatoire/presentation/dto/create-intervention.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateInterventionDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  admissionId?: string;

  @ApiProperty()
  @IsUUID()
  salleOperationId: string;

  @ApiProperty()
  @IsUUID()
  chirurgienPrincipalId: string;

  @ApiProperty()
  @IsString()
  typeIntervention: string;

  @ApiProperty()
  @IsDateString()
  dateHeurePrevue: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  dureeEstimeeMinutes?: number;
}
```

```ts
// apps/api/src/modules/bloc-operatoire/presentation/dto/update-intervention.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpdateInterventionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  salleOperationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateHeurePrevue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  dureeEstimeeMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  typeIntervention?: string;
}
```

```ts
// apps/api/src/modules/bloc-operatoire/presentation/dto/ajouter-membre-equipe.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { RoleEquipeOperatoire } from '@sih-saas/shared';
import { IsEnum, IsUUID } from 'class-validator';

export class AjouterMembreEquipeDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: RoleEquipeOperatoire })
  @IsEnum(RoleEquipeOperatoire)
  role: RoleEquipeOperatoire;
}
```

```ts
// apps/api/src/modules/bloc-operatoire/presentation/dto/valider-checklist.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { PhaseChecklistOms } from '@sih-saas/shared';
import { IsEnum } from 'class-validator';

export class ValiderChecklistDto {
  @ApiProperty({ enum: PhaseChecklistOms })
  @IsEnum(PhaseChecklistOms)
  phase: PhaseChecklistOms;
}
```

```ts
// apps/api/src/modules/bloc-operatoire/presentation/dto/create-anesthesie.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TypeAnesthesie } from '@sih-saas/shared';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class ProduitAnesthesieDto {
  @ApiProperty()
  @IsString()
  nom: string;

  @ApiProperty()
  @IsString()
  dose: string;

  @ApiProperty()
  @IsString()
  voie: string;
}

export class CreateAnesthesieDto {
  @ApiProperty({ enum: TypeAnesthesie })
  @IsEnum(TypeAnesthesie)
  type: TypeAnesthesie;

  @ApiPropertyOptional({ description: 'Score ASA, 1 à 5.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  scoreAsa?: number;

  @ApiPropertyOptional({ type: [ProduitAnesthesieDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProduitAnesthesieDto)
  produits?: ProduitAnesthesieDto[];
}
```

```ts
// apps/api/src/modules/bloc-operatoire/presentation/dto/create-surveillance-anesthesie.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateSurveillanceAnesthesieDto {
  @ApiPropertyOptional({ example: '120/80' })
  @IsOptional()
  @IsString()
  tensionArterielle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  pouls?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  saturationO2?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observation?: string;
}
```

```ts
// apps/api/src/modules/bloc-operatoire/presentation/dto/create-consommable-intervention.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateConsommableInterventionDto {
  @ApiProperty()
  @IsUUID()
  articleStockId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantite: number;
}
```

```ts
// apps/api/src/modules/bloc-operatoire/presentation/dto/create-compte-rendu-operatoire.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCompteRenduOperatoireDto {
  @ApiProperty()
  @IsString()
  diagnosticPreOperatoire: string;

  @ApiProperty()
  @IsString()
  diagnosticPostOperatoire: string;

  @ApiProperty()
  @IsString()
  techniqueUtilisee: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  incidents?: string;

  @ApiProperty()
  @IsString()
  contenu: string;
}
```

- [ ] **Step 3: Write the failing test**

```ts
// apps/api/src/modules/bloc-operatoire/application/interventions.service.spec.ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { InterventionStatut, PhaseChecklistOms, RoleEquipeOperatoire, SalleOperationStatut, TypeAnesthesie } from '@sih-saas/shared';
import { InterventionsService } from './interventions.service';

describe('InterventionsService', () => {
  let repository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock; find: jest.Mock };
  let equipeRepository: { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock; remove: jest.Mock };
  let anesthesieRepository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock };
  let consommablesRepository: { create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let compteRenduRepository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock };
  let tenantContext: { getManager: jest.Mock; getEtablissementId: jest.Mock; afterCommit: jest.Mock };
  let patientsService: { findById: jest.Mock };
  let admissionsService: { findById: jest.Mock };
  let sallesOperationService: { findById: jest.Mock; changerStatutOccupation: jest.Mock };
  let logistiqueService: { decrementer: jest.Mock };
  let dossierMedicalService: { ajouterCompteRendu: jest.Mock };
  let auditService: { log: jest.Mock };
  let realtimeGateway: { emitToEtablissement: jest.Mock };
  let service: InterventionsService;

  const repositoriesByEntity: Record<string, unknown> = {};

  beforeEach(() => {
    repository = {
      create: jest.fn((e) => e),
      save: jest.fn((e) => ({ id: 'intervention-1', ...e })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    equipeRepository = {
      create: jest.fn((e) => e),
      save: jest.fn((e) => ({ id: 'membre-1', ...e })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    anesthesieRepository = { create: jest.fn((e) => e), save: jest.fn((e) => ({ id: 'anesthesie-1', ...e })), findOne: jest.fn() };
    consommablesRepository = { create: jest.fn((e) => e), save: jest.fn((e) => ({ id: 'consommable-1', ...e })), find: jest.fn().mockResolvedValue([]) };
    compteRenduRepository = { create: jest.fn((e) => e), save: jest.fn((e) => ({ id: 'compte-rendu-1', ...e })), findOne: jest.fn() };

    repositoriesByEntity['InterventionEntity'] = repository;
    repositoriesByEntity['EquipeOperatoireEntity'] = equipeRepository;
    repositoriesByEntity['AnesthesieEntity'] = anesthesieRepository;
    repositoriesByEntity['ConsommableInterventionEntity'] = consommablesRepository;
    repositoriesByEntity['CompteRenduOperatoireEntity'] = compteRenduRepository;

    tenantContext = {
      getManager: jest.fn(() => ({ getRepository: (entity: { name: string }) => repositoriesByEntity[entity.name] })),
      getEtablissementId: jest.fn().mockReturnValue('etab-1'),
      afterCommit: jest.fn((callback: () => void) => callback()),
    };
    patientsService = { findById: jest.fn().mockResolvedValue({ id: 'patient-1', etablissementId: 'etab-1' }) };
    admissionsService = { findById: jest.fn().mockResolvedValue({ id: 'admission-1' }) };
    sallesOperationService = {
      findById: jest.fn().mockResolvedValue({ id: 'salle-1', statut: SalleOperationStatut.LIBRE }),
      changerStatutOccupation: jest.fn().mockResolvedValue({ id: 'salle-1' }),
    };
    logistiqueService = { decrementer: jest.fn().mockResolvedValue({ id: 'article-1', quantite: 80 }) };
    dossierMedicalService = { ajouterCompteRendu: jest.fn().mockResolvedValue({}) };
    auditService = { log: jest.fn() };
    realtimeGateway = { emitToEtablissement: jest.fn() };

    service = new InterventionsService(
      tenantContext as any,
      patientsService as any,
      admissionsService as any,
      sallesOperationService as any,
      logistiqueService as any,
      dossierMedicalService as any,
      auditService as any,
      realtimeGateway as any,
    );
  });

  describe('create', () => {
    const dto = {
      patientId: 'patient-1',
      salleOperationId: 'salle-1',
      chirurgienPrincipalId: 'chirurgien-1',
      typeIntervention: 'Appendicectomie',
      dateHeurePrevue: '2026-07-01T08:00:00.000Z',
      dureeEstimeeMinutes: 60,
    };

    it('crée l’intervention PLANIFIEE, le chirurgien principal comme membre d’équipe, et journalise', async () => {
      const intervention = await service.create(dto, 'user-1');

      expect(intervention.statut).toBe(InterventionStatut.PLANIFIEE);
      expect(patientsService.findById).toHaveBeenCalledWith('patient-1');
      expect(sallesOperationService.findById).toHaveBeenCalledWith('salle-1');
      expect(equipeRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'chirurgien-1', role: RoleEquipeOperatoire.CHIRURGIEN_PRINCIPAL }),
      );
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'intervention.create' }));
    });

    it('refuse un créneau qui chevauche une intervention déjà planifiée sur la même salle', async () => {
      repository.find.mockResolvedValue([
        {
          id: 'intervention-existante',
          salleOperationId: 'salle-1',
          statut: InterventionStatut.PLANIFIEE,
          dateHeurePrevue: new Date('2026-07-01T08:30:00.000Z'),
          dureeEstimeeMinutes: 60,
        },
      ]);

      await expect(service.create(dto, 'user-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('annuler', () => {
    it('refuse d’annuler une intervention qui n’est plus PLANIFIEE', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.EN_COURS, etablissementId: 'etab-1' });

      await expect(service.annuler('intervention-1', 'user-1')).rejects.toThrow(ConflictException);
    });

    it('annule une intervention PLANIFIEE', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.PLANIFIEE, etablissementId: 'etab-1' });

      const intervention = await service.annuler('intervention-1', 'user-1');

      expect(intervention.statut).toBe(InterventionStatut.ANNULEE);
    });
  });

  describe('retirerMembreEquipe', () => {
    it('lève NotFoundException si le membre est introuvable', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', etablissementId: 'etab-1' });
      equipeRepository.findOne.mockResolvedValue(null);

      await expect(service.retirerMembreEquipe('intervention-1', 'membre-inconnu', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('demarrer', () => {
    it('refuse si l’intervention n’est pas PLANIFIEE', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.TERMINEE, etablissementId: 'etab-1' });

      await expect(service.demarrer('intervention-1', 'user-1')).rejects.toThrow(ConflictException);
    });

    it('passe l’intervention EN_COURS, occupe la salle, et diffuse après commit', async () => {
      repository.findOne.mockResolvedValue({
        id: 'intervention-1',
        statut: InterventionStatut.PLANIFIEE,
        etablissementId: 'etab-1',
        salleOperationId: 'salle-1',
      });

      const intervention = await service.demarrer('intervention-1', 'user-1');

      expect(intervention.statut).toBe(InterventionStatut.EN_COURS);
      expect(intervention.dateHeureDebutReelle).toBeInstanceOf(Date);
      expect(sallesOperationService.changerStatutOccupation).toHaveBeenCalledWith('salle-1', SalleOperationStatut.OCCUPEE);
      expect(realtimeGateway.emitToEtablissement).toHaveBeenCalledWith('etab-1', 'bloc:salle.updated', expect.objectContaining({ salleOperationId: 'salle-1' }));
    });
  });

  describe('validerChecklist', () => {
    it('refuse si l’intervention n’est pas EN_COURS', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.PLANIFIEE, etablissementId: 'etab-1' });

      await expect(service.validerChecklist('intervention-1', { phase: PhaseChecklistOms.SIGN_IN }, 'user-1')).rejects.toThrow(ConflictException);
    });

    it('valide la phase signIn sans toucher aux autres phases', async () => {
      repository.findOne.mockResolvedValue({
        id: 'intervention-1',
        statut: InterventionStatut.EN_COURS,
        etablissementId: 'etab-1',
        checklistOms: {
          signIn: { valide: false, valideParId: null, valideLe: null },
          timeOut: { valide: false, valideParId: null, valideLe: null },
          signOut: { valide: false, valideParId: null, valideLe: null },
        },
      });

      const intervention = await service.validerChecklist('intervention-1', { phase: PhaseChecklistOms.SIGN_IN }, 'user-1');

      expect(intervention.checklistOms.signIn.valide).toBe(true);
      expect(intervention.checklistOms.signIn.valideParId).toBe('user-1');
      expect(intervention.checklistOms.timeOut.valide).toBe(false);
    });
  });

  describe('creerOuCompleterAnesthesie', () => {
    it('crée un premier relevé d’anesthésie si aucun n’existe', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.EN_COURS, etablissementId: 'etab-1' });
      anesthesieRepository.findOne.mockResolvedValue(null);

      const anesthesie = await service.creerOuCompleterAnesthesie('intervention-1', { type: TypeAnesthesie.GENERALE }, 'anesthesiste-1');

      expect(anesthesie.type).toBe(TypeAnesthesie.GENERALE);
      expect(anesthesie.anesthesisteId).toBe('anesthesiste-1');
    });

    it('complète le relevé existant plutôt que d’en créer un second', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.EN_COURS, etablissementId: 'etab-1' });
      anesthesieRepository.findOne.mockResolvedValue({ id: 'anesthesie-1', interventionId: 'intervention-1', scoreAsa: null, produits: [] });

      const anesthesie = await service.creerOuCompleterAnesthesie('intervention-1', { type: TypeAnesthesie.GENERALE, scoreAsa: 2 }, 'anesthesiste-1');

      expect(anesthesie.scoreAsa).toBe(2);
      expect(anesthesieRepository.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'anesthesie-1' }));
    });
  });

  describe('ajouterSurveillanceAnesthesie', () => {
    it('lève NotFoundException si aucune anesthésie n’existe encore', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.EN_COURS, etablissementId: 'etab-1' });
      anesthesieRepository.findOne.mockResolvedValue(null);

      await expect(service.ajouterSurveillanceAnesthesie('intervention-1', { pouls: 80 }, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('ajoute un relevé à la liste existante', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.EN_COURS, etablissementId: 'etab-1' });
      anesthesieRepository.findOne.mockResolvedValue({ id: 'anesthesie-1', interventionId: 'intervention-1', surveillance: [] });

      const anesthesie = await service.ajouterSurveillanceAnesthesie('intervention-1', { pouls: 80 }, 'user-1');

      expect(anesthesie.surveillance).toHaveLength(1);
      expect(anesthesie.surveillance[0]).toEqual(expect.objectContaining({ pouls: 80 }));
    });
  });

  describe('enregistrerConsommable', () => {
    it('décrémente le stock Logistique puis consigne le consommable', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.EN_COURS, etablissementId: 'etab-1' });

      const consommable = await service.enregistrerConsommable('intervention-1', { articleStockId: 'article-1', quantite: 3 }, 'user-1');

      expect(logistiqueService.decrementer).toHaveBeenCalledWith('article-1', 3);
      expect(consommable).toEqual(expect.objectContaining({ articleStockId: 'article-1', quantite: 3 }));
    });
  });

  describe('terminer', () => {
    it('passe l’intervention TERMINEE et libère la salle', async () => {
      repository.findOne.mockResolvedValue({
        id: 'intervention-1',
        statut: InterventionStatut.EN_COURS,
        etablissementId: 'etab-1',
        salleOperationId: 'salle-1',
      });

      const intervention = await service.terminer('intervention-1', 'user-1');

      expect(intervention.statut).toBe(InterventionStatut.TERMINEE);
      expect(intervention.dateHeureFinReelle).toBeInstanceOf(Date);
      expect(sallesOperationService.changerStatutOccupation).toHaveBeenCalledWith('salle-1', SalleOperationStatut.LIBRE);
    });
  });

  describe('redigerCompteRendu', () => {
    const dto = {
      diagnosticPreOperatoire: 'Appendicite aiguë',
      diagnosticPostOperatoire: 'Appendicite confirmée',
      techniqueUtilisee: 'Cœlioscopie',
      contenu: 'Intervention sans complication.',
    };

    it('refuse si l’intervention n’est pas TERMINEE', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.EN_COURS, etablissementId: 'etab-1' });

      await expect(service.redigerCompteRendu('intervention-1', dto, 'chirurgien-1')).rejects.toThrow(ConflictException);
    });

    it('refuse un second compte rendu pour la même intervention', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.TERMINEE, etablissementId: 'etab-1', patientId: 'patient-1' });
      compteRenduRepository.findOne.mockResolvedValue({ id: 'compte-rendu-existant' });

      await expect(service.redigerCompteRendu('intervention-1', dto, 'chirurgien-1')).rejects.toThrow(ConflictException);
    });

    it('crée le compte rendu et le réplique dans le DME', async () => {
      repository.findOne.mockResolvedValue({ id: 'intervention-1', statut: InterventionStatut.TERMINEE, etablissementId: 'etab-1', patientId: 'patient-1' });
      compteRenduRepository.findOne.mockResolvedValue(null);

      const compteRendu = await service.redigerCompteRendu('intervention-1', dto, 'chirurgien-1');

      expect(compteRendu.redacteurId).toBe('chirurgien-1');
      expect(dossierMedicalService.ajouterCompteRendu).toHaveBeenCalledWith(
        'patient-1',
        expect.objectContaining({ auteurId: 'chirurgien-1', type: 'bloc-operatoire', contenu: dto.contenu }),
        'etab-1',
      );
    });
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm --filter @sih-saas/api test -- interventions.service`
Expected: FAIL — `Cannot find module './interventions.service'`.

- [ ] **Step 5: Implement `InterventionsService`**

```ts
// apps/api/src/modules/bloc-operatoire/application/interventions.service.ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InterventionStatut, PhaseChecklistOms, RoleEquipeOperatoire, SalleOperationStatut } from '@sih-saas/shared';
import { Not, Repository } from 'typeorm';
import { AdmissionsService } from '../../admissions-lits/application/admissions.service';
import { AuditService } from '../../audit/application/audit.service';
import { DossierMedicalService } from '../../dossier-medical/application/dossier-medical.service';
import { LogistiqueService } from '../../logistique/application/logistique.service';
import { RealtimeGateway } from '../../notifications/presentation/realtime.gateway';
import { PatientsService } from '../../patients/application/patients.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { AjouterMembreEquipeDto } from '../presentation/dto/ajouter-membre-equipe.dto';
import { CreateAnesthesieDto } from '../presentation/dto/create-anesthesie.dto';
import { CreateCompteRenduOperatoireDto } from '../presentation/dto/create-compte-rendu-operatoire.dto';
import { CreateConsommableInterventionDto } from '../presentation/dto/create-consommable-intervention.dto';
import { CreateInterventionDto } from '../presentation/dto/create-intervention.dto';
import { CreateSurveillanceAnesthesieDto } from '../presentation/dto/create-surveillance-anesthesie.dto';
import { UpdateInterventionDto } from '../presentation/dto/update-intervention.dto';
import { ValiderChecklistDto } from '../presentation/dto/valider-checklist.dto';
import { AnesthesieEntity } from '../infrastructure/entities/anesthesie.entity';
import { CompteRenduOperatoireEntity } from '../infrastructure/entities/compte-rendu-operatoire.entity';
import { ConsommableInterventionEntity } from '../infrastructure/entities/consommable-intervention.entity';
import { EquipeOperatoireEntity } from '../infrastructure/entities/equipe-operatoire.entity';
import { CHECKLIST_OMS_INITIALE, InterventionEntity } from '../infrastructure/entities/intervention.entity';
import { PaginatedResult } from './paginated-result';
import { SallesOperationService } from './salles-operation.service';

export interface InterventionDetail extends InterventionEntity {
  equipe: EquipeOperatoireEntity[];
  anesthesie: AnesthesieEntity | null;
  consommables: ConsommableInterventionEntity[];
  compteRendu: CompteRenduOperatoireEntity | null;
}

/**
 * Module "Bloc Opératoire" (prompt maître §10.4). `InterventionsController` (route plate
 * `/interventions`, jamais 🩺 — planification, même raisonnement que ADMISSION_CREATE) consomme
 * create/findAll/findOne/update/annuler/ajouterMembreEquipe/retirerMembreEquipe ;
 * `InterventionsPatientController` (nichée `/patients/:patientId/interventions`, 🩺) consomme
 * demarrer/validerChecklist/creerOuCompleterAnesthesie/ajouterSurveillanceAnesthesie/
 * enregistrerConsommable/terminer/redigerCompteRendu.
 */
@Injectable()
export class InterventionsService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly patientsService: PatientsService,
    private readonly admissionsService: AdmissionsService,
    private readonly sallesOperationService: SallesOperationService,
    private readonly logistiqueService: LogistiqueService,
    private readonly dossierMedicalService: DossierMedicalService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  private get repository(): Repository<InterventionEntity> {
    return this.tenantContext.getManager().getRepository(InterventionEntity);
  }

  private get equipeRepository(): Repository<EquipeOperatoireEntity> {
    return this.tenantContext.getManager().getRepository(EquipeOperatoireEntity);
  }

  private get anesthesieRepository(): Repository<AnesthesieEntity> {
    return this.tenantContext.getManager().getRepository(AnesthesieEntity);
  }

  private get consommablesRepository(): Repository<ConsommableInterventionEntity> {
    return this.tenantContext.getManager().getRepository(ConsommableInterventionEntity);
  }

  private get compteRenduRepository(): Repository<CompteRenduOperatoireEntity> {
    return this.tenantContext.getManager().getRepository(CompteRenduOperatoireEntity);
  }

  async create(dto: CreateInterventionDto, actingUserId: string): Promise<InterventionEntity> {
    const etablissementId = this.tenantContext.getEtablissementId()!;
    await this.patientsService.findById(dto.patientId);
    if (dto.admissionId) {
      await this.admissionsService.findById(dto.admissionId);
    }
    await this.sallesOperationService.findById(dto.salleOperationId);

    const dateHeurePrevue = new Date(dto.dateHeurePrevue);
    await this.assertCreneauLibre(dto.salleOperationId, dateHeurePrevue, dto.dureeEstimeeMinutes ?? null);

    const intervention = await this.repository.save(
      this.repository.create({
        etablissementId,
        patientId: dto.patientId,
        admissionId: dto.admissionId ?? null,
        salleOperationId: dto.salleOperationId,
        chirurgienPrincipalId: dto.chirurgienPrincipalId,
        typeIntervention: dto.typeIntervention,
        statut: InterventionStatut.PLANIFIEE,
        dateHeurePrevue,
        dureeEstimeeMinutes: dto.dureeEstimeeMinutes ?? null,
        checklistOms: CHECKLIST_OMS_INITIALE,
      }),
    );

    await this.equipeRepository.save(
      this.equipeRepository.create({
        etablissementId,
        interventionId: intervention.id,
        userId: dto.chirurgienPrincipalId,
        role: RoleEquipeOperatoire.CHIRURGIEN_PRINCIPAL,
      }),
    );

    await this.auditService.log({
      etablissementId,
      userId: actingUserId,
      action: 'intervention.create',
      ressource: 'intervention',
      ressourceId: intervention.id,
      metadata: { patientId: dto.patientId, salleOperationId: dto.salleOperationId },
    });

    return intervention;
  }

  async findAll(
    page: number,
    limit: number,
    filtres: { statut?: InterventionStatut; salleOperationId?: string } = {},
  ): Promise<PaginatedResult<InterventionEntity>> {
    const [items, total] = await this.repository.findAndCount({
      where: filtres,
      skip: (page - 1) * limit,
      take: limit,
      order: { dateHeurePrevue: 'ASC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<InterventionEntity> {
    const intervention = await this.repository.findOne({ where: { id } });
    if (!intervention) {
      throw new NotFoundException('Intervention introuvable.');
    }
    return intervention;
  }

  async findDetailComplet(id: string): Promise<InterventionDetail> {
    const intervention = await this.findById(id);
    const [equipe, anesthesie, consommables, compteRendu] = await Promise.all([
      this.equipeRepository.find({ where: { interventionId: id } }),
      this.anesthesieRepository.findOne({ where: { interventionId: id } }),
      this.consommablesRepository.find({ where: { interventionId: id } }),
      this.compteRenduRepository.findOne({ where: { interventionId: id } }),
    ]);
    return { ...intervention, equipe, anesthesie: anesthesie ?? null, consommables, compteRendu: compteRendu ?? null };
  }

  async update(id: string, dto: UpdateInterventionDto, actingUserId: string): Promise<InterventionEntity> {
    const intervention = await this.findById(id);
    this.assertPlanifiee(intervention);

    if (dto.salleOperationId) {
      await this.sallesOperationService.findById(dto.salleOperationId);
    }
    const salleOperationId = dto.salleOperationId ?? intervention.salleOperationId;
    const dateHeurePrevue = dto.dateHeurePrevue ? new Date(dto.dateHeurePrevue) : intervention.dateHeurePrevue;
    const dureeEstimeeMinutes = dto.dureeEstimeeMinutes ?? intervention.dureeEstimeeMinutes;
    await this.assertCreneauLibre(salleOperationId, dateHeurePrevue, dureeEstimeeMinutes, id);

    intervention.salleOperationId = salleOperationId;
    intervention.dateHeurePrevue = dateHeurePrevue;
    intervention.dureeEstimeeMinutes = dureeEstimeeMinutes;
    if (dto.typeIntervention) {
      intervention.typeIntervention = dto.typeIntervention;
    }
    const saved = await this.repository.save(intervention);

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.update',
      ressource: 'intervention',
      ressourceId: id,
    });

    return saved;
  }

  async annuler(id: string, actingUserId: string): Promise<InterventionEntity> {
    const intervention = await this.findById(id);
    this.assertPlanifiee(intervention);

    intervention.statut = InterventionStatut.ANNULEE;
    const saved = await this.repository.save(intervention);

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.annuler',
      ressource: 'intervention',
      ressourceId: id,
    });

    return saved;
  }

  async ajouterMembreEquipe(id: string, dto: AjouterMembreEquipeDto, actingUserId: string): Promise<EquipeOperatoireEntity> {
    const intervention = await this.findById(id);

    const membre = await this.equipeRepository.save(
      this.equipeRepository.create({
        etablissementId: intervention.etablissementId,
        interventionId: id,
        userId: dto.userId,
        role: dto.role,
      }),
    );

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.equipe.ajouter',
      ressource: 'intervention',
      ressourceId: id,
      metadata: { userId: dto.userId, role: dto.role },
    });

    return membre;
  }

  async retirerMembreEquipe(id: string, membreId: string, actingUserId: string): Promise<void> {
    const intervention = await this.findById(id);
    const membre = await this.equipeRepository.findOne({ where: { id: membreId, interventionId: id } });
    if (!membre) {
      throw new NotFoundException('Membre de l’équipe opératoire introuvable.');
    }

    await this.equipeRepository.remove(membre);

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.equipe.retirer',
      ressource: 'intervention',
      ressourceId: id,
      metadata: { membreId },
    });
  }

  async demarrer(id: string, actingUserId: string): Promise<InterventionEntity> {
    const intervention = await this.findById(id);
    if (intervention.statut !== InterventionStatut.PLANIFIEE) {
      throw new ConflictException('Seule une intervention PLANIFIEE peut démarrer.');
    }

    intervention.statut = InterventionStatut.EN_COURS;
    intervention.dateHeureDebutReelle = new Date();
    const saved = await this.repository.save(intervention);
    await this.sallesOperationService.changerStatutOccupation(intervention.salleOperationId, SalleOperationStatut.OCCUPEE);

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.demarrer',
      ressource: 'intervention',
      ressourceId: id,
    });
    this.diffuserSalle(intervention.etablissementId, intervention.salleOperationId, SalleOperationStatut.OCCUPEE);

    return saved;
  }

  async validerChecklist(id: string, dto: ValiderChecklistDto, actingUserId: string): Promise<InterventionEntity> {
    const intervention = await this.findById(id);
    this.assertEnCours(intervention);

    const cle = this.clePhase(dto.phase);
    intervention.checklistOms = {
      ...intervention.checklistOms,
      [cle]: { valide: true, valideParId: actingUserId, valideLe: new Date().toISOString() },
    };
    const saved = await this.repository.save(intervention);

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.checklist.valider',
      ressource: 'intervention',
      ressourceId: id,
      metadata: { phase: dto.phase },
    });

    return saved;
  }

  async creerOuCompleterAnesthesie(id: string, dto: CreateAnesthesieDto, actingUserId: string): Promise<AnesthesieEntity> {
    const intervention = await this.findById(id);
    this.assertEnCours(intervention);

    const existante = await this.anesthesieRepository.findOne({ where: { interventionId: id } });
    if (existante) {
      Object.assign(existante, {
        type: dto.type,
        scoreAsa: dto.scoreAsa ?? existante.scoreAsa,
        produits: dto.produits ?? existante.produits,
      });
      const saved = await this.anesthesieRepository.save(existante);
      await this.auditService.log({
        etablissementId: intervention.etablissementId,
        userId: actingUserId,
        action: 'intervention.anesthesie.update',
        ressource: 'intervention',
        ressourceId: id,
      });
      return saved;
    }

    const anesthesie = await this.anesthesieRepository.save(
      this.anesthesieRepository.create({
        etablissementId: intervention.etablissementId,
        interventionId: id,
        anesthesisteId: actingUserId,
        type: dto.type,
        scoreAsa: dto.scoreAsa ?? null,
        produits: dto.produits ?? [],
        surveillance: [],
      }),
    );

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.anesthesie.create',
      ressource: 'intervention',
      ressourceId: id,
    });

    return anesthesie;
  }

  async ajouterSurveillanceAnesthesie(
    id: string,
    dto: CreateSurveillanceAnesthesieDto,
    actingUserId: string,
  ): Promise<AnesthesieEntity> {
    const intervention = await this.findById(id);
    this.assertEnCours(intervention);

    const anesthesie = await this.anesthesieRepository.findOne({ where: { interventionId: id } });
    if (!anesthesie) {
      throw new NotFoundException('Aucune anesthésie enregistrée pour cette intervention.');
    }

    anesthesie.surveillance = [
      ...anesthesie.surveillance,
      {
        heure: new Date().toISOString(),
        tensionArterielle: dto.tensionArterielle ?? null,
        pouls: dto.pouls ?? null,
        saturationO2: dto.saturationO2 ?? null,
        observation: dto.observation ?? null,
      },
    ];
    const saved = await this.anesthesieRepository.save(anesthesie);

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.anesthesie.surveillance',
      ressource: 'intervention',
      ressourceId: id,
    });

    return saved;
  }

  async enregistrerConsommable(
    id: string,
    dto: CreateConsommableInterventionDto,
    actingUserId: string,
  ): Promise<ConsommableInterventionEntity> {
    const intervention = await this.findById(id);
    this.assertEnCours(intervention);

    await this.logistiqueService.decrementer(dto.articleStockId, dto.quantite);

    const consommable = await this.consommablesRepository.save(
      this.consommablesRepository.create({
        etablissementId: intervention.etablissementId,
        interventionId: id,
        articleStockId: dto.articleStockId,
        quantite: dto.quantite,
      }),
    );

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.consommable.create',
      ressource: 'intervention',
      ressourceId: id,
      metadata: { articleStockId: dto.articleStockId, quantite: dto.quantite },
    });

    return consommable;
  }

  async terminer(id: string, actingUserId: string): Promise<InterventionEntity> {
    const intervention = await this.findById(id);
    this.assertEnCours(intervention);

    intervention.statut = InterventionStatut.TERMINEE;
    intervention.dateHeureFinReelle = new Date();
    const saved = await this.repository.save(intervention);
    await this.sallesOperationService.changerStatutOccupation(intervention.salleOperationId, SalleOperationStatut.LIBRE);

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.terminer',
      ressource: 'intervention',
      ressourceId: id,
    });
    this.diffuserSalle(intervention.etablissementId, intervention.salleOperationId, SalleOperationStatut.LIBRE);

    return saved;
  }

  async redigerCompteRendu(
    id: string,
    dto: CreateCompteRenduOperatoireDto,
    actingUserId: string,
  ): Promise<CompteRenduOperatoireEntity> {
    const intervention = await this.findById(id);
    if (intervention.statut !== InterventionStatut.TERMINEE) {
      throw new ConflictException("Le compte rendu ne peut être rédigé qu'une fois l'intervention TERMINEE.");
    }

    const existant = await this.compteRenduRepository.findOne({ where: { interventionId: id } });
    if (existant) {
      throw new ConflictException('Un compte rendu existe déjà pour cette intervention.');
    }

    const compteRendu = await this.compteRenduRepository.save(
      this.compteRenduRepository.create({
        etablissementId: intervention.etablissementId,
        interventionId: id,
        redacteurId: actingUserId,
        diagnosticPreOperatoire: dto.diagnosticPreOperatoire,
        diagnosticPostOperatoire: dto.diagnosticPostOperatoire,
        techniqueUtilisee: dto.techniqueUtilisee,
        incidents: dto.incidents ?? null,
        contenu: dto.contenu,
      }),
    );

    await this.dossierMedicalService.ajouterCompteRendu(
      intervention.patientId,
      { auteurId: actingUserId, type: 'bloc-operatoire', contenu: dto.contenu },
      intervention.etablissementId,
    );

    await this.auditService.log({
      etablissementId: intervention.etablissementId,
      userId: actingUserId,
      action: 'intervention.compte-rendu.create',
      ressource: 'intervention',
      ressourceId: id,
    });

    return compteRendu;
  }

  private assertPlanifiee(intervention: InterventionEntity): void {
    if (intervention.statut !== InterventionStatut.PLANIFIEE) {
      throw new ConflictException('Seule une intervention PLANIFIEE peut être modifiée ou annulée.');
    }
  }

  private assertEnCours(intervention: InterventionEntity): void {
    if (intervention.statut !== InterventionStatut.EN_COURS) {
      throw new ConflictException('Cette action exige une intervention EN_COURS.');
    }
  }

  private clePhase(phase: PhaseChecklistOms): 'signIn' | 'timeOut' | 'signOut' {
    if (phase === PhaseChecklistOms.SIGN_IN) return 'signIn';
    if (phase === PhaseChecklistOms.TIME_OUT) return 'timeOut';
    return 'signOut';
  }

  private async assertCreneauLibre(
    salleOperationId: string,
    dateHeurePrevue: Date,
    dureeEstimeeMinutes: number | null,
    excludeInterventionId?: string,
  ): Promise<void> {
    const duree = dureeEstimeeMinutes ?? 60;
    const debut = dateHeurePrevue.getTime();
    const fin = debut + duree * 60_000;

    const existantes = await this.repository.find({
      where: { salleOperationId, statut: Not(InterventionStatut.ANNULEE) },
    });

    const conflit = existantes.some((existante) => {
      if (existante.id === excludeInterventionId) {
        return false;
      }
      const debutExistant = existante.dateHeurePrevue.getTime();
      const finExistante = debutExistant + (existante.dureeEstimeeMinutes ?? 60) * 60_000;
      return debutExistant < fin && debut < finExistante;
    });

    if (conflit) {
      throw new ConflictException('Cette salle est déjà réservée sur ce créneau.');
    }
  }

  private diffuserSalle(etablissementId: string, salleOperationId: string, statut: SalleOperationStatut): void {
    this.tenantContext.afterCommit(() => {
      this.realtimeGateway.emitToEtablissement(etablissementId, 'bloc:salle.updated', { salleOperationId, statut });
    });
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @sih-saas/api test -- interventions.service`
Expected: PASS, all tests.

- [ ] **Step 7: Build, run the full suite, and commit**

Run: `pnpm --filter @sih-saas/api build`
Expected: exits 0.

Run: `pnpm --filter @sih-saas/api test`
Expected: all suites pass, no regressions.

```bash
git add apps/api/src/modules/bloc-operatoire/infrastructure/entities/intervention.entity.ts apps/api/src/modules/bloc-operatoire/infrastructure/entities/equipe-operatoire.entity.ts apps/api/src/modules/bloc-operatoire/infrastructure/entities/anesthesie.entity.ts apps/api/src/modules/bloc-operatoire/infrastructure/entities/compte-rendu-operatoire.entity.ts apps/api/src/modules/bloc-operatoire/infrastructure/entities/consommable-intervention.entity.ts apps/api/src/modules/bloc-operatoire/presentation/dto/create-intervention.dto.ts apps/api/src/modules/bloc-operatoire/presentation/dto/update-intervention.dto.ts apps/api/src/modules/bloc-operatoire/presentation/dto/ajouter-membre-equipe.dto.ts apps/api/src/modules/bloc-operatoire/presentation/dto/valider-checklist.dto.ts apps/api/src/modules/bloc-operatoire/presentation/dto/create-anesthesie.dto.ts apps/api/src/modules/bloc-operatoire/presentation/dto/create-surveillance-anesthesie.dto.ts apps/api/src/modules/bloc-operatoire/presentation/dto/create-consommable-intervention.dto.ts apps/api/src/modules/bloc-operatoire/presentation/dto/create-compte-rendu-operatoire.dto.ts apps/api/src/modules/bloc-operatoire/application/interventions.service.ts apps/api/src/modules/bloc-operatoire/application/interventions.service.spec.ts
git commit -m "feat(bloc-operatoire): InterventionsService — planification, équipe, check-list OMS, anesthésie, consommables, compte rendu"
```

---

## Task 5: Controllers + `BlocOperatoireModule` + wiring

No unit tests for controllers in this task — confirmed by precedent: `urgences.controller.ts`/`urgences-patient.controller.ts` and `rh/presentation/*.controller.ts` have no `.spec.ts` files; controllers are thin pass-throughs verified via the live boot route check in Task 9 (and the RLS integration spec in Task 8 exercises the real DB layer). This task's own verification is `pnpm --filter @sih-saas/api build` succeeding.

**Files:**
- Create: `apps/api/src/modules/bloc-operatoire/presentation/salles-operation.controller.ts`
- Create: `apps/api/src/modules/bloc-operatoire/presentation/interventions.controller.ts`
- Create: `apps/api/src/modules/bloc-operatoire/presentation/interventions-patient.controller.ts`
- Create: `apps/api/src/modules/bloc-operatoire/bloc-operatoire.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `SallesOperationService`, `InterventionsService` (Tasks 3/4, all methods) ; `PlanFeatureGuard`/`RequirePlanFeature` (`../../subscriptions/domain/...`) ; `CareContextGuard` (`../../../shared/guards/care-context.guard`) ; `RequirePermissions`/`Scopes`/`ResponseMessage`/`CurrentUser` decorators ; `PaginationQueryDto`.
- Produces: `BlocOperatoireModule`, registered in `AppModule`. No interface consumed by later tasks (RBAC/migration/integration-spec tasks don't import from controllers).

- [ ] **Step 1: Create `SallesOperationController`**

```ts
// apps/api/src/modules/bloc-operatoire/presentation/salles-operation.controller.ts
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { SallesOperationService } from '../application/salles-operation.service';
import { CreateSalleOperationDto } from './dto/create-salle-operation.dto';
import { UpdateSalleOperationDto } from './dto/update-salle-operation.dto';

/** CRUD de l'infrastructure physique du bloc — ETABLISSEMENT_SETTINGS, même convention que Chambre/Lit. */
@ApiTags('Bloc Opératoire')
@ApiBearerAuth()
@Controller('salles-operation')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.BLOC_OPERATOIRE)
export class SallesOperationController {
  constructor(private readonly sallesOperationService: SallesOperationService) {}

  @Post()
  @RequirePermissions(Permission.ETABLISSEMENT_SETTINGS)
  @ResponseMessage('Salle d’opération créée.')
  create(@Body() dto: CreateSalleOperationDto, @CurrentUser() currentUser: JwtPayload) {
    return this.sallesOperationService.create(dto, currentUser.sub);
  }

  @Get()
  @RequirePermissions(Permission.BLOC_VIEW)
  @ResponseMessage('Liste des salles d’opération.')
  findAll(@Query() query: PaginationQueryDto) {
    return this.sallesOperationService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @RequirePermissions(Permission.BLOC_VIEW)
  @ResponseMessage('Salle d’opération récupérée.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sallesOperationService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.ETABLISSEMENT_SETTINGS)
  @ResponseMessage('Salle d’opération mise à jour.')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSalleOperationDto, @CurrentUser() currentUser: JwtPayload) {
    return this.sallesOperationService.update(id, dto, currentUser.sub);
  }
}
```

- [ ] **Step 2: Create `InterventionsController` (flat board)**

```ts
// apps/api/src/modules/bloc-operatoire/presentation/interventions.controller.ts
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, JwtPayload, Permission, Scope, InterventionStatut } from '@sih-saas/shared';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { InterventionsService } from '../application/interventions.service';
import { AjouterMembreEquipeDto } from './dto/ajouter-membre-equipe.dto';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';

class FindInterventionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(InterventionStatut)
  statut?: InterventionStatut;

  @IsOptional()
  @IsUUID()
  salleOperationId?: string;
}

/**
 * Planning du bloc opératoire (board) — route plate, jamais 🩺 : BLOC_PLANIFICATION n'est pas dans
 * CARE_CONTEXT_PERMISSIONS (acte qui établit le lien, même raisonnement que URGENCE_TRIAGE). Les
 * actions cliniques sur une intervention en cours vivent dans `InterventionsPatientController`,
 * nichée sous /patients/:patientId pour CareContextGuard.
 */
@ApiTags('Bloc Opératoire')
@ApiBearerAuth()
@Controller('interventions')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.BLOC_OPERATOIRE)
export class InterventionsController {
  constructor(private readonly interventionsService: InterventionsService) {}

  @Post()
  @RequirePermissions(Permission.BLOC_PLANIFICATION)
  @ResponseMessage('Intervention planifiée.')
  create(@Body() dto: CreateInterventionDto, @CurrentUser() currentUser: JwtPayload) {
    return this.interventionsService.create(dto, currentUser.sub);
  }

  @Get()
  @RequirePermissions(Permission.BLOC_VIEW)
  @ResponseMessage('Planning du bloc opératoire.')
  findAll(@Query() query: FindInterventionsQueryDto) {
    return this.interventionsService.findAll(query.page, query.limit, {
      statut: query.statut,
      salleOperationId: query.salleOperationId,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.BLOC_VIEW)
  @ResponseMessage('Intervention récupérée.')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.interventionsService.findDetailComplet(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.BLOC_PLANIFICATION)
  @ResponseMessage('Intervention replanifiée.')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInterventionDto, @CurrentUser() currentUser: JwtPayload) {
    return this.interventionsService.update(id, dto, currentUser.sub);
  }

  @Patch(':id/annuler')
  @RequirePermissions(Permission.BLOC_PLANIFICATION)
  @ResponseMessage('Intervention annulée.')
  annuler(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.interventionsService.annuler(id, currentUser.sub);
  }

  @Post(':id/equipe')
  @RequirePermissions(Permission.BLOC_PLANIFICATION)
  @ResponseMessage('Membre ajouté à l’équipe opératoire.')
  ajouterMembreEquipe(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AjouterMembreEquipeDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.interventionsService.ajouterMembreEquipe(id, dto, currentUser.sub);
  }

  @Delete(':id/equipe/:membreId')
  @RequirePermissions(Permission.BLOC_PLANIFICATION)
  @ResponseMessage('Membre retiré de l’équipe opératoire.')
  retirerMembreEquipe(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('membreId', ParseUUIDPipe) membreId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.interventionsService.retirerMembreEquipe(id, membreId, currentUser.sub);
  }
}
```

- [ ] **Step 3: Create `InterventionsPatientController` (nested, clinical)**

```ts
// apps/api/src/modules/bloc-operatoire/presentation/interventions-patient.controller.ts
import { Body, Controller, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleMetier, JwtPayload, Permission, Scope } from '@sih-saas/shared';
import { CareContextGuard } from '../../../shared/guards/care-context.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message.decorator';
import { Scopes } from '../../../shared/decorators/scopes.decorator';
import { PlanFeatureGuard } from '../../subscriptions/domain/plan-feature.guard';
import { RequirePlanFeature } from '../../subscriptions/domain/require-plan-feature.decorator';
import { InterventionsService } from '../application/interventions.service';
import { CreateAnesthesieDto } from './dto/create-anesthesie.dto';
import { CreateCompteRenduOperatoireDto } from './dto/create-compte-rendu-operatoire.dto';
import { CreateConsommableInterventionDto } from './dto/create-consommable-intervention.dto';
import { CreateSurveillanceAnesthesieDto } from './dto/create-surveillance-anesthesie.dto';
import { ValiderChecklistDto } from './dto/valider-checklist.dto';

/**
 * Actions cliniques sur une intervention existante — nichée sous /patients/:patientId pour que
 * CareContextGuard résolve le patient via le paramètre de route (même convention que
 * UrgencesPatientController). `:patientId` n'est pas réutilisé dans le corps des méthodes : le
 * service retrouve tout depuis `:id`, la RLS garantit déjà la cohérence tenant entre les deux.
 */
@ApiTags('Bloc Opératoire')
@ApiBearerAuth()
@Controller('patients/:patientId/interventions')
@Scopes(Scope.ETABLISSEMENT)
@UseGuards(PlanFeatureGuard)
@RequirePlanFeature(ModuleMetier.BLOC_OPERATOIRE)
export class InterventionsPatientController {
  constructor(private readonly interventionsService: InterventionsService) {}

  @Patch(':id/demarrer')
  @RequirePermissions(Permission.BLOC_REALISATION)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Intervention démarrée.')
  demarrer(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.interventionsService.demarrer(id, currentUser.sub);
  }

  @Patch(':id/checklist')
  @RequirePermissions(Permission.BLOC_REALISATION)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Étape de la check-list OMS validée.')
  validerChecklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ValiderChecklistDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.interventionsService.validerChecklist(id, dto, currentUser.sub);
  }

  @Post(':id/anesthesie')
  @RequirePermissions(Permission.BLOC_REALISATION)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Anesthésie enregistrée.')
  creerOuCompleterAnesthesie(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAnesthesieDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.interventionsService.creerOuCompleterAnesthesie(id, dto, currentUser.sub);
  }

  @Post(':id/anesthesie/surveillances')
  @RequirePermissions(Permission.BLOC_REALISATION)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Relevé de surveillance anesthésique enregistré.')
  ajouterSurveillanceAnesthesie(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSurveillanceAnesthesieDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.interventionsService.ajouterSurveillanceAnesthesie(id, dto, currentUser.sub);
  }

  @Post(':id/consommables')
  @RequirePermissions(Permission.BLOC_REALISATION)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Consommable enregistré.')
  enregistrerConsommable(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateConsommableInterventionDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.interventionsService.enregistrerConsommable(id, dto, currentUser.sub);
  }

  @Patch(':id/terminer')
  @RequirePermissions(Permission.BLOC_REALISATION)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Intervention terminée.')
  terminer(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.interventionsService.terminer(id, currentUser.sub);
  }

  @Post(':id/compte-rendu')
  @RequirePermissions(Permission.BLOC_COMPTE_RENDU)
  @UseGuards(CareContextGuard)
  @ResponseMessage('Compte rendu opératoire rédigé.')
  redigerCompteRendu(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCompteRenduOperatoireDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.interventionsService.redigerCompteRendu(id, dto, currentUser.sub);
  }
}
```

- [ ] **Step 4: Create `BlocOperatoireModule`**

```ts
// apps/api/src/modules/bloc-operatoire/bloc-operatoire.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdmissionsLitsModule } from '../admissions-lits/admissions-lits.module';
import { AuditModule } from '../audit/audit.module';
import { DossierMedicalModule } from '../dossier-medical/dossier-medical.module';
import { LogistiqueModule } from '../logistique/logistique.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PatientsModule } from '../patients/patients.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { InterventionsService } from './application/interventions.service';
import { SallesOperationService } from './application/salles-operation.service';
import { AnesthesieEntity } from './infrastructure/entities/anesthesie.entity';
import { CompteRenduOperatoireEntity } from './infrastructure/entities/compte-rendu-operatoire.entity';
import { ConsommableInterventionEntity } from './infrastructure/entities/consommable-intervention.entity';
import { EquipeOperatoireEntity } from './infrastructure/entities/equipe-operatoire.entity';
import { InterventionEntity } from './infrastructure/entities/intervention.entity';
import { SalleOperationEntity } from './infrastructure/entities/salle-operation.entity';
import { InterventionsController } from './presentation/interventions.controller';
import { InterventionsPatientController } from './presentation/interventions-patient.controller';
import { SallesOperationController } from './presentation/salles-operation.controller';

@Module({
  imports: [
    // forFeature() ici sert uniquement à enregistrer les entités auprès du DataSource — les
    // services passent systématiquement par tenantContext.getManager() (RLS), voir urgences.module.ts.
    TypeOrmModule.forFeature([
      SalleOperationEntity,
      InterventionEntity,
      EquipeOperatoireEntity,
      AnesthesieEntity,
      CompteRenduOperatoireEntity,
      ConsommableInterventionEntity,
    ]),
    PatientsModule,
    AdmissionsLitsModule,
    LogistiqueModule,
    DossierMedicalModule,
    NotificationsModule,
    SubscriptionsModule,
    AuditModule,
  ],
  controllers: [SallesOperationController, InterventionsController, InterventionsPatientController],
  providers: [SallesOperationService, InterventionsService],
  exports: [SallesOperationService, InterventionsService],
})
export class BlocOperatoireModule {}
```

- [ ] **Step 5: Register `BlocOperatoireModule` in `AppModule`**

In `apps/api/src/app.module.ts`, add the import alphabetically (between `AuthModule` and `ConsultationsModule`):

```ts
import { BlocOperatoireModule } from './modules/bloc-operatoire/bloc-operatoire.module';
```

And add `BlocOperatoireModule,` to the `imports` array, right after `UrgencesModule,`:

```ts
    UrgencesModule,
    BlocOperatoireModule,
```

- [ ] **Step 6: Build**

Run: `pnpm --filter @sih-saas/api build`
Expected: exits 0, no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/bloc-operatoire/presentation/salles-operation.controller.ts apps/api/src/modules/bloc-operatoire/presentation/interventions.controller.ts apps/api/src/modules/bloc-operatoire/presentation/interventions-patient.controller.ts apps/api/src/modules/bloc-operatoire/bloc-operatoire.module.ts apps/api/src/app.module.ts
git commit -m "feat(bloc-operatoire): contrôleurs + wiring du module dans AppModule"
```

---

## Task 6: RBAC seed — `rbac.seed.ts`

**Files:**
- Modify: `apps/api/src/database/seeds/rbac.seed.ts`

**Interfaces:**
- Consumes: `Permission.BLOC_PLANIFICATION`/`BLOC_VIEW`/`BLOC_REALISATION`/`BLOC_COMPTE_RENDU` (Task 1).
- Produces: nothing consumed by later tasks — this is a leaf change (RBAC seed data), verified by re-running the seed against a real dev database in Task 9.

No unit test exists for `rbac.seed.ts` itself anywhere in the codebase (it's a data seed script, not a service) — verification is running `pnpm seed:rbac` against the dev DB in Task 9 and confirming no errors.

- [ ] **Step 1: Add the 4 permissions to `CHIRURGIEN`, `ANESTHESISTE`, `INFIRMIER`**

In `apps/api/src/database/seeds/rbac.seed.ts`, replace the `[Role.CHIRURGIEN]` block:

```ts
  [Role.CHIRURGIEN]: [
    Permission.PATIENT_READ,
    Permission.DOSSIER_READ,
    Permission.DOSSIER_WRITE,
    Permission.CONSULTATION_CREATE,
    Permission.PRESCRIPTION_CREATE,
    Permission.PRESCRIPTION_VALIDATE,
    Permission.LABO_REQUEST,
    Permission.IMAGERIE_REQUEST,
    Permission.RDV_CREATE,
    Permission.URGENCE_VIEW,
    Permission.URGENCE_PRISE_EN_CHARGE,
    Permission.URGENCE_SURVEILLANCE,
    Permission.URGENCE_ALERTE,
    Permission.LIT_VIEW,
    Permission.MESSAGE_SEND,
    Permission.MESSAGE_READ,
  ],
```

with:

```ts
  [Role.CHIRURGIEN]: [
    Permission.PATIENT_READ,
    Permission.DOSSIER_READ,
    Permission.DOSSIER_WRITE,
    Permission.CONSULTATION_CREATE,
    Permission.PRESCRIPTION_CREATE,
    Permission.PRESCRIPTION_VALIDATE,
    Permission.LABO_REQUEST,
    Permission.IMAGERIE_REQUEST,
    Permission.RDV_CREATE,
    Permission.URGENCE_VIEW,
    Permission.URGENCE_PRISE_EN_CHARGE,
    Permission.URGENCE_SURVEILLANCE,
    Permission.URGENCE_ALERTE,
    Permission.LIT_VIEW,
    Permission.BLOC_PLANIFICATION,
    Permission.BLOC_VIEW,
    Permission.BLOC_REALISATION,
    Permission.BLOC_COMPTE_RENDU,
    Permission.MESSAGE_SEND,
    Permission.MESSAGE_READ,
  ],
```

Replace the `[Role.INFIRMIER]` block:

```ts
  [Role.INFIRMIER]: [
    Permission.DOSSIER_READ,
    Permission.DOSSIER_WRITE,
    Permission.ADMINISTRATION_CREATE,
    Permission.RDV_CREATE,
    Permission.URGENCE_TRIAGE,
    Permission.URGENCE_VIEW,
    Permission.URGENCE_SURVEILLANCE,
    Permission.URGENCE_ALERTE,
    Permission.MESSAGE_SEND,
    Permission.MESSAGE_READ,
  ],
```

with:

```ts
  [Role.INFIRMIER]: [
    Permission.DOSSIER_READ,
    Permission.DOSSIER_WRITE,
    Permission.ADMINISTRATION_CREATE,
    Permission.RDV_CREATE,
    Permission.URGENCE_TRIAGE,
    Permission.URGENCE_VIEW,
    Permission.URGENCE_SURVEILLANCE,
    Permission.URGENCE_ALERTE,
    Permission.BLOC_VIEW,
    Permission.BLOC_REALISATION,
    Permission.MESSAGE_SEND,
    Permission.MESSAGE_READ,
  ],
```

Replace the `[Role.ANESTHESISTE]` block:

```ts
  [Role.ANESTHESISTE]: [
    Permission.PATIENT_READ,
    Permission.DOSSIER_READ,
    Permission.DOSSIER_WRITE,
    Permission.CONSULTATION_CREATE,
    Permission.PRESCRIPTION_CREATE,
    Permission.PRESCRIPTION_VALIDATE,
    Permission.URGENCE_VIEW,
    Permission.URGENCE_PRISE_EN_CHARGE,
    Permission.URGENCE_SURVEILLANCE,
    Permission.URGENCE_ALERTE,
    Permission.LIT_VIEW,
    Permission.MESSAGE_SEND,
    Permission.MESSAGE_READ,
  ],
```

with:

```ts
  [Role.ANESTHESISTE]: [
    Permission.PATIENT_READ,
    Permission.DOSSIER_READ,
    Permission.DOSSIER_WRITE,
    Permission.CONSULTATION_CREATE,
    Permission.PRESCRIPTION_CREATE,
    Permission.PRESCRIPTION_VALIDATE,
    Permission.URGENCE_VIEW,
    Permission.URGENCE_PRISE_EN_CHARGE,
    Permission.URGENCE_SURVEILLANCE,
    Permission.URGENCE_ALERTE,
    Permission.LIT_VIEW,
    Permission.BLOC_VIEW,
    Permission.BLOC_REALISATION,
    Permission.MESSAGE_SEND,
    Permission.MESSAGE_READ,
  ],
```

No other role changes: `ADMIN_ETABLISSEMENT`/`DIRECTEUR` deliberately get no Bloc Opératoire permission, matching the existing pattern where these managerial roles have no clinical-visibility permission on any module (`LIT_VIEW`, `URGENCE_VIEW`, etc. are all absent from their blocks too).

- [ ] **Step 2: Build**

Run: `pnpm --filter @sih-saas/api build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/database/seeds/rbac.seed.ts
git commit -m "feat(rbac): permissions Bloc Opératoire pour chirurgien/anesthésiste/infirmier"
```

---

## Task 7: Migration

**Files:**
- Create: `apps/api/src/database/migrations/<auto-timestamp>-BlocOperatoire.ts` (generated, then hand-edited)

**Interfaces:**
- Consumes: the 6 entity files from Tasks 3/4 (TypeORM reads `@Entity`/`@Column` metadata to generate SQL), the 4 new `Permission` enum values from Task 1 (changes the Postgres enum types `user_permissions_permission_enum`/`role_permissions_permission_enum`, exactly like `1782259232957-RhModule.ts` did for `rh:view`/`rh:manage`).
- Produces: nothing consumed by later tasks in this plan — Task 8's integration spec talks to the tables this migration creates, identified purely by table name string (`'salles_operation'`, `'interventions'`, etc.), not by importing this file.

This codebase always generates migrations via the TypeORM CLI against a real running Postgres, then hand-patches in the RLS calls (`enableTenantRls`/`disableTenantRls`) — confirmed pattern across every prior phase (e.g. Phase 11: *"TypeORM migration:generate ne pose jamais la RLS automatiquement, il faut toujours l'ajouter à la main après génération"*). Do not hand-write the `CREATE TABLE` SQL from scratch.

**Prerequisite:** Postgres must be running. Run `pnpm docker:dev:up` from the repo root first if it isn't already.

- [ ] **Step 1: Generate the migration**

Run (from `apps/api/`):
```
pnpm migration:generate src/database/migrations/BlocOperatoire
```

Expected: a new file `apps/api/src/database/migrations/<timestamp>-BlocOperatoire.ts` is created, with timestamp greater than `1782259232957` (the existing uncommitted `RhModule` migration). Its `up()` method must contain `CREATE TABLE` statements for exactly these 6 tables: `clinic.salles_operation`, `clinic.interventions`, `clinic.equipes_operatoire`, `clinic.anesthesies`, `clinic.comptes_rendus_operatoires`, `clinic.consommables_intervention` — plus `ALTER TYPE` statements on `platform.user_permissions_permission_enum` and `platform.role_permissions_permission_enum` adding the 4 `bloc:*` values (rename-recreate-drop pattern, same shape as in `1782259232957-RhModule.ts`).

If generation fails with "No changes in database schema were found", verify Postgres is up-to-date with all migrations already applied (`pnpm migration:run`) before regenerating — a stale schema hides the new diff.

- [ ] **Step 2: Add RLS to the 6 new tables**

In the generated file, inside the `up()` method, immediately after each table's last `CREATE INDEX`/`CREATE UNIQUE INDEX` statement (and before moving to the next table), insert the matching call. The generated file already imports `QueryRunner` — add this import line at the top:

```ts
import { disableTenantRls, enableTenantRls } from "../utils/enable-tenant-rls.util";
```

Then insert, after the indexes for each table respectively:

```ts
        await enableTenantRls(queryRunner, 'clinic', 'salles_operation');
```
```ts
        await enableTenantRls(queryRunner, 'clinic', 'interventions');
```
```ts
        await enableTenantRls(queryRunner, 'clinic', 'equipes_operatoire');
```
```ts
        await enableTenantRls(queryRunner, 'clinic', 'anesthesies');
```
```ts
        await enableTenantRls(queryRunner, 'clinic', 'comptes_rendus_operatoires');
```
```ts
        await enableTenantRls(queryRunner, 'clinic', 'consommables_intervention');
```

In the `down()` method, insert the matching `disableTenantRls` call immediately **before** each table's `DROP TABLE` statement (mirroring the `up()`/`down()` symmetry in `1782259232957-RhModule.ts`):

```ts
        await disableTenantRls(queryRunner, 'clinic', 'salles_operation');
```
```ts
        await disableTenantRls(queryRunner, 'clinic', 'interventions');
```
```ts
        await disableTenantRls(queryRunner, 'clinic', 'equipes_operatoire');
```
```ts
        await disableTenantRls(queryRunner, 'clinic', 'anesthesies');
```
```ts
        await disableTenantRls(queryRunner, 'clinic', 'comptes_rendus_operatoires');
```
```ts
        await disableTenantRls(queryRunner, 'clinic', 'consommables_intervention');
```

(`down()` drops tables in reverse dependency order — match whatever order TypeORM generated; only insert the `disableTenantRls` call right before each table's own `DROP TABLE`, don't reorder anything else.)

- [ ] **Step 3: Apply the migration**

Run (from `apps/api/`):
```
pnpm migration:run
```

Expected: output lists the new migration as applied, exits 0.

- [ ] **Step 4: Verify RLS is actually active**

Run this against the dev DB (e.g. via `psql` or a one-off Node script using `apps/api/src/database/data-source.ts`):
```sql
SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
WHERE relname IN ('salles_operation','interventions','equipes_operatoire','anesthesies','comptes_rendus_operatoires','consommables_intervention');
```
Expected: 6 rows, all with `relrowsecurity = true` and `relforcerowsecurity = true`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/database/migrations/
git commit -m "feat(bloc-operatoire): migration — 6 tables clinic.* + RLS + permissions"
```

---

## Task 8: RLS integration spec

**Files:**
- Create: `apps/api/src/modules/bloc-operatoire/bloc-operatoire-rls.integration.spec.ts`

**Interfaces:**
- Consumes: `dataSourceOptions` (`apps/api/src/database/data-source.ts`) — no application code imports, this talks to Postgres directly via raw `DataSource`/`QueryRunner`, exactly like `rh-rls.integration.spec.ts`.

**Prerequisite:** Postgres running with Task 7's migration applied (`pnpm migration:run`).

- [ ] **Step 1: Write the integration spec**

```ts
// apps/api/src/modules/bloc-operatoire/bloc-operatoire-rls.integration.spec.ts
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../database/data-source';

/**
 * Test d'isolation multi-tenant réel sur les 6 tables du module Bloc Opératoire (SalleOperation/
 * Intervention/EquipeOperatoire/Anesthesie/CompteRenduOperatoire/ConsommableIntervention, prompt
 * maître §10.4) — exige Postgres démarré (pnpm docker:dev:up) et la migration appliquée.
 * Référence : docs/phase-0/strategie-isolation.md §7.
 */
describe('Isolation RLS — tables module Bloc Opératoire (intégration Postgres réelle)', () => {
  const tables = [
    'salles_operation',
    'interventions',
    'equipes_operatoire',
    'anesthesies',
    'comptes_rendus_operatoires',
    'consommables_intervention',
  ];
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({ ...dataSourceOptions, entities: [], migrations: [] });
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it.each(tables)('"clinic"."%s" a RLS activée et forcée (FORCE ROW LEVEL SECURITY)', async (table) => {
    const result = await dataSource.query(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = $1::regclass`,
      [`"clinic"."${table}"`],
    );

    expect(result[0].relrowsecurity).toBe(true);
    expect(result[0].relforcerowsecurity).toBe(true);
  });

  it.each(tables)('"clinic"."%s" porte la policy tenant_isolation', async (table) => {
    const result = await dataSource.query(`SELECT polname FROM pg_policy WHERE polrelid = $1::regclass`, [
      `"clinic"."${table}"`,
    ]);

    expect(result.map((row: { polname: string }) => row.polname)).toContain('tenant_isolation');
  });

  describe('comportement (lecture/écriture) sur clinic.salles_operation', () => {
    const etabA = randomUUID();
    const etabB = randomUUID();

    async function insertAs(etablissementId: string, nom: string): Promise<void> {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
      await queryRunner.query(
        `INSERT INTO "clinic"."salles_operation" (etablissement_id, nom, statut) VALUES ($1, $2, 'LIBRE')`,
        [etablissementId, nom],
      );
      await queryRunner.commitTransaction();
      await queryRunner.release();
    }

    async function selectAllAs(etablissementId: string): Promise<Array<{ nom: string }>> {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etablissementId]);
      const rows = await queryRunner.query(`SELECT nom FROM "clinic"."salles_operation" WHERE etablissement_id = $1 OR true`, [
        etablissementId,
      ]);
      await queryRunner.commitTransaction();
      await queryRunner.release();
      return rows;
    }

    afterAll(async () => {
      await dataSource.query(`DELETE FROM "clinic"."salles_operation" WHERE etablissement_id IN ($1, $2)`, [etabA, etabB]);
    });

    it("l'établissement A ne voit jamais la salle créée par B, même sans WHERE explicite", async () => {
      await insertAs(etabA, 'Salle A1');
      await insertAs(etabB, 'Salle B1');

      const rowsForA = await selectAllAs(etabA);
      const rowsForB = await selectAllAs(etabB);

      expect(rowsForA.map((row) => row.nom)).toEqual(['Salle A1']);
      expect(rowsForB.map((row) => row.nom)).toEqual(['Salle B1']);
    });

    it('rejette un INSERT avec un etablissement_id falsifié (policy WITH CHECK)', async () => {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabA]);

      await expect(
        queryRunner.query(`INSERT INTO "clinic"."salles_operation" (etablissement_id, nom, statut) VALUES ($1, 'Frauduleuse', 'LIBRE')`, [
          etabB,
        ]),
      ).rejects.toThrow();

      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    });
  });

  describe('comportement (lecture/écriture) sur clinic.interventions', () => {
    const etabA = randomUUID();
    const etabB = randomUUID();
    let salleA: string;
    let salleB: string;

    beforeAll(async () => {
      const queryRunnerA = dataSource.createQueryRunner();
      await queryRunnerA.connect();
      await queryRunnerA.startTransaction();
      await queryRunnerA.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabA]);
      const insertedA = await queryRunnerA.query(
        `INSERT INTO "clinic"."salles_operation" (etablissement_id, nom, statut) VALUES ($1, 'Salle Interv A', 'LIBRE') RETURNING id`,
        [etabA],
      );
      salleA = insertedA[0].id;
      await queryRunnerA.commitTransaction();
      await queryRunnerA.release();

      const queryRunnerB = dataSource.createQueryRunner();
      await queryRunnerB.connect();
      await queryRunnerB.startTransaction();
      await queryRunnerB.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabB]);
      const insertedB = await queryRunnerB.query(
        `INSERT INTO "clinic"."salles_operation" (etablissement_id, nom, statut) VALUES ($1, 'Salle Interv B', 'LIBRE') RETURNING id`,
        [etabB],
      );
      salleB = insertedB[0].id;
      await queryRunnerB.commitTransaction();
      await queryRunnerB.release();
    });

    afterAll(async () => {
      await dataSource.query(`DELETE FROM "clinic"."interventions" WHERE etablissement_id IN ($1, $2)`, [etabA, etabB]);
      await dataSource.query(`DELETE FROM "clinic"."salles_operation" WHERE etablissement_id IN ($1, $2)`, [etabA, etabB]);
    });

    it("l'établissement A ne voit jamais l'intervention planifiée par B", async () => {
      const checklist = JSON.stringify({
        signIn: { valide: false, valideParId: null, valideLe: null },
        timeOut: { valide: false, valideParId: null, valideLe: null },
        signOut: { valide: false, valideParId: null, valideLe: null },
      });

      const queryRunnerA = dataSource.createQueryRunner();
      await queryRunnerA.connect();
      await queryRunnerA.startTransaction();
      await queryRunnerA.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabA]);
      await queryRunnerA.query(
        `INSERT INTO "clinic"."interventions"
           (etablissement_id, patient_id, salle_operation_id, chirurgien_principal_id, type_intervention, statut, date_heure_prevue, checklist_oms)
         VALUES ($1, $2, $3, $2, 'Appendicectomie', 'PLANIFIEE', now(), $4::jsonb)`,
        [etabA, randomUUID(), salleA, checklist],
      );
      await queryRunnerA.commitTransaction();
      await queryRunnerA.release();

      const queryRunnerB = dataSource.createQueryRunner();
      await queryRunnerB.connect();
      await queryRunnerB.startTransaction();
      await queryRunnerB.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [etabB]);
      const rowsForB = await queryRunnerB.query(`SELECT id FROM "clinic"."interventions"`);
      await queryRunnerB.commitTransaction();
      await queryRunnerB.release();

      expect(rowsForB).toHaveLength(0);
      void salleB;
    });
  });
});
```

- [ ] **Step 2: Run the integration spec**

Run: `pnpm --filter @sih-saas/api test:integration -- bloc-operatoire-rls`
Expected: PASS, all tests (2 tables × 2 RLS-metadata tests = 12, plus 2 salles_operation behavior tests, plus 1 interventions behavior test = 15 total).

If column names in the raw SQL don't match what TypeORM's `SnakeNamingStrategy` actually generated (e.g. `salle_operation_id` vs a different auto-generated name), inspect the table with `\d clinic.interventions` in `psql` and adjust the raw SQL column names in this spec to match exactly — entity property names are always `camelCase`, the naming strategy converts them to `snake_case` mechanically, so this should match, but verify rather than assume.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/bloc-operatoire/bloc-operatoire-rls.integration.spec.ts
git commit -m "test(bloc-operatoire): isolation RLS réelle sur les 6 tables clinic.*"
```

---

## Task 9: Final verification (no new files)

**Files:** none created or modified — this task only runs commands and inspects output, confirming the whole module works end-to-end exactly like every prior phase's closing verification step (e.g. Phase 7: *"22/22 assertions RLS ... 35 suites unitaires ... boot complet avec toutes les routes Phase 7 mappées"*).

- [ ] **Step 1: Re-seed RBAC on the dev database**

Run (from `apps/api/`): `pnpm seed:rbac`
Expected: exits 0, no errors. This applies Task 6's permission grants to the real `platform.role_permissions` table.

- [ ] **Step 2: Full build**

Run: `pnpm --filter @sih-saas/shared build && pnpm --filter @sih-saas/api build`
Expected: both exit 0.

- [ ] **Step 3: Full unit test suite**

Run: `pnpm --filter @sih-saas/api test`
Expected: all suites pass. Before this plan, the baseline was 82 suites/446 tests (verified at the start of this work) — this task should show 84 suites (Task 3's + Task 4's new spec files) with strictly more passing tests than 446, and zero failures.

- [ ] **Step 4: Full integration test suite**

Run: `pnpm --filter @sih-saas/api test:integration`
Expected: all suites pass, including Task 8's new `bloc-operatoire-rls.integration.spec.ts`, with no regression on the pre-existing suites (e.g. `rh-rls.integration.spec.ts`, `dossier-medical.service.integration.spec.ts`).

- [ ] **Step 5: Live boot route check**

Run: `pnpm --filter @sih-saas/api start` (or `start:dev`), then in a separate terminal:

```
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/salles-operation
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/interventions
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/patients/00000000-0000-0000-0000-000000000000/interventions/00000000-0000-0000-0000-000000000000/demarrer -X PATCH
```

(Adjust the port/prefix to whatever `.env`/`main.ts` actually configure if different from `3000`/`/api`.)

Expected: all three respond **401** (Unauthorized — no token supplied), never **404** (Not Found). A 404 means the module/controller isn't wired into `AppModule` correctly; re-check Task 5 Step 5.

- [ ] **Step 6: Confirm no unintended files are staged**

Run: `git status --short`
Expected: working tree clean except for whatever uncommitted prior-session work already existed before this plan started (the `ClinicalModule`→`ModuleMetier` rename + RH module, per the Global Constraints note) — every file this plan touched should already be committed by the per-task commits above. Do not commit the prior-session files unless the user explicitly asks.

---

## Self-Review

**1. Spec coverage** — checked against `docs/superpowers/specs/2026-06-24-bloc-operatoire-design.md`:
- 6 entities (Salle/Intervention/Equipe/Anesthesie/CompteRendu/Consommable) → Tasks 3, 4. ✓
- 4 permissions + RBAC mapping → Tasks 1, 6. ✓
- 2 controllers (flat board + patient-nested) + plan-feature gating → Task 5. ✓
- Salle status auto-driven by intervention lifecycle, never manual → `SallesOperationService.update` guard (Task 3) + `InterventionsService.demarrer`/`terminer` (Task 4). ✓
- Overlap/double-booking prevention on salle+slot → `InterventionsService.assertCreneauLibre` (Task 4). ✓
- Real Logistique stock decrement for consommables + seuil alerte → Task 2 + `enregistrerConsommable` (Task 4). ✓
- Compte rendu replicated into Mongo DME → `redigerCompteRendu` calling `DossierMedicalService.ajouterCompteRendu` (Task 4). ✓
- `bloc:salle.updated` realtime event → `diffuserSalle` (Task 4). ✓
- RLS on all 6 tables → Task 7 (migration) + Task 8 (integration spec). ✓
- Explicitly out of scope (desktop UI, reusable team templates, cleaning phase, CCAM nomenclature, FHIR Procedure) → untouched by this plan, consistent with the spec's "Hors périmètre" section. ✓

**2. Placeholder scan:** no "TBD"/"TODO"/"add appropriate" found — re-read; every step has literal code or an exact command with an expected, checkable outcome.

**3. Type consistency:** `InterventionsService` constructor parameter order (`tenantContext, patientsService, admissionsService, sallesOperationService, logistiqueService, dossierMedicalService, auditService, realtimeGateway`) matches exactly between the Task 4 implementation and its spec's `new InterventionsService(...)` call. `SallesOperationService.changerStatutOccupation(id, statut)` signature matches its two call sites in `InterventionsService.demarrer`/`terminer` (Task 4) and its own test (Task 3). DTO field names (`salleOperationId`, `chirurgienPrincipalId`, `dureeEstimeeMinutes`, etc.) are identical across entity, DTO, service, and controller layers.

---

Plan complete and saved to `docs/superpowers/plans/2026-06-24-bloc-operatoire.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
