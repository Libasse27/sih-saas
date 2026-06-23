import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IssueUrgence } from '@sih-saas/shared';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ClotureUrgenceDto {
  @ApiProperty({ enum: IssueUrgence })
  @IsEnum(IssueUrgence)
  issue: IssueUrgence;

  @ApiPropertyOptional({ description: 'Requis si issue = TRANSFERT_HOSPITALISATION.' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  litId?: string;

  @ApiPropertyOptional({ description: 'Médecin référent de la nouvelle admission — défaut : le médecin en charge des urgences.' })
  @IsOptional()
  @IsUUID()
  medecinReferentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateSortiePrevue?: string;
}
