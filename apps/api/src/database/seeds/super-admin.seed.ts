import { Role, Scope } from '@sih-saas/shared';
import * as bcrypt from 'bcryptjs';
import { UserRoleEntity } from '../../modules/users/infrastructure/entities/user-role.entity';
import { UserEntity } from '../../modules/users/infrastructure/entities/user.entity';
import { AppDataSource } from '../data-source';

// Bootstrap du premier compte PLATFORM (aucune inscription publique n'existe pour ce scope — voir prompt maître §10.1).
async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@sih-saas.local';
  const password = process.env.SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);

  const dataSource = await AppDataSource.initialize();
  const usersRepository = dataSource.getRepository(UserEntity);
  const userRolesRepository = dataSource.getRepository(UserRoleEntity);

  const existing = await usersRepository.findOne({ where: { email } });
  if (existing) {
    console.log(`Le super-admin ${email} existe déjà — rien à faire.`);
    await dataSource.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash(password, rounds);
  const user = await usersRepository.save(
    usersRepository.create({
      scope: Scope.PLATFORM,
      etablissementId: null,
      nom: 'Super',
      prenom: 'Admin',
      email,
      passwordHash,
    }),
  );

  await userRolesRepository.save(userRolesRepository.create({ userId: user.id, role: Role.SUPER_ADMIN }));

  console.log(`Super-admin créé : ${email} (mot de passe défini via SUPER_ADMIN_PASSWORD).`);
  await dataSource.destroy();
}

seedSuperAdmin().catch((error) => {
  console.error('Échec du seed super-admin :', error);
  process.exit(1);
});
