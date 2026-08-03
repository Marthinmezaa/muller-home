import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.session?.userId;

    if (!userId) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException();
    }

    request.user = user;
    return true;
  }
}
