import { HttpException } from '@nestjs/common';
import { TemplateMarketplaceService } from './template-marketplace.service';

// Regression tests for two IDOR/mass-assignment findings from the 2026-08-20
// security audit:
//  - createTemplate used to accept a client-supplied `source`, letting any
//    org self-approve its own template as APPROVED/OFFICIAL, skipping the
//    admin moderation queue entirely.
//  - getTemplate/installTemplate did `findUnique({ where: { id } })` with no
//    ownership check, so a PRIVATE or not-yet-approved template was readable
//    and installable by any organization that knew/guessed its id.
describe('TemplateMarketplaceService', () => {
  const makeService = (overrides: Partial<Record<string, jest.Mock>> = {}) => {
    const prisma = {
      marketplaceTemplate: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        ...overrides,
      },
      templateInstallation: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    const service = new TemplateMarketplaceService(prisma as any);
    return { service, prisma };
  };

  describe('createTemplate', () => {
    it('always creates PENDING_REVIEW, ignoring any attempt to self-approve', async () => {
      const { service, prisma } = makeService();
      prisma.marketplaceTemplate.create.mockResolvedValue({});

      await service.createTemplate('org-attacker', {
        name: 'n',
        description: 'd',
        category: 'c',
        templateData: {},
        // A caller that still POSTs a raw `source: "OFFICIAL"` field (the
        // old exploit payload) has no effect: the service's `data` type no
        // longer accepts it, and even if it arrived via an unchecked HTTP
        // body, this call site never reads it.
        ...( { source: 'OFFICIAL' } as any),
      });

      const createArgs = prisma.marketplaceTemplate.create.mock.calls[0][0];
      expect(createArgs.data.status).toBe('PENDING_REVIEW');
      expect(createArgs.data.source).toBe('COMMUNITY');
    });

    it('honors an explicit private:true request as PRIVATE, still PENDING_REVIEW', async () => {
      const { service, prisma } = makeService();
      prisma.marketplaceTemplate.create.mockResolvedValue({});

      await service.createTemplate('org-a', {
        name: 'n',
        description: 'd',
        category: 'c',
        templateData: {},
        private: true,
      });

      const createArgs = prisma.marketplaceTemplate.create.mock.calls[0][0];
      expect(createArgs.data.source).toBe('PRIVATE');
      expect(createArgs.data.status).toBe('PENDING_REVIEW');
    });
  });

  describe('getTemplate ownership scoping', () => {
    it('404s a PRIVATE template for a non-owner organization', async () => {
      const { service, prisma } = makeService();
      prisma.marketplaceTemplate.findUnique.mockResolvedValue({
        id: 't1',
        creatorOrgId: 'org-owner',
        source: 'PRIVATE',
        status: 'APPROVED',
        deletedAt: null,
      });

      await expect(service.getTemplate('t1', 'org-attacker')).rejects.toThrow(
        HttpException
      );
    });

    it('returns a PRIVATE template to its own creator org', async () => {
      const { service, prisma } = makeService();
      const template = {
        id: 't1',
        creatorOrgId: 'org-owner',
        source: 'PRIVATE',
        status: 'PENDING_REVIEW',
        deletedAt: null,
      };
      prisma.marketplaceTemplate.findUnique.mockResolvedValue(template);

      await expect(service.getTemplate('t1', 'org-owner')).resolves.toBe(
        template
      );
    });

    it('404s a PENDING_REVIEW COMMUNITY template for a non-owner (not yet publicly visible)', async () => {
      const { service, prisma } = makeService();
      prisma.marketplaceTemplate.findUnique.mockResolvedValue({
        id: 't2',
        creatorOrgId: 'org-owner',
        source: 'COMMUNITY',
        status: 'PENDING_REVIEW',
        deletedAt: null,
      });

      await expect(service.getTemplate('t2', 'org-other')).rejects.toThrow(
        HttpException
      );
    });

    it('exposes an APPROVED COMMUNITY template to any organization', async () => {
      const { service, prisma } = makeService();
      const template = {
        id: 't3',
        creatorOrgId: 'org-owner',
        source: 'COMMUNITY',
        status: 'APPROVED',
        deletedAt: null,
      };
      prisma.marketplaceTemplate.findUnique.mockResolvedValue(template);

      await expect(service.getTemplate('t3', 'org-other')).resolves.toBe(
        template
      );
    });

    it('404s when called with no requesting org at all (e.g. anonymous)', async () => {
      const { service, prisma } = makeService();
      prisma.marketplaceTemplate.findUnique.mockResolvedValue({
        id: 't4',
        creatorOrgId: 'org-owner',
        source: 'PRIVATE',
        status: 'APPROVED',
        deletedAt: null,
      });

      await expect(service.getTemplate('t4')).rejects.toThrow(HttpException);
    });
  });

  // Regression coverage for a bypass of the F-08 fix found during
  // re-verification: getTemplate/installTemplate got an ownership check,
  // but listTemplates had none, so `?source=PRIVATE` (or leaving `source`
  // unset, which left it unconstrained) returned every organization's
  // PRIVATE templates through the plain browse/search endpoint.
  describe('listTemplates cross-org scoping', () => {
    it('never returns PRIVATE templates when source=PRIVATE is requested with no authenticated org', async () => {
      const { service, prisma } = makeService();
      const result = await service.listTemplates({ source: 'PRIVATE' });
      expect(result).toEqual([]);
      expect(prisma.marketplaceTemplate.findMany).not.toHaveBeenCalled();
    });

    it('scopes an explicit source=PRIVATE query to the requesting org only', async () => {
      const { service, prisma } = makeService();
      await service.listTemplates({ source: 'PRIVATE' }, 'org-1');

      const where = prisma.marketplaceTemplate.findMany.mock.calls[0][0].where;
      expect(where.AND).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ source: 'PRIVATE' }),
          expect.objectContaining({ creatorOrgId: 'org-1' }),
        ])
      );
    });

    it('excludes other orgs\' PRIVATE templates from a default (no source filter) browse', async () => {
      const { service, prisma } = makeService();
      await service.listTemplates({}, 'org-1');

      const where = prisma.marketplaceTemplate.findMany.mock.calls[0][0].where;
      const orClause = where.AND.find((c: any) => c.OR);
      expect(orClause).toBeDefined();
      expect(orClause.OR).toEqual(
        expect.arrayContaining([
          { source: { not: 'PRIVATE' } },
          { source: 'PRIVATE', creatorOrgId: 'org-1' },
        ])
      );
    });

    it('never returns a non-APPROVED global listing with no authenticated org', async () => {
      const { service, prisma } = makeService();
      const result = await service.listTemplates({ status: 'PENDING_REVIEW' });
      expect(result).toEqual([]);
      expect(prisma.marketplaceTemplate.findMany).not.toHaveBeenCalled();
    });

    it('scopes a non-APPROVED status query to the requesting org only', async () => {
      const { service, prisma } = makeService();
      await service.listTemplates({ status: 'PENDING_REVIEW' }, 'org-1');

      const where = prisma.marketplaceTemplate.findMany.mock.calls[0][0].where;
      expect(where.AND).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: 'PENDING_REVIEW' }),
          expect.objectContaining({ creatorOrgId: 'org-1' }),
        ])
      );
    });

    it('defaults to APPROVED, unscoped, for a plain browse', async () => {
      const { service, prisma } = makeService();
      await service.listTemplates();

      const where = prisma.marketplaceTemplate.findMany.mock.calls[0][0].where;
      expect(where.AND).toEqual(
        expect.arrayContaining([expect.objectContaining({ status: 'APPROVED' })])
      );
    });
  });

  // Regression coverage for an L1 finding from the 2026-08-20 audit that the
  // F-08 fix above missed: getTemplate/installTemplate/listTemplates all got
  // ownership scoping, but recordUsage still did a bare
  // `update({ where: { id } })` with no visibility check at all — any
  // authenticated org could tamper with another org's (including PRIVATE)
  // template usage counter, and a successful/failed update was itself a
  // tell for whether a guessed private template id existed.
  describe('recordUsage', () => {
    it('404s instead of incrementing when the template is not visible to the requesting org', async () => {
      const { service, prisma } = makeService();
      prisma.marketplaceTemplate.findUnique.mockResolvedValue({
        id: 't6',
        creatorOrgId: 'org-owner',
        source: 'PRIVATE',
        status: 'APPROVED',
        deletedAt: null,
      });

      await expect(
        service.recordUsage('t6', 'org-attacker')
      ).rejects.toThrow(HttpException);
      expect(prisma.marketplaceTemplate.update).not.toHaveBeenCalled();
    });

    it('increments usageCount when the template is visible to the requesting org', async () => {
      const { service, prisma } = makeService();
      prisma.marketplaceTemplate.findUnique.mockResolvedValue({
        id: 't7',
        creatorOrgId: 'org-owner',
        source: 'COMMUNITY',
        status: 'APPROVED',
        deletedAt: null,
      });
      prisma.marketplaceTemplate.update.mockResolvedValue({});

      await service.recordUsage('t7', 'org-other');

      expect(prisma.marketplaceTemplate.update).toHaveBeenCalledWith({
        where: { id: 't7' },
        data: { usageCount: { increment: 1 } },
      });
    });
  });

  describe('installTemplate', () => {
    it('blocks installing another org\'s PRIVATE template even if APPROVED', async () => {
      const { service, prisma } = makeService();
      prisma.marketplaceTemplate.findUnique.mockResolvedValue({
        id: 't5',
        creatorOrgId: 'org-owner',
        source: 'PRIVATE',
        status: 'APPROVED',
        deletedAt: null,
      });

      await expect(
        service.installTemplate('org-attacker', 't5')
      ).rejects.toThrow(HttpException);
      expect(prisma.templateInstallation.create).not.toHaveBeenCalled();
    });
  });
});
