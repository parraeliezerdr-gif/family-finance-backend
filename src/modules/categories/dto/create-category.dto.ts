import { IsHexColor, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsUUID()
  householdId: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsHexColor()
  @IsOptional()
  color?: string;
}