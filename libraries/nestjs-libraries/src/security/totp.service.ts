import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { hashSync, compareSync } from 'bcrypt';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_DRIFT_WINDOW = 1; // +/- 1 step (30s) either side of "now"

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// RFC 4226 HOTP core.
function hotp(secret: Buffer, counter: number, digits: number): string {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', secret).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (binCode % 10 ** digits).toString().padStart(digits, '0');
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a comparison of equal-length buffers so this branch isn't a
    // free timing oracle on length.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// RFC 6238 TOTP on top of the HOTP core, +/- one 30s step of drift allowed.
@Injectable()
export class TotpService {
  generateSecret(): string {
    return base32Encode(crypto.randomBytes(20));
  }

  buildOtpAuthUrl(params: {
    secret: string;
    accountName: string;
    issuer: string;
  }): string {
    const label = encodeURIComponent(`${params.issuer}:${params.accountName}`);
    const query = new URLSearchParams({
      secret: params.secret,
      issuer: params.issuer,
      algorithm: 'SHA1',
      digits: String(TOTP_DIGITS),
      period: String(TOTP_STEP_SECONDS),
    });
    return `otpauth://totp/${label}?${query.toString()}`;
  }

  async generateQrDataUrl(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  }

  generateToken(secretBase32: string, atTimeMs: number = Date.now()): string {
    const counter = Math.floor(atTimeMs / 1000 / TOTP_STEP_SECONDS);
    return hotp(base32Decode(secretBase32), counter, TOTP_DIGITS);
  }

  verifyToken(
    secretBase32: string,
    token: string,
    atTimeMs: number = Date.now()
  ): boolean {
    if (!token || !/^\d{6}$/.test(token)) {
      return false;
    }
    const secretBuf = base32Decode(secretBase32);
    for (
      let drift = -TOTP_DRIFT_WINDOW;
      drift <= TOTP_DRIFT_WINDOW;
      drift++
    ) {
      const counter =
        Math.floor(atTimeMs / 1000 / TOTP_STEP_SECONDS) + drift;
      const candidate = hotp(secretBuf, counter, TOTP_DIGITS);
      if (timingSafeStringEqual(candidate, token)) {
        return true;
      }
    }
    return false;
  }

  generateBackupCodes(count = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const raw = crypto.randomBytes(5).toString('hex'); // 10 hex chars
      codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
    }
    return codes;
  }

  hashBackupCode(code: string): string {
    return hashSync(code.trim().toLowerCase(), 10);
  }

  verifyBackupCode(code: string, hashes: string[]): number {
    const normalized = code.trim().toLowerCase();
    return hashes.findIndex((hash) => compareSync(normalized, hash));
  }
}
