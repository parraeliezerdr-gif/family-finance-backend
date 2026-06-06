import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  create(@Body() dto: CreateGoalDto) {
    return this.goalsService.create(dto);
  }

  @Get()
  findAll(@Query('householdId') householdId: string) {
    return this.goalsService.findAll(householdId);
  }

  @Patch(':id/add')
  addAmount(@Param('id') id: string, @Body('amount') amount: number) {
    return this.goalsService.addAmount(id, amount);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.goalsService.remove(id);
  }
}
