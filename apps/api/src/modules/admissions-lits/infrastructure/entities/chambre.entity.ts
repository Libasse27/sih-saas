import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ schema: 'clinic', name: 'chambres' })
@Index(['etablissementId'])
@Index(['etablissementId', 'serviceId'])
@Index(['etablissementId', 'serviceId', 'numero'], { unique: true })
export class ChambreEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etablissementId: string;

  @Column({ type: 'uuid' })
  serviceId: string;

  @Column()
  numero: string;

  @Column({ type: 'varchar', nullable: true })
  type: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
