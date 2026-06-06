import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  create(@Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(dto);
  }

  @Get()
  findAll(@Query('householdId') householdId: string) {
    return this.budgetsService.findAll(householdId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.budgetsService.remove(id);
  }
}
