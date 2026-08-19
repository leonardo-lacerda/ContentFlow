import {
  AuthService,
  encrypt_legacy_using_IV,
} from '@gitroom/helpers/auth/auth.service';
import { OrganizationService } from './organization.service';

// getPublicApiKey/resolveDisplayApiKey are the read path behind the
// Settings "API Key" panel. Production had orgs whose stored apiKey was
// legacy-format (aes-256-cbc, no gcm:v1: prefix) — the old code returned
// that ciphertext to the client as if it were the plaintext key, so the
// value users copied never authenticated. These tests exercise real
// encrypt/decrypt round trips (no mocked crypto) against both formats.
describe('OrganizationService api key resolution', () => {
  const originalEnv = process.env.DATA_ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.DATA_ENCRYPTION_KEY = 'test-encryption-secret-for-spec';
  });

  afterAll(() => {
    process.env.DATA_ENCRYPTION_KEY = originalEnv;
  });

  const makeService = (updateApiKey: jest.Mock) =>
    new OrganizationService(
      { updateApiKey } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

  describe('getPublicApiKey', () => {
    it('returns empty string for a null/undefined stored key', () => {
      const service = makeService(jest.fn());
      expect(service.getPublicApiKey(null)).toBe('');
      expect(service.getPublicApiKey(undefined)).toBe('');
    });

    it('decrypts a gcm:v1: (current format) key', () => {
      const service = makeService(jest.fn());
      const plain = 'cf_' + 'a'.repeat(48);
      const stored = AuthService.secureEncryption(plain);
      expect(stored.startsWith('gcm:v1:')).toBe(true);
      expect(service.getPublicApiKey(stored)).toBe(plain);
    });

    it('decrypts a legacy (pre-gcm) key instead of returning the raw ciphertext', () => {
      const service = makeService(jest.fn());
      const plain = 'cf_' + 'b'.repeat(48);
      const stored = encrypt_legacy_using_IV(plain);
      expect(stored.startsWith('gcm:v1:')).toBe(false);
      // This is the regression: the old implementation returned `stored`
      // (the ciphertext) verbatim here instead of decrypting it.
      expect(service.getPublicApiKey(stored)).toBe(plain);
    });

    it('does not throw on a corrupted/undecryptable value', () => {
      const service = makeService(jest.fn());
      expect(() => service.getPublicApiKey('not-a-real-ciphertext')).not.toThrow();
    });
  });

  describe('resolveDisplayApiKey', () => {
    it('returns the decrypted key when it matches the stored hash (no regeneration)', async () => {
      const updateApiKey = jest.fn();
      const service = makeService(updateApiKey);
      const plain = 'cf_' + 'c'.repeat(48);
      const organization = {
        id: 'org-1',
        apiKey: AuthService.secureEncryption(plain),
        apiKeyHash: AuthService.hashApiKey(plain),
      };

      const result = await service.resolveDisplayApiKey(organization);

      expect(result).toBe(plain);
      expect(updateApiKey).not.toHaveBeenCalled();
    });

    it('returns a legacy key that still matches its hash without regenerating it', async () => {
      const updateApiKey = jest.fn();
      const service = makeService(updateApiKey);
      const plain = 'cf_' + 'd'.repeat(48);
      const organization = {
        id: 'org-1',
        apiKey: encrypt_legacy_using_IV(plain),
        apiKeyHash: AuthService.hashApiKey(plain),
      };

      const result = await service.resolveDisplayApiKey(organization);

      expect(result).toBe(plain);
      expect(updateApiKey).not.toHaveBeenCalled();
    });

    it('regenerates when the decrypted key does not match the stored hash (orphaned key)', async () => {
      const freshKey = 'cf_' + 'e'.repeat(48);
      const updateApiKey = jest.fn().mockResolvedValue({ apiKey: freshKey });
      const service = makeService(updateApiKey);
      const organization = {
        id: 'org-2',
        // Encrypted with a value that won't round-trip to match this hash —
        // reproduces the production orgs whose legacy key predates the
        // current secret and decrypts to garbage.
        apiKey: encrypt_legacy_using_IV('some-other-plaintext'),
        apiKeyHash: AuthService.hashApiKey('cf_' + 'f'.repeat(48)),
      };

      const result = await service.resolveDisplayApiKey(organization);

      expect(result).toBe(freshKey);
      expect(updateApiKey).toHaveBeenCalledWith('org-2');
    });

    it('regenerates when there is no stored key at all', async () => {
      const freshKey = 'cf_' + 'g'.repeat(48);
      const updateApiKey = jest.fn().mockResolvedValue({ apiKey: freshKey });
      const service = makeService(updateApiKey);
      const organization = { id: 'org-3', apiKey: null, apiKeyHash: null };

      const result = await service.resolveDisplayApiKey(organization);

      expect(result).toBe(freshKey);
      expect(updateApiKey).toHaveBeenCalledWith('org-3');
    });
  });
});
