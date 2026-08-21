import { sign, verify } from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { hashSync, compareSync } from 'bcrypt';
import crypto from 'crypto';
// @ts-ignore
import EVP_BytesToKey from 'evp_bytestokey';
const algorithm = 'aes-256-cbc';
const { keyLength, ivLength } = crypto.getCipherInfo(algorithm);

function deriveLegacyKeyIv(secret: string) {
  const { keyLength, ivLength } = crypto.getCipherInfo(algorithm); // 32, 16
  const pass = Buffer.isBuffer(secret) ? secret : Buffer.from(secret ?? '', 'utf8');

  // evp_bytestokey: key length in **bits**, IV length in **bytes**
  const { key, iv } = EVP_BytesToKey(pass, null, keyLength * 8, ivLength, 'md5');

  if (key.length !== keyLength || iv.length !== ivLength) {
    throw new Error(`Derived wrong sizes (key=${key.length}, iv=${iv.length})`);
  }
  return { key, iv };
}

export function decrypt_legacy_using_IV(hexCiphertext: string) {
  const { key, iv } = deriveLegacyKeyIv(process.env.JWT_SECRET);
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  const out = Buffer.concat([decipher.update(hexCiphertext, 'hex'), decipher.final()]);
  return out.toString('utf8');
}

export function encrypt_legacy_using_IV(utf8Plaintext: string) {
  const { key, iv } = deriveLegacyKeyIv(process.env.JWT_SECRET);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const out = Buffer.concat([cipher.update(utf8Plaintext, 'utf8'), cipher.final()]);
  return out.toString('hex');
}

const secureAlgorithm = 'aes-256-gcm';

function secureKey() {
  return crypto
    .createHash('sha256')
    .update(process.env.DATA_ENCRYPTION_KEY ?? process.env.JWT_SECRET ?? '')
    .digest();
}

export function encrypt_using_authenticated_cipher(utf8Plaintext: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(secureAlgorithm, secureKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(utf8Plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `gcm:v1:${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
}

export function decrypt_using_authenticated_cipher(value: string) {
  if (!value.startsWith('gcm:v1:')) {
    return decrypt_legacy_using_IV(value);
  }

  const [, version, ivHex, tagHex, ciphertextHex] = value.split(':');
  if (version !== 'v1' || !ivHex || !tagHex || !ciphertextHex) {
    throw new Error('Invalid encrypted secret format');
  }
  const decipher = crypto.createDecipheriv(
    secureAlgorithm,
    secureKey(),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}
export class AuthService {
  static hashApiKey(value: string) {
    return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
  }

  static hashPassword(password: string) {
    return hashSync(password, 10);
  }
  static comparePassword(password: string, hash: string) {
    return compareSync(password, hash);
  }
  static signJWT(value: object, options: SignOptions & { type?: string } = {}) {
    const { type = 'legacy', ...jwtOptions } = options;
    return sign({ ...value, typ: type }, process.env.JWT_SECRET!, {
      expiresIn: '30d',
      ...jwtOptions,
      algorithm: 'HS256',
    });
  }
  // Every `typ` this app itself ever issues via signJWT with the shared
  // JWT_SECRET (session cookies, invite links, payment callbacks, extension
  // and integration tokens - see the various `signJWT(..., { type: '...' })`
  // call sites). Endpoints that accept a JWT signed by an EXTERNAL party
  // (e.g. an enterprise/white-label partner holding the same JWT_SECRET) but
  // have no `AuthMiddleware` of their own must reject any of these - without
  // that check, one of this app's own tokens (a user's session cookie, for
  // example) could be replayed at that external-facing endpoint instead of
  // the token type it actually expects.
  static readonly INTERNAL_JWT_TYPES = [
    'session',
    'integration-cookies',
    'integration-webhook',
    'extension',
    'org-invite',
    'payment',
  ];

  static verifyJWT(
    token: string,
    expectedType?: string,
    options: { rejectInternalTypes?: boolean } = {}
  ) {
    const payload = verify(token, process.env.JWT_SECRET!, {
      algorithms: ['HS256'],
    }) as Record<string, unknown>;
    if (expectedType && payload.typ !== expectedType) {
      throw new Error('Invalid token type');
    }
    if (
      options.rejectInternalTypes &&
      typeof payload.typ === 'string' &&
      AuthService.INTERNAL_JWT_TYPES.includes(payload.typ)
    ) {
      throw new Error('Invalid token type');
    }
    return payload;
  }

  static fixedEncryption(value: string) {
    return encrypt_legacy_using_IV(value);
  }

  static fixedDecryption(hash: string) {
    return decrypt_legacy_using_IV(hash);
  }

  // New secrets use AES-256-GCM with a random nonce and authentication tag.
  // The decryptor accepts the legacy CBC format so existing integrations can
  // be migrated lazily without a destructive database rewrite.
  static secureEncryption(value: string) {
    return encrypt_using_authenticated_cipher(value);
  }

  static secureDecryption(value: string) {
    return decrypt_using_authenticated_cipher(value);
  }
}
