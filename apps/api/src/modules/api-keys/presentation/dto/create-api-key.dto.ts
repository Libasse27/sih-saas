import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Permission } from '@sih-saas/shared';
import { ArrayNotEmpty, IsArray, IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  nom: string;

  @ApiProperty({ enum: Permission, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Permission, { each: true })
  permissions: Permission[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expirationDate?: string;
}
