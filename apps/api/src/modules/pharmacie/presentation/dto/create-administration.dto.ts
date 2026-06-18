import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdministrationStatut } from '@sih-saas/shared';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAdministrationDto {
  @ApiProperty()
  @IsUUID()
  prescriptionLigneId: string;

  @ApiProperty({ enum: AdministrationStatut })
  @IsEnum(AdministrationStatut)
  statut: AdministrationStatut;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commentaire?: string;
}
