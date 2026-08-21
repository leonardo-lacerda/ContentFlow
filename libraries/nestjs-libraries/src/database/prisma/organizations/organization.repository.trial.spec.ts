import { OrganizationRepository } from './organization.repository';

// Regression coverage for the 2026-08-20 payment-security audit's trial
// abuse finding: createOrgAndUser used to hardcode allowTrial/isTrailing to
// true for every new org, with no way for the caller (auth.service.ts,
// after checking hasPlusAddressedAliasHistory) to withhold a fresh trial
// grant from an identity that already has one.

describe('OrganizationRepository.createOrgAndUser — allowTrial is caller-controlled', () => {
  const buildRepo = () => {
    const create = jest.fn().mockResolvedValue({ id: 'org-1', users: [{ user: { id: 'user-1' } }] });
    const repo = new OrganizationRepository(
      { model: { organization: { create } } } as any,
      {} as any,
      {} as any
    );
    return { repo, create };
  };

  const body = { company: 'Acme', email: 'user@acme.com', password: 'x', provider: 'LOCAL' } as any;

  it('defaults to granting a trial when the caller does not say otherwise', async () => {
    const { repo, create } = buildRepo();

    await repo.createOrgAndUser(body, true, '127.0.0.1', 'jest');

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ allowTrial: true, isTrailing: true }),
    }));
  });

  it('withholds the trial grant when the caller determines this identity already used one', async () => {
    const { repo, create } = buildRepo();

    await repo.createOrgAndUser(body, true, '127.0.0.1', 'jest', false);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ allowTrial: false, isTrailing: false }),
    }));
  });
});
