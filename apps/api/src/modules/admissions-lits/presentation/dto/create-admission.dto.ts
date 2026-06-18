import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAdmissionDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty()
  @IsUUID()
  serviceId: string;

  @ApiPropertyOptional({ description: 'Lit assigné immédiatement à l’admission, si disponible.' })
  @IsOptional()
  @IsUUID()
  litId?: string;

  @ApiProperty()
  @IsUUID()
  medecinReferentId: string;

  @ApiProperty()
  @IsString()
  motif: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateSortiePrevue?: string;
}
