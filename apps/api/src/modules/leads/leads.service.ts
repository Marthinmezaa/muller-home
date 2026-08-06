import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PropertiesService } from '../properties/properties.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly properties: PropertiesService,
  ) {}

  async createLead(propertyId: string, dto: CreateLeadDto) {
    await this.properties.assertPropertyVisible(propertyId);
    return this.prisma.lead.create({ data: { propertyId, ...dto } });
  }

  async findForProperty(user: User, propertyId: string) {
    const property = await this.properties.findOwnedOrThrow(propertyId);
    await this.properties.assertCanManage(user, property);
    return this.prisma.lead.findMany({ where: { propertyId }, orderBy: { createdAt: 'desc' } });
  }

  findForUser(user: User) {
    return this.prisma.lead.findMany({
      where: this.scopeFilter(user),
      orderBy: { createdAt: 'desc' },
      include: { property: { select: { id: true, title: true } } },
    });
  }

  /** Asesor: solo sus propiedades. Franquicia: todo el equipo. Super admin: todo. */
  private scopeFilter(user: User): Prisma.LeadWhereInput {
    if (user.role === Role.SUPER_ADMIN) {
      return {};
    }
    if (user.role === Role.FRANCHISE_ADMIN && user.franchiseId) {
      return { property: { owner: { franchiseId: user.franchiseId } } };
    }
    return { property: { ownerId: user.id } };
  }
}
