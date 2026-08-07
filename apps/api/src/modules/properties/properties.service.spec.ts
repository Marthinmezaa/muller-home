import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OperationType, PropertyStatus, PurchaseStatus, Role } from '@prisma/client';
import { PropertiesService, RETENTION_DAYS } from './properties.service';

function createService(
  overrides: { prisma?: Record<string, unknown>; packages?: Record<string, unknown>; storage?: Record<string, unknown> } = {},
) {
  const prisma: Record<string, unknown> = {
    property: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
    },
    propertyMedia: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      delete: jest.fn(),
      update: jest.fn(),
    },
    propertyDeletionRequest: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    ...overrides.prisma,
  };
  prisma.$transaction = jest.fn((callback: (tx: unknown) => unknown) => callback(prisma));

  const packages = { consumeQuota: jest.fn().mockResolvedValue(undefined), ...overrides.packages };
  const storage = { getMediaUrl: jest.fn().mockResolvedValue('https://r2.example/signed'), deleteObject: jest.fn(), ...overrides.storage };
  const service = new PropertiesService(prisma as never, storage as never, packages as never);
  return { service, prisma: prisma as any, packages, storage };
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

describe('PropertiesService.getManagedProperty', () => {
  it('returns a draft property (not visible publicly) to its owner, with resolved media urls', async () => {
    const { service, storage } = createService({
      prisma: {
        property: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'p1',
            ownerId: 'owner-1',
            status: PropertyStatus.DRAFT,
            media: [{ id: 'm1', key: 'properties/foo.jpg' }],
          }),
        },
      },
    });
    const owner = { id: 'owner-1', role: Role.ADVISOR, franchiseId: null } as never;

    const result = await service.getManagedProperty(owner, 'p1');

    expect(result.media[0].url).toBe('https://r2.example/signed');
    expect(storage.getMediaUrl).toHaveBeenCalledWith('properties/foo.jpg');
  });

  it('blocks a stranger advisor', async () => {
    const { service } = createService({
      prisma: {
        property: {
          findUnique: jest.fn().mockResolvedValue({ id: 'p1', ownerId: 'owner-1', status: PropertyStatus.DRAFT, media: [] }),
        },
      },
    });
    const stranger = { id: 'someone-else', role: Role.ADVISOR, franchiseId: null } as never;

    await expect(service.getManagedProperty(stranger, 'p1')).rejects.toThrow(ForbiddenException);
  });
});

describe('PropertiesService.deleteMedia', () => {
  it('deletes the object from storage and promotes the next photo to cover', async () => {
    const { service, prisma, storage } = createService({
      prisma: {
        property: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', ownerId: 'owner-1', status: PropertyStatus.DRAFT }) },
        propertyMedia: {
          findFirst: jest
            .fn()
            .mockResolvedValueOnce({ id: 'm1', propertyId: 'p1', key: 'properties/cover.jpg', isCover: true, order: 0 })
            .mockResolvedValueOnce({ id: 'm2', propertyId: 'p1', order: 1 }),
          delete: jest.fn(),
          update: jest.fn(),
        },
      },
    });
    const owner = { id: 'owner-1', role: Role.ADVISOR, franchiseId: null } as never;

    await service.deleteMedia(owner, 'p1', 'm1');

    expect(storage.deleteObject).toHaveBeenCalledWith('properties/cover.jpg');
    expect(prisma.propertyMedia.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
    expect(prisma.propertyMedia.update).toHaveBeenCalledWith({ where: { id: 'm2' }, data: { isCover: true } });
  });

  it('throws when the media does not belong to the property', async () => {
    const { service } = createService({
      prisma: {
        property: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', ownerId: 'owner-1', status: PropertyStatus.DRAFT }) },
        propertyMedia: { findFirst: jest.fn().mockResolvedValue(null) },
      },
    });
    const owner = { id: 'owner-1', role: Role.ADVISOR, franchiseId: null } as never;

    await expect(service.deleteMedia(owner, 'p1', 'not-mine')).rejects.toThrow(NotFoundException);
  });
});

describe('PropertiesService.reorderMedia', () => {
  it('sets order and marks the first id as cover', async () => {
    const { service, prisma } = createService({
      prisma: {
        property: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', ownerId: 'owner-1', status: PropertyStatus.DRAFT }) },
        propertyMedia: {
          findMany: jest.fn().mockResolvedValue([{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }]),
          update: jest.fn(),
        },
      },
    });
    const owner = { id: 'owner-1', role: Role.ADVISOR, franchiseId: null } as never;

    await service.reorderMedia(owner, 'p1', ['m3', 'm1', 'm2']);

    expect(prisma.propertyMedia.update).toHaveBeenNthCalledWith(1, { where: { id: 'm3' }, data: { order: 0, isCover: true } });
    expect(prisma.propertyMedia.update).toHaveBeenNthCalledWith(2, { where: { id: 'm1' }, data: { order: 1, isCover: false } });
    expect(prisma.propertyMedia.update).toHaveBeenNthCalledWith(3, { where: { id: 'm2' }, data: { order: 2, isCover: false } });
  });

  it('rejects an id list that does not match the property\'s existing media', async () => {
    const { service } = createService({
      prisma: {
        property: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', ownerId: 'owner-1', status: PropertyStatus.DRAFT }) },
        propertyMedia: { findMany: jest.fn().mockResolvedValue([{ id: 'm1' }, { id: 'm2' }]) },
      },
    });
    const owner = { id: 'owner-1', role: Role.ADVISOR, franchiseId: null } as never;

    await expect(service.reorderMedia(owner, 'p1', ['m1', 'not-mine'])).rejects.toThrow(BadRequestException);
  });
});

describe('PropertiesService.findMyProperties scoping', () => {
  it('scopes an advisor to their own properties', async () => {
    const { service, prisma } = createService();
    const advisor = { id: 'advisor-1', role: Role.ADVISOR, franchiseId: null } as never;

    await service.findMyProperties(advisor);

    expect(prisma.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: 'advisor-1' } }),
    );
  });

  it('scopes a franchise_admin to their whole team', async () => {
    const { service, prisma } = createService();
    const admin = { id: 'admin-1', role: Role.FRANCHISE_ADMIN, franchiseId: 'franchise-1' } as never;

    await service.findMyProperties(admin);

    expect(prisma.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { owner: { franchiseId: 'franchise-1' } } }),
    );
  });

  it('does not scope a super_admin', async () => {
    const { service, prisma } = createService();
    const superAdmin = { id: 'root', role: Role.SUPER_ADMIN, franchiseId: null } as never;

    await service.findMyProperties(superAdmin);

    expect(prisma.property.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });
});
