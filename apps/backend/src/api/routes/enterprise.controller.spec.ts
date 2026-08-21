// EnterpriseController imports IntegrationManager, whose module chain
// transitively imports nostr.provider.ts -> nostr-tools (ESM), which Jest's
// default CJS transform can't parse (pre-existing gap, same rationale as
// generate.image.tool.spec.ts and friends). This test injects its own fake
// via the constructor anyway, so the real implementation is never used.
jest.mock('@gitroom/nestjs-libraries/integrations/integration.manager', () => ({
  IntegrationManager: class IntegrationManager {},
}));
// Same rationale: PostsService's module chain pulls in isomorphic-dompurify
// -> jsdom, another ESM chain Jest can't parse.
jest.mock('@gitroom/nestjs-libraries/database/prisma/posts/posts.service', () => ({
  PostsService: class PostsService {},
}));

import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { EnterpriseController } from './enterprise.controller';

// Regression test for the 2026-08-20 audit finding (N-5): EnterpriseController
// is NOT behind AuthMiddleware (it's a system-to-system endpoint meant for an
// external partner holding the shared JWT_SECRET) and used to call
// AuthService.verifyJWT(params) with no type check at all. Since a user's own
// session cookie is a perfectly valid JWT signed with that same JWT_SECRET,
// it could be replayed here as `params` instead of the token type this
// endpoint actually expects.

describe('EnterpriseController — token type confusion', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-authentication';
  });

  let organizationService: Record<string, jest.Mock>;
  let integrationService: Record<string, jest.Mock>;
  let postsService: Record<string, jest.Mock>;
  let controller: EnterpriseController;

  beforeEach(() => {
    organizationService = {
      createMaxUser: jest.fn().mockResolvedValue({ ok: true }),
      getOrgByApiKey: jest.fn().mockResolvedValue({ id: 'org-1' }),
    };
    integrationService = {
      getPostsForChannel: jest.fn().mockResolvedValue([]),
      deleteChannel: jest.fn().mockResolvedValue(undefined),
    };
    postsService = { deletePost: jest.fn() };
    controller = new EnterpriseController(
      {} as any, // IntegrationManager, unused by create-user
      organizationService as any,
      integrationService as any,
      postsService as any
    );
  });

  it('rejects a replayed user session cookie at /enterprise/create-user instead of creating an account from it', async () => {
    const sessionToken = AuthService.signJWT(
      { id: 'victim-user', name: 'Victim', email: 'victim@example.com' },
      { type: 'session', expiresIn: '24h' }
    );

    const result = await controller.createUser(sessionToken);

    expect(result).toEqual({ success: false });
    expect(organizationService.createMaxUser).not.toHaveBeenCalled();
  });

  it('rejects a replayed payment token at /enterprise/create-user', async () => {
    const paymentToken = AuthService.signJWT(
      { order_id: 'org-1_abc12' },
      { type: 'payment', expiresIn: '2h' }
    );

    const result = await controller.createUser(paymentToken);

    expect(result).toEqual({ success: false });
    expect(organizationService.createMaxUser).not.toHaveBeenCalled();
  });

  it('still accepts a genuinely external, untyped token (the legitimate partner flow)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jwt = require('jsonwebtoken');
    const externalToken = jwt.sign(
      { id: 'ext-1', name: 'Partner User', saasName: 'partner-saas', email: 'user@partner.com' },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256' }
    );

    const result = await controller.createUser(externalToken);

    expect(organizationService.createMaxUser).toHaveBeenCalledWith(
      'ext-1',
      'Partner User',
      'partner-saas',
      'user@partner.com'
    );
    expect(result).toEqual({ ok: true });
  });

  it('rejects a replayed session cookie at /enterprise/delete-channel', async () => {
    const sessionToken = AuthService.signJWT(
      { id: 'victim-user' },
      { type: 'session', expiresIn: '24h' }
    );

    const result = await controller.deleteChannel(sessionToken);

    expect(result).toEqual({ success: false });
    expect(integrationService.deleteChannel).not.toHaveBeenCalled();
  });

  it('rejects a replayed session cookie at /enterprise/url', async () => {
    const sessionToken = AuthService.signJWT(
      { id: 'victim-user' },
      { type: 'session', expiresIn: '24h' }
    );

    const result = await controller.redirectParams(sessionToken);

    expect(result).toBeUndefined();
    expect(organizationService.getOrgByApiKey).not.toHaveBeenCalled();
  });
});
