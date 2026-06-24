import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './modules/email/email.module';
import { HouseholdsModule } from './modules/households/households.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { AuthModule } from './modules/auth/auth.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { GoalsModule } from './modules/goals/goals.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    EmailModule,
    HouseholdsModule,
    AccountsModule,
    CategoriesModule,
    AuthModule,
    TransactionsModule,
    BudgetsModule,
    GoalsModule,
    DashboardModule,
    InvitationsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
