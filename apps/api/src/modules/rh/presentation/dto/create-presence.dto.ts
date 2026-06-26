import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PresenceStatut } from '@sih-saas/shared';
import { IsDateString, IsEnum, IsOptional, IsString, Matches } from 'class-validator';

const HEURE_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

export class CreatePresenceDto {
  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  @Matches(HEURE_REGEX, { message: "heureArrivee doit être au format HH:mm." })
  heureArrivee?: string;

  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional()
  @IsString()
  @Matches(HEURE_REGEX, { message: "heureDepart doit être au format HH:mm." })
  heureDepart?: string;

  @ApiProperty({ enum: PresenceStatut })
  @IsEnum(PresenceStatut)
  statut: PresenceStatut;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commentaire?: string;
}
