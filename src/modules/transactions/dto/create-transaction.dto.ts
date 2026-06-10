import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
  LOAN_RECEIVED = 'LOAN_RECEIVED',
  LOAN_GIVEN = 'LOAN_GIVEN',
  CREDIT_CARD_PAYMENT = 'CREDIT_CARD_PAYMENT',
}

export class CreateSplitDto {
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateTransactionDto {
  @IsUUID()
  householdId: string;

  @IsUUID()
  accountId: string;

  @IsUUID()
  @IsOptional()
  toAccountId?: string;

  @IsUUID()
  @IsOptional()
  relatedLoanId?: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  transactionDate: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSplitDto)
  @IsOptional()
  splits?: CreateSplitDto[];
}
