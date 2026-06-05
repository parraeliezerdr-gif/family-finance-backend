import { Body, Controller, Get, Post } from '@nestjs/common';
import { HouseholdsService } from './households.service';
import { CreateHouseholdDto } from './dto/create-household.dto';

@Controller('households')
export class HouseholdsController {
  constructor(
    private readonly householdsService: HouseholdsService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateHouseholdDto,
  ) {
    return this.householdsService.create(dto);
  }

  @Get()
  findAll() {
    return this.householdsService.findAll();
  }
}