import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const user = await this.authService.register(dto);
    req.session.userId = user.id;
    return user;
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const user = await this.authService.validateCredentials(dto.email, dto.password);
    req.session.userId = user.id;
    return this.authService.toSafeUser(user);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => (err ? reject(err) : resolve()));
    });
    res.clearCookie('connect.sid');
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@CurrentUser() user: User) {
    return this.authService.toSafeUser(user);
  }

  @Post('franchise/invite')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.FRANCHISE_ADMIN)
  createFranchiseInvite(@CurrentUser() user: User) {
    return this.authService.createFranchiseInvite(user);
  }

  @Post('accept-invite')
  @HttpCode(201)
  async acceptInvite(@Body() dto: AcceptInviteDto, @Req() req: Request) {
    const user = await this.authService.acceptInvite(dto);
    req.session.userId = user.id;
    return user;
  }
}
