import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadsService } from './leads.service';

@Controller()
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post('properties/:propertyId/leads')
  create(@Param('propertyId') propertyId: string, @Body() dto: CreateLeadDto) {
    return this.leadsService.createLead(propertyId, dto);
  }

  @Get('properties/:propertyId/leads')
  @UseGuards(SessionAuthGuard)
  findForProperty(@Param('propertyId') propertyId: string, @CurrentUser() user: User) {
    return this.leadsService.findForProperty(user, propertyId);
  }

  @Get('leads')
  @UseGuards(SessionAuthGuard)
  findMine(@CurrentUser() user: User) {
    return this.leadsService.findForUser(user);
  }
}
