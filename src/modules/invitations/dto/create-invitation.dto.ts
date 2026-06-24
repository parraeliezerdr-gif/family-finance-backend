import { IsEmail, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { HouseholdRole } from '@prisma/client';

export class CreateInvitationDto {
  @IsUUID()
  householdId: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsEnum(HouseholdRole)
  role: HouseholdRole;
}
