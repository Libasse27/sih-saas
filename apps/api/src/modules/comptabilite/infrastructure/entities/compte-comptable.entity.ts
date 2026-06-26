import { CompteType } from '@sih-saas/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ schema: 'clinic', name: 'plan_comptable' })
@Unique(['etablissementId', 'code'])
@Index(['etablissementId'])
export class CompteComptableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'etablissement_id' })
  etablissementId: string;

  @Column({ length: 10 })
  code: string;

  @Column({ length: 100 })
  libelle: string;

  @Column({ type: 'smallint' })
  classe: number;

  @Column({ type: 'enum', enum: CompteType })
  type: CompteType;

  @Column({ name: 'is_actif', default: true })
  isActif: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
