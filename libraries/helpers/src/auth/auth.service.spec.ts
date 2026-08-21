import { AuthService } from './auth.service';

describe('AuthService security primitives', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-authentication';
  });

  it('pins session tokens to HS256 and their declared type', () => {
    const token = AuthService.signJWT(
      { id: 'user-1' },
      { type: 'session', expiresIn: '5m' }
    );

    expect(AuthService.verifyJWT(token, 'session')).toMatchObject({
      id: 'user-1',
      typ: 'session',
    });
    expect(() => AuthService.verifyJWT(token, 'payment')).toThrow(
      'Invalid token type'
    );
  });

  // Regression test for the 2026-08-20 audit finding (N-5): endpoints that
  // accept an externally-signed JWT but have no AuthMiddleware of their own
  // (e.g. enterprise.controller.ts) used to call verifyJWT with no type
  // check at all, so a user's own session cookie - a perfectly valid JWT
  // signed with the same shared JWT_SECRET - could be replayed there
  // instead of the external token type the endpoint actually expects.
  it('rejectInternalTypes blocks replaying one of this app\'s own token types, but not an untyped external token', () => {
    const sessionToken = AuthService.signJWT(
      { id: 'user-1', email: 'victim@example.com' },
      { type: 'session', expiresIn: '5m' }
    );
    expect(() =>
      AuthService.verifyJWT(sessionToken, undefined, { rejectInternalTypes: true })
    ).toThrow('Invalid token type');

    const paymentToken = AuthService.signJWT(
      { order_id: 'org_abc' },
      { type: 'payment', expiresIn: '5m' }
    );
    expect(() =>
      AuthService.verifyJWT(paymentToken, undefined, { rejectInternalTypes: true })
    ).toThrow('Invalid token type');

    // An external partner's token, signed without ever going through this
    // app's signJWT (so it carries no `typ` claim at all - a foreign JWT
    // library has no reason to know about ContentFlow's internal `typ`
    // convention), must keep working.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jwt = require('jsonwebtoken');
    const rawExternalToken = jwt.sign({ id: 'ext-user' }, process.env.JWT_SECRET!, {
      algorithm: 'HS256',
    });
    expect(
      AuthService.verifyJWT(rawExternalToken, undefined, { rejectInternalTypes: true })
    ).toMatchObject({ id: 'ext-user' });
  });

  it('uses authenticated encryption with a fresh nonce and reads legacy data', () => {
    const first = AuthService.secureEncryption('secret-value');
    const second = AuthService.secureEncryption('secret-value');

    expect(first).toMatch(/^gcm:v1:/);
    expect(second).toMatch(/^gcm:v1:/);
    expect(first).not.toBe(second);
    expect(AuthService.secureDecryption(first)).toBe('secret-value');

    const legacy = AuthService.fixedEncryption('legacy-value');
    expect(AuthService.secureDecryption(legacy)).toBe('legacy-value');
  });
});
