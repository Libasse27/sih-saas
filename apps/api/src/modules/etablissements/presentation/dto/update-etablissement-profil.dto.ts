import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

/**
 * Champs administratifs auto-gérables par l'établissement — jamais `type`/`rccm`/`ninea`/`pays`/
 * `devise`/`langue`/`fuseau`/`code` (identité légale/structurelle, modifiable uniquement côté
 * super-admin via EtablissementsController) ni `statut`/`statutCdp`/`usage`/`compteurs`/`adminId`
 * (gérés par d'autres flux dédiés — paiement, CDP, provisioning, inscription).
 */
export class UpdateEtablissementProfilDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adresse?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ville?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string;
}
