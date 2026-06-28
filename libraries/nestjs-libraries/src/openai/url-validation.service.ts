import { Injectable } from '@nestjs/common';
import * as dns from 'dns';
import { promisify } from 'util';

const dnsResolve4 = promisify(dns.resolve4);
const dnsResolve6 = promisify(dns.resolve6);

export interface ValidatedUrl {
  url: string;
  hostname: string;
  finalUrl: string;
}

export interface ValidationError {
  code: string;
  message: string;
}

const PRIVATE_RANGES = [
  { prefix: '10.', mask: null },
  { prefix: '172.16.', mask: null },
  { prefix: '192.168.', mask: null },
  { prefix: '169.254.', mask: null },
  { prefix: '127.', mask: null },
  { prefix: '0.', mask: null },
];

const DANGEROUS_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '127.0.0.1',
  '::1',
  '*.local',
  '*.internal',
];

function isPrivateIP(ip: string): boolean {
  const lowerIp = ip.toLowerCase();

  // Check for IPv6 loopback
  if (lowerIp === '::1') {
    return true;
  }

  // Check for IPv4-mapped IPv6 addresses (e.g. ::ffff:10.0.0.1)
  const ipv4MappedPrefix = '::ffff:';
  const effectiveIp = lowerIp.startsWith(ipv4MappedPrefix)
    ? lowerIp.slice(ipv4MappedPrefix.length)
    : lowerIp;

  return PRIVATE_RANGES.some((range) => effectiveIp.startsWith(range.prefix));
}

@Injectable()
export class UrlValidationService {
  async validate(
    rawUrl: string,
  ): Promise<
    { success: true; data: ValidatedUrl } | { success: false; error: ValidationError }
  > {
    try {
      // 1. Normalizar URL
      const normalizedUrl = this.normalizeUrl(rawUrl);

      // 2. Validar formato
      const parsed = new URL(normalizedUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return {
          success: false,
          error: {
            code: 'INVALID_PROTOCOL',
            message: 'Only HTTP and HTTPS protocols are allowed',
          },
        };
      }

      // 3. Bloquear hostnames perigosos
      if (this.isDangerousHostname(parsed.hostname)) {
        return {
          success: false,
          error: {
            code: 'BLOCKED_HOSTNAME',
            message: `Hostname "${parsed.hostname}" is blocked for security reasons`,
          },
        };
      }

      // 4. Resolver DNS e verificar IP privado
      const ipCheck = await this.checkPrivateIP(parsed.hostname);
      if (!ipCheck.allowed) {
        return {
          success: false,
          error: {
            code: 'PRIVATE_IP',
            message: `IP "${ipCheck.ip}" resolved from hostname is a private or loopback address`,
          },
        };
      }

      // 5. Seguir redirects
      const finalUrl = await this.followRedirects(normalizedUrl);

      return {
        success: true,
        data: {
          url: normalizedUrl,
          hostname: parsed.hostname,
          finalUrl,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: error.message || 'URL validation failed',
        },
      };
    }
  }

  private normalizeUrl(rawUrl: string): string {
    let url = rawUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return url;
  }

  private isDangerousHostname(hostname: string): boolean {
    const lower = hostname.toLowerCase();
    return DANGEROUS_HOSTNAMES.some((pattern) => {
      if (pattern.startsWith('*.')) {
        return lower.endsWith(pattern.slice(1));
      }
      return lower === pattern;
    });
  }

  private async checkPrivateIP(
    hostname: string,
  ): Promise<{ allowed: boolean; ip?: string }> {
    try {
      const addresses = await dnsResolve4(hostname);
      for (const ip of addresses) {
        if (isPrivateIP(ip)) {
          return { allowed: false, ip };
        }
      }
      return { allowed: true };
    } catch {
      // Tentar IPv6
      try {
        const addresses6 = await dnsResolve6(hostname);
        for (const ip of addresses6) {
          if (isPrivateIP(ip)) {
            return { allowed: false, ip };
          }
        }
        return { allowed: true };
      } catch {
        // Se não resolver DNS, permitir (pode ser erro temporário, o fetch vai falhar)
        return { allowed: true };
      }
    }
  }

  private async followRedirects(
    url: string,
    maxRedirects = 5,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': 'ContentFlow/1.0' },
      });

      if (
        response.status >= 300 &&
        response.status < 400 &&
        response.headers.get('location')
      ) {
        if (maxRedirects <= 0) {
          throw new Error('Too many redirects');
        }
        const location = response.headers.get('location')!;
        const resolvedUrl = new URL(location, url).toString();

        // Validar redirect também
        const parsed = new URL(resolvedUrl);
        if (this.isDangerousHostname(parsed.hostname)) {
          throw new Error(`Redirect target "${parsed.hostname}" is blocked`);
        }

        const ipCheck = await this.checkPrivateIP(parsed.hostname);
        if (!ipCheck.allowed) {
          throw new Error(
            `Redirect target IP "${ipCheck.ip}" is a private address`,
          );
        }

        return this.followRedirects(resolvedUrl, maxRedirects - 1);
      }

      return url;
    } finally {
      clearTimeout(timeout);
    }
  }
}
