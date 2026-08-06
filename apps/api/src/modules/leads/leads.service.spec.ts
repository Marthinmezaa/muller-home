import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { LeadsService } from './leads.service';

function createService(overrides: { prisma?: Record<string, unknown>; properties?: Record<string, unknown> } = {}) {
  const prisma: Record<string, unknown> = {
    lead: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    ...overrides.prisma,
  };
  const properties = {
    assertPropertyVisible: jest.fn().mockResolvedValue(undefined),
    findOwnedOrThrow: jest.fn(),
    assertCanManage: jest.fn().mockResolvedValue(undefined),
    ...overrides.properties,
  };
  const service = new LeadsService(prisma as never, properties as never);
  return { service, prisma: prisma as any, properties };
}

describe('LeadsService.createLead', () => {
  it('creates a lead when the property is publicly visible', async () => {
    const { service, prisma } = createService();

    await service.createLead('p1', { name: 'Ana', phone: '099123', message: 'Interesada' });

    expect(prisma.lead.create).toHaveBeenCalledWith({
      data: { propertyId: 'p1', name: 'Ana', phone: '099123', message: 'Interesada' },
    });
  });

  it('rejects a lead on a property that is not visible', async () => {
    const { service, properties } = createService({
      properties: { assertPropertyVisible: jest.fn().mockRejectedValue(new NotFoundException()) },
    });

    await expect(service.createLead('p1', { name: 'Ana', phone: '099123', message: 'Hola' })).rejects.toThrow(NotFoundException);
    expect(properties.assertPropertyVisible).toHaveBeenCalledWith('p1');
  });
});

describe('LeadsService.findForUser scoping', () => {
  it('scopes an advisor to their own properties', async () => {
    const { service, prisma } = createService();
    const advisor = { id: 'advisor-1', role: Role.ADVISOR, franchiseId: null } as never;

    await service.findForUser(advisor);

    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { property: { ownerId: 'advisor-1' } } }),
    );
  });

  it('scopes a franchise_admin to their whole team', async () => {
    const { service, prisma } = createService();
    const admin = { id: 'admin-1', role: Role.FRANCHISE_ADMIN, franchiseId: 'franchise-1' } as never;

    await service.findForUser(admin);

    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { property: { owner: { franchiseId: 'franchise-1' } } } }),
    );
  });

  it('does not scope a super_admin', async () => {
    const { service, prisma } = createService();
    const superAdmin = { id: 'root', role: Role.SUPER_ADMIN, franchiseId: null } as never;

    await service.findForUser(superAdmin);

    expect(prisma.lead.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });
});
