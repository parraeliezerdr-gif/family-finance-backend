import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export enum AccountType {
  BANK = 'BANK',
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
}

export class CreateAccountDto {
  @IsUUID()
  householdId: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsString()
  @IsOptional()
  currencyCode?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  initialBalance?: number;
}