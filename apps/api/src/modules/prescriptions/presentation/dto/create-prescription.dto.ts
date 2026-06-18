import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { CreatePrescriptionLigneDto } from './create-prescription-ligne.dto';

export class CreatePrescriptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  consultationId?: string;

  @ApiProperty({ type: [CreatePrescriptionLigneDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionLigneDto)
  lignes: CreatePrescriptionLigneDto[];
}
