import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateChambreDto {
  @ApiProperty()
  @IsUUID()
  serviceId: string;

  @ApiProperty()
  @IsString()
  numero: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;
}
