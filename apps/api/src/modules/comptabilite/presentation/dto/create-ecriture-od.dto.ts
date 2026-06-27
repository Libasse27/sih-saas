import { IsDateString, IsNotEmpty, IsNumber, IsPositive, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEcritureOdDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  libelle: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  compteDebitCode: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  montantDebit: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  compteCreditCode: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  montantCredit: number;
}
