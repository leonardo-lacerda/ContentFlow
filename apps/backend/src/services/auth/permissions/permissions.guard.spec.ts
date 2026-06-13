import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Ability, AbilityBuilder, AbilityClass } from '@casl/ability';
import {
  AuthorizationActions,
  Sections,
  SubscriptionException,
} from './permission.exception.class';

// `PermissionsService` drags in the real subscriptions/integrations/social
// provider dependency chain (including ESM-only SDKs that the test bundler
// can't transform). The guard only ever calls `.check(...)`, so a lightweight
// stub keeps this a true unit test of PoliciesGuard's branching logic.
jest.mock('./permissions.service', () => ({
  PermissionsService: jest.fn().mockImplementation(() => ({ check: jest.fn() })),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PoliciesGuard } = require('./permissions.guard');
import type { PoliciesGuard as PoliciesGuardType } from './permissions.guard';
import type { PermissionsService, AppAbility } from './permissions.service';

const buildContext = (
  overrides: Partial<{
    path: string;
    org: any;
    query: Record<string, any>;
  }> = {}
): ExecutionContext => {
  const request = {
    path: overrides.path ?? '/posts',
    org: overrides.org ?? { id: 'org-1', createdAt: new Date(), users: [{ role: 'USER' }] },
    query: overrides.query ?? {},
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => jest.fn(),
  } as unknown as ExecutionContext;
};

const buildAbility = (allow: boolean): AppAbility => {
  const { can, cannot, build } = new AbilityBuilder<
    Ability<[AuthorizationActions, Sections]>
  >(Ability as AbilityClass<AppAbility>);

  if (allow) {
    can(AuthorizationActions.Create, Sections.CHANNEL);
  } else {
    cannot(AuthorizationActions.Create, Sections.CHANNEL);
  }

  return build({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    detectSubjectType: (item) => item.constructor,
  });
};

describe('PoliciesGuard', () => {
  let reflector: Reflector;
  let permissionsService: PermissionsService;
  let guard: PoliciesGuardType;

  beforeEach(() => {
    reflector = { get: jest.fn() } as unknown as Reflector;
    permissionsService = { check: jest.fn() } as unknown as PermissionsService;
    guard = new PoliciesGuard(reflector, permissionsService);
  });

  it('bypasses authorization for /auth routes', async () => {
    const context = buildContext({ path: '/auth/login' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(permissionsService.check).not.toHaveBeenCalled();
  });

  it('bypasses authorization for social-connect and provider integration routes', async () => {
    await expect(
      guard.canActivate(buildContext({ path: '/integrations/social-connect/x' }))
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(buildContext({ path: '/integrations/provider/x' }))
    ).resolves.toBe(true);

    expect(permissionsService.check).not.toHaveBeenCalled();
  });

  it('allows the request when the handler has no policies attached', async () => {
    (reflector.get as jest.Mock).mockReturnValue(undefined);

    await expect(guard.canActivate(buildContext())).resolves.toBe(true);
    expect(permissionsService.check).not.toHaveBeenCalled();
  });

  it('allows the request when the org ability grants every requested policy', async () => {
    (reflector.get as jest.Mock).mockReturnValue([
      [AuthorizationActions.Create, Sections.CHANNEL],
    ]);
    (permissionsService.check as jest.Mock).mockResolvedValue(buildAbility(true));

    const org = { id: 'org-1', createdAt: new Date('2024-01-01'), users: [{ role: 'USER' }] };
    const context = buildContext({ org, query: { refresh: 'channel-1' } });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(permissionsService.check).toHaveBeenCalledWith(
      org.id,
      org.createdAt,
      org.users[0].role,
      [[AuthorizationActions.Create, Sections.CHANNEL]],
      'channel-1'
    );
  });

  it('throws a SubscriptionException when the org ability denies a requested policy', async () => {
    (reflector.get as jest.Mock).mockReturnValue([
      [AuthorizationActions.Create, Sections.CHANNEL],
    ]);
    (permissionsService.check as jest.Mock).mockResolvedValue(buildAbility(false));

    await expect(guard.canActivate(buildContext())).rejects.toBeInstanceOf(
      SubscriptionException
    );
  });
});
