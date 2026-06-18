import { ApiProperty } from '@nestjs/swagger';
import { LitStatut } from '@sih-saas/shared';
import { IsEnum } from 'class-validator';

/** Réservé aux transitions structurelles (RESERVE/MAINTENANCE/LIBRE) — pas OCCUPE, qui ne se fixe que via assigner(). */
export class UpdateLitStatutDto {
  @ApiProperty({ enum: LitStatut })
  @IsEnum(LitStatut)
  statut: LitStatut;
}
