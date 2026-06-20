import { ApiProperty } from '@nestjs/swagger';
import { CycleSterilisationStatut } from '@sih-saas/shared';
import { IsEnum } from 'class-validator';

export class UpdateCycleSterilisationDto {
  @ApiProperty({ enum: CycleSterilisationStatut })
  @IsEnum(CycleSterilisationStatut)
  statut: CycleSterilisationStatut;
}
