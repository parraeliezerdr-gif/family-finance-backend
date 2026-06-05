import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HouseholdsModule } from './modules/households/households.module';
import { AccountsModule } from './modules/accounts/accounts.module';

@Module({
  imports: [PrismaModule, HouseholdsModule, AccountsModule],
})
export class AppModule {}