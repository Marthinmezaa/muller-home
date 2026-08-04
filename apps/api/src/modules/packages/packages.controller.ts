import { Body, Controller, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { MAX_PROOF_SIZE_BYTES } from '../../storage/r2.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { PackagesService } from './packages.service';

@Controller('packages')
@UseGuards(SessionAuthGuard, RolesGuard)
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  createPackage(@Body() dto: CreatePackageDto) {
    return this.packagesService.createPackage(dto);
  }

  @Get()
  listPackages() {
    return this.packagesService.listActivePackages();
  }

  @Post(':id/purchases')
  @Roles(Role.ADVISOR, Role.FRANCHISE_ADMIN)
  @UseInterceptors(FileInterceptor('proof', { limits: { fileSize: MAX_PROOF_SIZE_BYTES } }))
  createPurchase(@Param('id') packageId: string, @CurrentUser() user: User, @UploadedFile() file?: Express.Multer.File) {
    return this.packagesService.createPurchase(user, packageId, file);
  }

  @Post('purchases/:id/proof')
  @UseInterceptors(FileInterceptor('proof', { limits: { fileSize: MAX_PROOF_SIZE_BYTES } }))
  resendProof(@Param('id') id: string, @CurrentUser() user: User, @UploadedFile() file?: Express.Multer.File) {
    return this.packagesService.resendProof(user, id, file);
  }

  @Patch('purchases/:id/approve')
  @Roles(Role.SUPER_ADMIN)
  approvePurchase(@Param('id') id: string, @CurrentUser() user: User) {
    return this.packagesService.approvePurchase(user, id);
  }

  @Patch('purchases/:id/reject')
  @Roles(Role.SUPER_ADMIN)
  rejectPurchase(@Param('id') id: string, @CurrentUser() user: User) {
    return this.packagesService.rejectPurchase(user, id);
  }

  @Get('purchases/mine')
  findMyPurchases(@CurrentUser() user: User) {
    return this.packagesService.findMyPurchases(user.id);
  }

  @Get('purchases')
  @Roles(Role.SUPER_ADMIN)
  findAllPurchases() {
    return this.packagesService.findAllPurchases();
  }

  @Get('purchases/:id/proof-url')
  @Roles(Role.SUPER_ADMIN)
  getProofUrl(@Param('id') id: string) {
    return this.packagesService.getProofUrl(id);
  }

  @Get('quota')
  async getQuota(@CurrentUser() user: User) {
    return { available: await this.packagesService.getAvailableQuota(user.id) };
  }
}
