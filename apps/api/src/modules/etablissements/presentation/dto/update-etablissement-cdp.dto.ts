import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatutAutorisationCdp } from '@sih-saas/shared';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

/** Remplace l'intégralité du dossier CDP à chaque appel (pas un PATCH partiel) — l'écran envoie
 * toujours l'état complet du formulaire, jamais un champ isolé. */
export class UpdateEtablissementCdpDto {
  @ApiProperty({ enum: StatutAutorisationCdp })
  @IsEnum(StatutAutorisationCdp)
  statut: StatutAutorisationCdp;

  @ApiPropertyOptional({ description: 'Numéro de récépissé délivré par la CDP à la soumission.' })
  @IsOptional()
  @IsString()
  numeroRecepisse?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateDemande?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateDecision?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commentaire?: string;
}
