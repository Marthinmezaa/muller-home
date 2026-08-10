import { ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';

function createService(overrides: { prisma?: Record<string, unknown> } = {}) {
  const prisma: Record<string, unknown> = {
    user: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides.prisma,
  };
  const service = new AuthService(prisma as never);
  return { service, prisma: prisma as any };
}

describe('AuthService.findFranchiseMembers', () => {
  it('lists users scoped to the caller\'s franchiseId', async () => {
    const { service, prisma } = createService({
      prisma: {
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'u1', email: 'a@x.com', passwordHash: 'hash', franchiseId: 'franchise-1', _count: { properties: 2 } },
          ]),
        },
      },
    });
    const admin = { id: 'admin-1', franchiseId: 'franchise-1' } as never;

    const result = await service.findFranchiseMembers(admin);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { franchiseId: 'franchise-1' } }),
    );
    expect(result[0]).not.toHaveProperty('passwordHash');
    expect(result[0]._count.properties).toBe(2);
  });

  it('refuses a user with no franchise', async () => {
    const { service } = createService();
    const noFranchise = { id: 'u1', franchiseId: null } as never;

    await expect(service.findFranchiseMembers(noFranchise)).rejects.toThrow(ForbiddenException);
  });
});
