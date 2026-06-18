import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, Scope } from '@sih-saas/shared';
import { IsArray, IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ enum: Scope })
  @IsEnum(Scope)
  scope: Scope;

  @ApiPropertyOptional({ description: 'Obligatoire si scope = ETABLISSEMENT ou PATIENT' })
  @IsOptional()
  @IsUUID()
  etablissementId?: string;

  @ApiProperty()
  @IsString()
  nom: string;

  @ApiProperty()
  @IsString()
  prenom: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Format +221XXXXXXXXX' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: Role, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(Role, { each: true })
  roles?: Role[];
}
