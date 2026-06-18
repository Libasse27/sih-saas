import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Permission, Role, Scope } from '@sih-saas/shared';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { EtablissementsService } from '../../etablissements/application/etablissements.service';
import { SubscriptionsService } from '../../subscriptions/application/subscriptions.service';
import { resolveEffectivePermissions } from '../domain/permission-resolver';
import { RolePermissionEntity } from '../infrastructure/entities/role-permission.entity';
import { UserPermissionEntity } from '../infrastructure/entities/user-permission.entity';
import { UserRoleEntity } from '../infrastructure/entities/user-role.entity';
import { UserEntity } from '../infrastructure/entities/user.entity';
import { CreateUserDto } from '../presentation/dto/create-user.dto';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity) private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(UserRoleEntity) private readonly userRolesRepository: Repository<UserRoleEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionsRepository: Repository<RolePermissionEntity>,
    @InjectRepository(UserPermissionEntity)
    private readonly userPermissionsRepository: Repository<UserPermissionEntity>,
    private readonly config: ConfigService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly etablissementsService: EtablissementsService,
  ) {}

  async findByEmailForAuth(email: string): Promise<UserEntity | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findById(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }
    return user;
  }

  async create(dto: CreateUserDto): Promise<UserEntity> {
    const existing = await this.usersRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà.');
    }

    // Limite dynamique du forfait (prompt maître §8) — uniquement le personnel interne, pas les patients.
    if (dto.scope === Scope.ETABLISSEMENT && dto.etablissementId) {
      await this.subscriptionsService.assertWithinLimit(dto.etablissementId, 'maxUtilisateurs');
    }

    const rounds = this.config.get<number>('security.bcryptRounds') ?? 12;
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = await this.usersRepository.save(
      this.usersRepository.create({
        scope: dto.scope,
        etablissementId: dto.scope === Scope.PLATFORM ? null : dto.etablissementId ?? null,
        nom: dto.nom,
        prenom: dto.prenom,
        email: dto.email,
        telephone: dto.telephone ?? null,
        passwordHash,
      }),
    );

    if (dto.roles?.length) {
      await this.assignRoles(user.id, dto.roles);
    }

    if (dto.scope === Scope.ETABLISSEMENT && dto.etablissementId) {
      await this.etablissementsService.incrementUsage(dto.etablissementId, 'utilisateurs', 1);
    }

    return this.findById(user.id);
  }

  async assignRoles(userId: string, roles: Role[]): Promise<void> {
    await this.userRolesRepository.save(
      roles.map((role) => this.userRolesRepository.create({ userId, role })),
    );
  }

  async findByEtablissement(
    etablissementId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<UserEntity>> {
    const [items, total] = await this.usersRepository.findAndCount({
      where: { etablissementId },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async getRoles(userId: string): Promise<Role[]> {
    const userRoles = await this.userRolesRepository.find({ where: { userId } });
    return userRoles.map((userRole) => userRole.role);
  }

  /** Permissions effectives = somme des permissions des rôles + overrides ALLOW/DENY (matrice-rbac.md §3). */
  async getEffectivePermissions(userId: string, roles: Role[]): Promise<Permission[]> {
    const rolePermissionRows = roles.length
      ? await this.rolePermissionsRepository.find({ where: roles.map((role) => ({ role })) })
      : [];
    const overrides = await this.userPermissionsRepository.find({ where: { userId } });

    return resolveEffectivePermissions(
      rolePermissionRows.map((row) => row.permission),
      overrides.map((override) => ({ permission: override.permission, effect: override.effect })),
    );
  }

  isLocked(user: UserEntity): boolean {
    return !!user.verrouilleJusqua && user.verrouilleJusqua.getTime() > Date.now();
  }

  async recordFailedLogin(user: UserEntity): Promise<void> {
    const maxAttempts = this.config.get<number>('security.loginMaxTentatives') ?? 5;
    const lockMinutes = this.config.get<number>('security.loginVerrouillageMinutes') ?? 15;

    const tentativesEchouees = user.tentativesEchouees + 1;
    const verrouilleJusqua =
      tentativesEchouees >= maxAttempts ? new Date(Date.now() + lockMinutes * 60_000) : user.verrouilleJusqua;

    await this.usersRepository.update(user.id, { tentativesEchouees, verrouilleJusqua });
  }

  async recordSuccessfulLogin(user: UserEntity): Promise<void> {
    await this.usersRepository.update(user.id, {
      tentativesEchouees: 0,
      verrouilleJusqua: null,
      dernierLogin: new Date(),
    });
  }
}
