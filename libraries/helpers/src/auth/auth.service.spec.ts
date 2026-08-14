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
