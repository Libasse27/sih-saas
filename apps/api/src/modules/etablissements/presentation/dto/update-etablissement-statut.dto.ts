import { ApiProperty } from '@nestjs/swagger';
import { EtablissementStatut } from '@sih-saas/shared';
import { IsEnum } from 'class-validator';

export class UpdateEtablissementStatutDto {
  @ApiProperty({ enum: EtablissementStatut })
  @IsEnum(EtablissementStatut)
  statut: EtablissementStatut;
}
