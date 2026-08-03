import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';

const BCRYPT_COST = 12;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('El email ya esta registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
      },
    });

    return this.toSafeUser(user);
  }

  async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    return user;
  }

  async createFranchiseInvite(currentUser: User) {
    if (!currentUser.franchiseId) {
      throw new ForbiddenException('El usuario no pertenece a una franquicia');
    }

    const invite = await this.prisma.invite.create({
      data: {
        token: randomBytes(32).toString('hex'),
        franchiseId: currentUser.franchiseId,
        createdById: currentUser.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });

    return { token: invite.token, expiresAt: invite.expiresAt };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.invite.findUnique({ where: { token: dto.token } });

      if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
        throw new BadRequestException('Invitacion invalida o vencida');
      }

      const existing = await tx.user.findUnique({ where: { email: dto.email } });
      if (existing) {
        throw new ConflictException('El email ya esta registrado');
      }

      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          franchiseId: invite.franchiseId,
        },
      });

      await tx.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });

      return this.toSafeUser(user);
    });
  }

  toSafeUser(user: User) {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
