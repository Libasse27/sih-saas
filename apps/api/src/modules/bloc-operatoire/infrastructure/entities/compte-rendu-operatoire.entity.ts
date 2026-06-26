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
