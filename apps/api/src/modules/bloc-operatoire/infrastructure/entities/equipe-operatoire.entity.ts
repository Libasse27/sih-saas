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
