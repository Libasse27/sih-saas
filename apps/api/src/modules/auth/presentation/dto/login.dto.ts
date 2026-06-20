import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  /** Requis uniquement si le compte a activé le MFA (Phase 11) — voir AuthService.login. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mfaCode?: string;
}
