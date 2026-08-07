import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { MAX_MEDIA_SIZE_BYTES } from '../../storage/r2.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { SearchPropertiesDto } from './dto/search-properties.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertiesService } from './properties.service';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  // --- Portal público (visitante, sin login) ---

  @Get()
  search(@Query() filters: SearchPropertiesDto) {
    return this.propertiesService.searchProperties(filters);
  }

  @Get('mine')
  @UseGuards(SessionAuthGuard)
  findMine(@CurrentUser() user: User) {
    return this.propertiesService.findMyProperties(user);
  }

  @Get(':id')
  getDetail(@Param('id') id: string) {
    return this.propertiesService.getPropertyDetail(id);
  }

  // --- Publicación y gestión (asesor / franquicia / super admin) ---

  @Post()
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADVISOR, Role.FRANCHISE_ADMIN)
  create(@Body() dto: CreatePropertyDto, @CurrentUser() user: User) {
    return this.propertiesService.createProperty(user, dto);
  }

  @Patch(':id')
  @UseGuards(SessionAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdatePropertyDto, @CurrentUser() user: User) {
    return this.propertiesService.updateProperty(user, id, dto);
  }

  @Post(':id/media')
  @UseGuards(SessionAuthGuard)
  @UseInterceptors(FileInterceptor('media', { limits: { fileSize: MAX_MEDIA_SIZE_BYTES } }))
  addMedia(@Param('id') id: string, @CurrentUser() user: User, @UploadedFile() file?: Express.Multer.File) {
    return this.propertiesService.addMedia(user, id, file);
  }

  @Patch(':id/publish')
  @UseGuards(SessionAuthGuard)
  publish(@Param('id') id: string, @CurrentUser() user: User) {
    return this.propertiesService.publishProperty(user, id);
  }

  @Patch(':id/pause')
  @UseGuards(SessionAuthGuard)
  pause(@Param('id') id: string, @CurrentUser() user: User) {
    return this.propertiesService.pauseProperty(user, id);
  }

  @Patch(':id/reactivate')
  @UseGuards(SessionAuthGuard)
  reactivate(@Param('id') id: string, @CurrentUser() user: User) {
    return this.propertiesService.reactivateProperty(user, id);
  }

  @Patch(':id/close')
  @UseGuards(SessionAuthGuard)
  close(@Param('id') id: string, @CurrentUser() user: User) {
    return this.propertiesService.closeProperty(user, id);
  }

  // --- Baja de propiedad (solicitud del asesor, aprobación de administrador) ---

  @Post(':id/deletion-requests')
  @UseGuards(SessionAuthGuard)
  requestDeletion(@Param('id') id: string, @CurrentUser() user: User) {
    return this.propertiesService.requestDeletion(user, id);
  }

  @Patch('deletion-requests/:id/approve')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.FRANCHISE_ADMIN, Role.SUPER_ADMIN)
  approveDeletion(@Param('id') id: string, @CurrentUser() user: User) {
    return this.propertiesService.approveDeletion(user, id);
  }

  @Patch('deletion-requests/:id/reject')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.FRANCHISE_ADMIN, Role.SUPER_ADMIN)
  rejectDeletion(@Param('id') id: string, @CurrentUser() user: User) {
    return this.propertiesService.rejectDeletion(user, id);
  }
}
