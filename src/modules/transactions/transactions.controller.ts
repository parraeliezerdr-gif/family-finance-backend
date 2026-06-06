import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@Body() dto: CreateTransactionDto, @Request() req) {
    return this.transactionsService.create(dto, req.user.profileId);
  }

  @Get()
  findAll(@Query('householdId') householdId: string) {
    return this.transactionsService.findAll(householdId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.transactionsService.remove(id);
  }
}
