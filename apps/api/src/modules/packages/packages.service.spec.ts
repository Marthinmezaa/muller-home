import { ForbiddenException } from '@nestjs/common';
import { PurchaseStatus } from '@prisma/client';
import { PackagesService } from './packages.service';

describe('PackagesService.consumeQuota', () => {
  function createService(purchases: Array<{ id: string; propertiesUsed: number; propertiesQuota: number }>) {
    const tx = {
      packagePurchase: {
        findMany: jest.fn().mockResolvedValue(purchases),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const prisma = {
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'user-1', franchiseId: null }) },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(tx)),
    };

    const service = new PackagesService(prisma as never, {} as never);
    return { service, prisma, tx };
  }

  it('consumes from the oldest approved purchase that still has quota left (FIFO)', async () => {
    // p1 is oldest (findMany already orders by createdAt asc) but exhausted;
    // p2 is next in line and has quota remaining.
    const { service, tx } = createService([
      { id: 'p1', propertiesUsed: 5, propertiesQuota: 5 },
      { id: 'p2', propertiesUsed: 2, propertiesQuota: 5 },
    ]);

    await service.consumeQuota('user-1');

    expect(tx.packagePurchase.updateMany).toHaveBeenCalledWith({
      where: { id: 'p2', propertiesUsed: 2 },
      data: { propertiesUsed: { increment: 1 } },
    });
  });

  it('throws when no approved purchase has quota left', async () => {
    const { service } = createService([{ id: 'p1', propertiesUsed: 5, propertiesQuota: 5 }]);

    await expect(service.consumeQuota('user-1')).rejects.toThrow(ForbiddenException);
  });

  it('throws when the guarded update loses a concurrency race', async () => {
    const { service, tx } = createService([{ id: 'p1', propertiesUsed: 0, propertiesQuota: 5 }]);
    tx.packagePurchase.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.consumeQuota('user-1')).rejects.toThrow(ForbiddenException);
  });
});

describe('PackagesService.getAvailableQuota', () => {
  it('sums remaining quota across all approved purchases of the resolved holder', async () => {
    const prisma = {
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'user-1', franchiseId: null }) },
      packagePurchase: {
        findMany: jest.fn().mockResolvedValue([
          { propertiesQuota: 5, propertiesUsed: 2, status: PurchaseStatus.APPROVED },
          { propertiesQuota: 1, propertiesUsed: 0, status: PurchaseStatus.APPROVED },
        ]),
      },
    };

    const service = new PackagesService(prisma as never, {} as never);

    await expect(service.getAvailableQuota('user-1')).resolves.toBe(4);
  });
});
