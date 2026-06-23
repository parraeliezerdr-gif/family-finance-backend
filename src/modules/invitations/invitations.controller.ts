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
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  create(@Body() dto: CreateInvitationDto, @Request() req) {
    return this.invitationsService.create(dto, req.user.profileId);
  }

  @Get()
  findAll(@Query('householdId') householdId: string) {
    return this.invitationsService.findAll(householdId);
  }

  @Post(':id/accept')
  accept(@Param('id') id: string, @Request() req) {
    return this.invitationsService.accept(id, req.user.profileId);
  }

  @Delete(':id')
  revoke(@Param('id') id: string) {
    return this.invitationsService.revoke(id);
  }
}
