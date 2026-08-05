import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OperationType, PropertyStatus, PurchaseStatus, Role } from '@prisma/client';
import { PropertiesService, RETENTION_DAYS } from './properties.service';

function createService(overrides: { prisma?: Record<string, unknown>; packages?: Record<string, unknown> } = {}) {
  const prisma: Record<string, unknown> = {
    property: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
    },
    propertyMedia: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
    propertyDeletionRequest: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    ...overrides.prisma,
  };
  prisma.$transaction = jest.fn((callback: (tx: unknown) => unknown) => callback(prisma));

  const packages = { consumeQuota: jest.fn().mockResolvedValue(undefined), ...overrides.packages };
  const service = new PropertiesService(prisma as never, {} as never, packages as never);
  return { service, prisma: prisma as any, packages };
}

describe('PropertiesService.closeProperty', () => {
  it('closes a SALE property as SOLD', async () => {
    const { service, prisma } = createService({
      prisma: {
        property: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'p1',
            ownerId: 'owner-1',
            status: PropertyStatus.PUBLISHED,
            operationType: OperationType.SALE,
          }),
          update: jest.fn().mockResolvedValue({}),
        },
      },
    });
    const owner = { id: 'owner-1', role: Role.ADVISOR } as never;

    await service.closeProperty(owner, 'p1');

    expect(prisma.property.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { status: PropertyStatus.SOLD, closedAt: expect.any(Date) },
    });
  });

  it('closes a RENT property as RENTED', async () => {
    const { service, prisma } = createService({
      prisma: {
        property: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'p1',
            ownerId: 'owner-1',
            status: PropertyStatus.PUBLISHED,
            operationType: OperationType.RENT,
          }),
          update: jest.fn().mockResolvedValue({}),
        },
      },
    });
    const owner = { id: 'owner-1', role: Role.ADVISOR } as never;

    await service.closeProperty(owner, 'p1');

    expect(prisma.property.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { status: PropertyStatus.RENTED, closedAt: expect.any(Date) },
    });
  });

  it('refuses to close a property that is not published', async () => {
    const { service } = createService({
      prisma: {
        property: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'p1', ownerId: 'owner-1', status: PropertyStatus.DRAFT, operationType: OperationType.SALE }),
        },
      },
    });
    const owner = { id: 'owner-1', role: Role.ADVISOR } as never;

    await expect(service.closeProperty(owner, 'p1')).rejects.toThrow(BadRequestException);
  });
});

describe('PropertiesService authorization', () => {
  it('blocks a stranger advisor from managing someone else\'s property', async () => {
    const { service } = createService({
      prisma: {
        property: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', ownerId: 'owner-1', status: PropertyStatus.DRAFT }) },
      },
    });
    const stranger = { id: 'someone-else', role: Role.ADVISOR, franchiseId: null } as never;

    await expect(service.updateProperty(stranger, 'p1', {})).rejects.toThrow(ForbiddenException);
  });

  it('allows a franchise_admin to manage a property of their own team', async () => {
    const { service, prisma } = createService({
      prisma: {
        property: {
          findUnique: jest.fn().mockResolvedValue({ id: 'p1', ownerId: 'advisor-1', status: PropertyStatus.DRAFT }),
          update: jest.fn().mockResolvedValue({}),
        },
        user: { findUnique: jest.fn().mockResolvedValue({ id: 'advisor-1', franchiseId: 'franchise-1' }) },
      },
    });
    const admin = { id: 'admin-1', role: Role.FRANCHISE_ADMIN, franchiseId: 'franchise-1' } as never;

    await service.updateProperty(admin, 'p1', { title: 'Nuevo titulo' });

    expect(prisma.property.update).toHaveBeenCalled();
  });

  it('blocks the owner from approving their own deletion request', async () => {
    const { service } = createService({
      prisma: {
        propertyDeletionRequest: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'req-1',
            status: PurchaseStatus.PENDING,
            propertyId: 'p1',
            property: { id: 'p1', ownerId: 'owner-1' },
          }),
        },
      },
    });
    const owner = { id: 'owner-1', role: Role.ADVISOR, franchiseId: null } as never;

    await expect(service.approveDeletion(owner, 'req-1')).rejects.toThrow(ForbiddenException);
  });
});

describe('PropertiesService visibility window', () => {
  it('filters sold/rented properties by a retention cutoff RETENTION_DAYS in the past', async () => {
    const { service, prisma } = createService();
    const expectedCutoff = new Date();
    expectedCutoff.setDate(expectedCutoff.getDate() - RETENTION_DAYS);

    await service.searchProperties({});

    const { where } = prisma.property.findMany.mock.calls[0][0];
    const closedCase = where.AND[0].OR[1];

    expect(closedCase.status.in).toEqual([PropertyStatus.SOLD, PropertyStatus.RENTED]);
    // El corte es hacia el pasado (gte), con margen de un segundo por el tiempo de ejecucion del test.
    expect(Math.abs(closedCase.closedAt.gte.getTime() - expectedCutoff.getTime())).toBeLessThan(1000);
  });
});
