import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.accountsService.create(dto);
  }

  @Get()
  findAll(@Query('householdId') householdId: string) {
    return this.accountsService.findAll(householdId);
  }
}
