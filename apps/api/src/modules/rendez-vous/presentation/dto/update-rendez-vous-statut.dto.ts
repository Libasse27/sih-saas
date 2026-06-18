import { ApiProperty } from '@nestjs/swagger';
import { RendezVousStatut } from '@sih-saas/shared';
import { IsEnum } from 'class-validator';

export class UpdateRendezVousStatutDto {
  @ApiProperty({ enum: RendezVousStatut })
  @IsEnum(RendezVousStatut)
  statut: RendezVousStatut;
}
