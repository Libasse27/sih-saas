import { IsDateString, IsNotEmpty, IsNumber, IsPositive, IsString, MaxLength, registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { Type } from 'class-transformer';

function MontantsCroisesEgaux(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'montantsCroisesEgaux',
      target: (object as { constructor: Function }).constructor,
      propertyName,
      constraints: [property],
      options: { message: 'Le montant débit doit être égal au montant crédit (partie double).', ...validationOptions },
      validator: {
        validate(value: number, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as [string];
          const relatedValue = (args.object as Record<string, unknown>)[relatedPropertyName] as number;
          return value === relatedValue;
        },
      },
    });
  };
}

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
  @MontantsCroisesEgaux('montantDebit')
  @Type(() => Number)
  montantCredit: number;
}
