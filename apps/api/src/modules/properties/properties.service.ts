import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OperationType, Prisma, PropertyStatus, PurchaseStatus, Role } from '@prisma/client';
import type { Property, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { R2Service } from '../../storage/r2.service';
import { PackagesService } from '../packages/packages.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { SearchPropertiesDto } from './dto/search-properties.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

// ponytail: constante fija en vez de columna configurable en Package/DB.
// Subir a config si Marthin pide variarla por paquete o cambiarla en vivo.
export const RETENTION_DAYS = 30;

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: R2Service,
    private readonly packages: PackagesService,
  ) {}

  createProperty(owner: User, dto: CreatePropertyDto) {
    return this.prisma.property.create({ data: { ...dto, ownerId: owner.id } });
  }

  async updateProperty(user: User, id: string, dto: UpdatePropertyDto) {
    const property = await this.findOwnedOrThrow(id);
    await this.assertCanManage(user, property);

    return this.prisma.property.update({ where: { id }, data: dto });
  }

  async addMedia(user: User, propertyId: string, file?: Express.Multer.File) {
    const property = await this.findOwnedOrThrow(propertyId);
    await this.assertCanManage(user, property);

    const key = await this.storage.uploadPropertyMedia(file);
    const existingCount = await this.prisma.propertyMedia.count({ where: { propertyId } });

    return this.prisma.propertyMedia.create({
      data: {
        propertyId,
        key,
        type: file!.mimetype.startsWith('video/') ? 'VIDEO' : 'PHOTO',
        order: existingCount,
        isCover: existingCount === 0,
      },
    });
  }

  async publishProperty(user: User, id: string) {
    const property = await this.findOwnedOrThrow(id);
    await this.assertCanManage(user, property);

    if (property.status !== PropertyStatus.DRAFT) {
      throw new BadRequestException('Solo se puede publicar una propiedad en borrador');
    }

    await this.packages.consumeQuota(property.ownerId);

    return this.prisma.property.update({ where: { id }, data: { status: PropertyStatus.PUBLISHED } });
  }

  async pauseProperty(user: User, id: string) {
    const property = await this.findOwnedOrThrow(id);
    await this.assertCanManage(user, property);

    if (property.status !== PropertyStatus.PUBLISHED) {
      throw new BadRequestException('Solo se puede pausar una propiedad publicada');
    }

    return this.prisma.property.update({ where: { id }, data: { status: PropertyStatus.PAUSED } });
  }

  async reactivateProperty(user: User, id: string) {
    const property = await this.findOwnedOrThrow(id);
    await this.assertCanManage(user, property);

    if (property.status !== PropertyStatus.PAUSED) {
      throw new BadRequestException('Solo se puede reactivar una propiedad pausada');
    }

    return this.prisma.property.update({ where: { id }, data: { status: PropertyStatus.PUBLISHED } });
  }

  async closeProperty(user: User, id: string) {
    const property = await this.findOwnedOrThrow(id);
    await this.assertCanManage(user, property);

    if (property.status !== PropertyStatus.PUBLISHED) {
      throw new BadRequestException('Solo se puede cerrar una propiedad publicada');
    }

    const closedStatus = property.operationType === OperationType.SALE ? PropertyStatus.SOLD : PropertyStatus.RENTED;

    return this.prisma.property.update({
      where: { id },
      data: { status: closedStatus, closedAt: new Date() },
    });
  }

  async searchProperties(filters: SearchPropertiesDto) {
    const properties = await this.prisma.property.findMany({
      where: {
        AND: [
          this.visibleStatusFilter(),
          filters.city ? { city: { equals: filters.city, mode: 'insensitive' } } : {},
          filters.operationType ? { operationType: filters.operationType } : {},
          filters.propertyType ? { propertyType: filters.propertyType } : {},
          filters.minPrice !== undefined ? { price: { gte: filters.minPrice } } : {},
          filters.maxPrice !== undefined ? { price: { lte: filters.maxPrice } } : {},
          filters.minRooms !== undefined ? { rooms: { gte: filters.minRooms } } : {},
        ],
      },
      include: { media: true },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(properties.map((property) => this.attachMediaUrls(property)));
  }

  async getPropertyDetail(id: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, ...this.visibleStatusFilter() },
      include: { media: true, owner: { select: { fullName: true, phone: true } } },
    });

    if (!property) {
      throw new NotFoundException('Propiedad no encontrada');
    }

    await this.prisma.property.update({ where: { id }, data: { viewsCount: { increment: 1 } } });

    return this.attachMediaUrls(property);
  }

  /** Usado por el modulo de leads: 404 si la propiedad no es visible publicamente, sin contar vista. */
  async assertPropertyVisible(id: string): Promise<void> {
    const property = await this.prisma.property.findFirst({ where: { id, ...this.visibleStatusFilter() } });
    if (!property) {
      throw new NotFoundException('Propiedad no encontrada');
    }
  }

  findMyProperties(userId: string) {
    return this.prisma.property.findMany({ where: { ownerId: userId }, orderBy: { createdAt: 'desc' } });
  }

  async requestDeletion(user: User, propertyId: string) {
    const property = await this.findOwnedOrThrow(propertyId);
    if (property.ownerId !== user.id) {
      throw new ForbiddenException('Solo el dueño de la propiedad puede pedir su baja');
    }

    return this.prisma.propertyDeletionRequest.create({
      data: { propertyId, requestedById: user.id },
    });
  }

  async approveDeletion(reviewer: User, requestId: string) {
    const request = await this.findDeletionRequestOrThrow(requestId);
    await this.assertIsAdminOf(reviewer, request.property);

    return this.prisma.$transaction(async (tx) => {
      await tx.propertyDeletionRequest.update({
        where: { id: requestId },
        data: { status: PurchaseStatus.APPROVED, reviewedById: reviewer.id, reviewedAt: new Date() },
      });
      // Cascade en el schema borra su media y el resto de sus solicitudes de baja.
      await tx.property.delete({ where: { id: request.propertyId } });
    });
  }

  async rejectDeletion(reviewer: User, requestId: string) {
    const request = await this.findDeletionRequestOrThrow(requestId);
    await this.assertIsAdminOf(reviewer, request.property);

    return this.prisma.propertyDeletionRequest.update({
      where: { id: requestId },
      data: { status: PurchaseStatus.REJECTED, reviewedById: reviewer.id, reviewedAt: new Date() },
    });
  }

  /** Resuelve cada key de R2 a una URL prefirmada de lectura publica. */
  private async attachMediaUrls<T extends { media: { key: string }[] }>(
    property: T,
  ): Promise<T & { media: (T['media'][number] & { url: string })[] }> {
    const media = await Promise.all(
      property.media.map(async (item) => ({ ...item, url: await this.storage.getMediaUrl(item.key) })),
    );
    return { ...property, media };
  }

  private visibleStatusFilter(): Prisma.PropertyWhereInput {
    const retentionCutoff = new Date();
    retentionCutoff.setDate(retentionCutoff.getDate() - RETENTION_DAYS);

    return {
      OR: [
        { status: PropertyStatus.PUBLISHED },
        {
          status: { in: [PropertyStatus.SOLD, PropertyStatus.RENTED] },
          closedAt: { gte: retentionCutoff },
        },
      ],
    };
  }

  /** Publico: reusado por el modulo de leads para resolver la propiedad antes de autorizar. */
  async findOwnedOrThrow(id: string): Promise<Property> {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) {
      throw new NotFoundException('Propiedad no encontrada');
    }
    return property;
  }

  private async findDeletionRequestOrThrow(id: string) {
    const request = await this.prisma.propertyDeletionRequest.findUnique({
      where: { id },
      include: { property: true },
    });
    if (!request) {
      throw new NotFoundException('Solicitud de baja no encontrada');
    }
    if (request.status !== PurchaseStatus.PENDING) {
      throw new BadRequestException('La solicitud ya fue revisada');
    }
    return request;
  }

  /** Dueño, franchise_admin de su mismo equipo, o super_admin. Publico: mismo criterio que usa el modulo de leads para ver los leads de una propiedad. */
  async assertCanManage(user: User, property: Property): Promise<void> {
    if (user.role === Role.SUPER_ADMIN || property.ownerId === user.id) {
      return;
    }
    if (user.role === Role.FRANCHISE_ADMIN && (await this.sameFranchise(user, property.ownerId))) {
      return;
    }
    throw new ForbiddenException('No tiene permiso sobre esta propiedad');
  }

  /** franchise_admin de su mismo equipo, o super_admin. El dueño NO puede aprobar su propia baja. */
  private async assertIsAdminOf(reviewer: User, property: Property): Promise<void> {
    if (reviewer.role === Role.SUPER_ADMIN) {
      return;
    }
    if (reviewer.role === Role.FRANCHISE_ADMIN && (await this.sameFranchise(reviewer, property.ownerId))) {
      return;
    }
    throw new ForbiddenException('No tiene permiso para revisar esta solicitud');
  }

  private async sameFranchise(user: User, ownerId: string): Promise<boolean> {
    if (!user.franchiseId) {
      return false;
    }
    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    return owner?.franchiseId === user.franchiseId;
  }
}
