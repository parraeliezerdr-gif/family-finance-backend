import { IsEmail, IsEnum, IsUUID } from 'class-validator';
import { HouseholdRole } from '@prisma/client';

export class CreateInvitationDto {
  @IsUUID()
  householdId: string;

  @IsEmail()
  email: string;

  @IsEnum(HouseholdRole)
  role: HouseholdRole;
}
