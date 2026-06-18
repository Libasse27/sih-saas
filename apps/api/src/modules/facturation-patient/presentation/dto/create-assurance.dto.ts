import { ApiProperty } from '@nestjs/swagger';
import { OrganismeAssurance } from '@sih-saas/shared';
import { IsDateString, IsEnum, IsInt, IsString, Max, Min } from 'class-validator';

export class CreateAssuranceDto {
  @ApiProperty({ enum: OrganismeAssurance })
  @IsEnum(OrganismeAssurance)
  organisme: OrganismeAssurance;

  @ApiProperty()
  @IsString()
  numeroPolice: string;

  @ApiProperty({ description: 'Pourcentage de prise en charge, 0-100.' })
  @IsInt()
  @Min(0)
  @Max(100)
  tauxCouverture: number;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  valideDu: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  valideAu: string;
}
