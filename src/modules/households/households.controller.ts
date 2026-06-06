import { Body, Controller, Get, Param, Post, UseGuards, Request } from '@nestjs/common';
import { HouseholdsService } from './households.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('households')
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Post()
  create(@Body() dto: CreateHouseholdDto, @Request() req) {
    return this.householdsService.create(dto, req.user.profileId);
  }

  @Get()
  findAll(@Request() req) {
    return this.householdsService.findAll(req.user.profileId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.householdsService.findOne(id);
  }
}
