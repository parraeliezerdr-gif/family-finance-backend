import { AccountType } from '@prisma/client';

export class CreateAccountDto {
  householdId: string;

  name: string;

  type: AccountType;

  currencyCode: string;

  initialBalance: number;
}