import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

/** Crée le compte de connexion du patient au portail (scope PATIENT) — utilisé par le portail mobile, Phase 10. */
export class CreatePatientAccesDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
