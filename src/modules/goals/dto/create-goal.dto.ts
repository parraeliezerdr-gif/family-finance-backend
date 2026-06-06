import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateGoalDto {
  @IsUUID()
  householdId: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  targetAmount: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  currentAmount?: number;

  @IsDateString()
  @IsOptional()
  targetDate?: string;
}
