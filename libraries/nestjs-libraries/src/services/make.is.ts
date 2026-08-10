import { randomBytes } from 'crypto';

const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// Largest multiple of the alphabet size that fits in a byte (62 * 4 = 248).
// Bytes at or above it are discarded so every character stays equally likely —
// a plain `% 62` would skew the first 8 characters of the alphabet.
const REJECTION_THRESHOLD = 248;

/**
 * Cryptographically secure random id over [A-Za-z0-9].
 *
 * This is used for organization API keys, OAuth `state` values and PKCE code
 * verifiers, so it must not be predictable. The previous implementation used
 * Math.random(), whose xorshift128+ state can be recovered from a handful of
 * observed outputs.
 */
export const makeId = (length: number) => {
  let text = '';

  while (text.length < length) {
    // Over-sample so the rejected bytes rarely force another round trip.
    const bytes = randomBytes((length - text.length) * 2);

    for (const byte of bytes) {
      if (byte >= REJECTION_THRESHOLD) {
        continue;
      }
      text += ALPHABET[byte % ALPHABET.length];
      if (text.length === length) {
        break;
      }
    }
  }

  return text;
};
