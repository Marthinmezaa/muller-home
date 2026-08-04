import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PurchaseStatus, Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { R2Service } from '../../storage/r2.service';
import { CreatePackageDto } from './dto/create-package.dto';

@Injectable()
export class PackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: R2Service,
  ) {}

  createPackage(dto: CreatePackageDto) {
    return this.prisma.package.create({ data: dto });
  }

  listActivePackages() {
    return this.prisma.package.findMany({ where: { active: true } });
  }

  async createPurchase(buyer: User, packageId: string, file?: Express.Multer.File) {
    await this.assertCanBuy(buyer);

    const pkg = await this.prisma.package.findUnique({ where: { id: packageId } });
    if (!pkg || !pkg.active) {
      throw new NotFoundException('Paquete no encontrado');
    }

    const proofKey = await this.storage.uploadProof(file);

    return this.prisma.packagePurchase.create({
      data: {
        packageId: pkg.id,
        buyerId: buyer.id,
        propertiesQuota: pkg.propertiesQuota,
        proofKey,
      },
    });
  }

  async resendProof(buyer: User, purchaseId: string, file?: Express.Multer.File) {
    const purchase = await this.prisma.packagePurchase.findUnique({ where: { id: purchaseId } });
    if (!purchase || purchase.buyerId !== buyer.id) {
      throw new NotFoundException('Compra no encontrada');
    }
    if (purchase.status !== PurchaseStatus.REJECTED) {
      throw new BadRequestException('Solo se puede reenviar comprobante de una compra rechazada');
    }

    const proofKey = await this.storage.uploadProof(file);

    return this.prisma.packagePurchase.update({
      where: { id: purchaseId },
      data: { status: PurchaseStatus.PENDING, proofKey, reviewedById: null, reviewedAt: null },
    });
  }

  async approvePurchase(reviewer: User, purchaseId: string) {
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.packagePurchase.findUnique({
        where: { id: purchaseId },
        include: { package: true, buyer: true },
      });
      if (!purchase) {
        throw new NotFoundException('Compra no encontrada');
      }
      if (purchase.status !== PurchaseStatus.PENDING) {
        throw new BadRequestException('La compra ya fue revisada');
      }

      const updated = await tx.packagePurchase.update({
        where: { id: purchaseId },
        data: { status: PurchaseStatus.APPROVED, reviewedById: reviewer.id, reviewedAt: new Date() },
      });

      // Promocion a franchise_admin: regla ya definida en la spec de auth,
      // disparada aca al aprobarse una compra multi-asesor.
      if (purchase.package.maxAdvisors > 1 && !purchase.buyer.franchiseId) {
        const franchise = await tx.franchise.create({
          data: { name: `Franquicia ${purchase.buyer.fullName}`, ownerUserId: purchase.buyer.id },
        });
        await tx.user.update({
          where: { id: purchase.buyer.id },
          data: { franchiseId: franchise.id, role: Role.FRANCHISE_ADMIN },
        });
      }

      return updated;
    });
  }

  async rejectPurchase(reviewer: User, purchaseId: string) {
    const purchase = await this.prisma.packagePurchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) {
      throw new NotFoundException('Compra no encontrada');
    }
    if (purchase.status !== PurchaseStatus.PENDING) {
      throw new BadRequestException('La compra ya fue revisada');
    }

    return this.prisma.packagePurchase.update({
      where: { id: purchaseId },
      data: { status: PurchaseStatus.REJECTED, reviewedById: reviewer.id, reviewedAt: new Date() },
    });
  }

  async getProofUrl(purchaseId: string) {
    const purchase = await this.prisma.packagePurchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) {
      throw new NotFoundException('Compra no encontrada');
    }

    return { url: await this.storage.getPresignedUrl(purchase.proofKey) };
  }

  findMyPurchases(userId: string) {
    return this.prisma.packagePurchase.findMany({ where: { buyerId: userId }, orderBy: { createdAt: 'desc' } });
  }

  findAllPurchases() {
    return this.prisma.packagePurchase.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getAvailableQuota(userId: string): Promise<number> {
    const holderId = await this.resolveQuotaHolderId(userId);
    const purchases = await this.prisma.packagePurchase.findMany({
      where: { buyerId: holderId, status: PurchaseStatus.APPROVED },
    });

    return purchases.reduce((total, p) => total + (p.propertiesQuota - p.propertiesUsed), 0);
  }

  /**
   * Descuenta 1 del cupo disponible, FIFO (compra approved mas vieja con
   * cupo restante primero). Consumido por el futuro modulo de propiedades
   * al publicar; no existe todavia en este codebase.
   */
  async consumeQuota(userId: string): Promise<void> {
    const holderId = await this.resolveQuotaHolderId(userId);

    await this.prisma.$transaction(async (tx) => {
      const purchases = await tx.packagePurchase.findMany({
        where: { buyerId: holderId, status: PurchaseStatus.APPROVED },
        orderBy: { createdAt: 'asc' },
      });

      const target = purchases.find((p) => p.propertiesUsed < p.propertiesQuota);
      if (!target) {
        throw new ForbiddenException('No hay cupo disponible');
      }

      // Guarda optimista: el where con el propertiesUsed leido asegura que,
      // bajo una carrera, solo una transaccion concurrente actualiza la fila.
      const result = await tx.packagePurchase.updateMany({
        where: { id: target.id, propertiesUsed: target.propertiesUsed },
        data: { propertiesUsed: { increment: 1 } },
      });

      if (result.count === 0) {
        // ponytail: pierde la carrera y no reintenta automaticamente contra
        // la siguiente compra; el llamador reintenta la operacion completa.
        throw new ForbiddenException('El cupo cambio, reintentar la operacion');
      }
    });
  }

  private async assertCanBuy(user: User): Promise<void> {
    if (user.role !== Role.ADVISOR && user.role !== Role.FRANCHISE_ADMIN) {
      throw new ForbiddenException('Solo asesores o admins de franquicia pueden comprar paquetes');
    }

    if (user.franchiseId) {
      const franchise = await this.prisma.franchise.findUnique({ where: { id: user.franchiseId } });
      if (franchise && franchise.ownerUserId !== user.id) {
        throw new ForbiddenException('Ya pertenece a una franquicia: consume el cupo compartido del equipo');
      }
    }
  }

  private async resolveQuotaHolderId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.franchiseId) {
      return user.id;
    }

    const franchise = await this.prisma.franchise.findUniqueOrThrow({ where: { id: user.franchiseId } });
    return franchise.ownerUserId;
  }
}
