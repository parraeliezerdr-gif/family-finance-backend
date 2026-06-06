import { IsDateString, IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export enum PeriodType {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export class CreateBudgetDto {
  @IsUUID()
  householdId: string;

  @IsUUID()
  categoryId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(PeriodType)
  @IsOptional()
  periodType?: PeriodType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
