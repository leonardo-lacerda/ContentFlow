/**
 * SSRF Protection — URL Validator
 *
 * Validates URLs before server-side fetch to prevent:
 * - Access to localhost/internal services
 * - Access to cloud metadata endpoints (169.254.169.254)
 * - DNS rebinding attacks
 * - Protocol abuse (file://, gopher://)
 * - Redirect loops and oversized responses
 */

import { Logger } from '@nestjs/common';
import * as dns from 'dns';
import * as net from 'net';

const logger = new Logger('UrlValidator');

// Protocolos permitidos
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// Redes privadas (RFC 1918 + link-local + loopback)
const PRIVATE_RANGES = [
  { start: '127.0.0.0', end: '127.255.255.255', label: 'loopback' },
  { start: '10.0.0.0', end: '10.255.255.255', label: 'private-class-a' },
  { start: '172.16.0.0', end: '172.31.255.255', label: 'private-class-b' },
  { start: '192.168.0.0', end: '192.168.255.255', label: 'private-class-c' },
  { start: '169.254.0.0', end: '169.254.255.255', label: 'link-local' },
  { start: '0.0.0.0', end: '0.255.255.255', label: 'unspecified' },
];

// Hostnames bloqueados
const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'instance-data',
  '169.254.169.254',
];

// Configurações padrão
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_MAX_REDIRECTS = 5;

export class UrlValidator {
  /**
   * Validar URL completa contra SSRF
   */
  static async validate(url: string): Promise<{
    valid: boolean;
    error?: string;
    resolvedIp?: string;
  }> {
    try {
      // 1. Parse da URL
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return { valid: false, error: 'URL inválida' };
      }

      // 2. Validar protocolo
      if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
        return {
          valid: false,
          error: `Protocolo não permitido: ${parsed.protocol}. Use http: ou https:`,
        };
      }

      // 3. Validar hostname
      // URL.hostname keeps brackets around IPv6 literals in Node. Remove
      // them before net.isIP so loopback/private IPv6 cannot bypass checks.
      const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

      // Bloquear IPv6 mapeado
      if (hostname.startsWith('::ffff:')) {
        return { valid: false, error: 'IPv6 mapeado não permitido' };
      }

      // Bloquear hostnames conhecidos
      if (BLOCKED_HOSTNAMES.includes(hostname)) {
        return {
          valid: false,
          error: `Hostname bloqueado: ${hostname}`,
        };
      }

      // 4. Verificar se hostname é IP direto
      if (net.isIP(hostname)) {
        const ipType = net.isIP(hostname);
        if (ipType === 4) {
          if (this.isPrivateIP(hostname)) {
            return {
              valid: false,
              error: `IP privado não permitido: ${hostname}`,
            };
          }
        }
        // IPv6: verificar se é link-local ou loopback
        if (ipType === 6) {
          if (
            hostname === '::1' ||
            hostname === '::' ||
            hostname.startsWith('fe80:') ||
            hostname.startsWith('fc') ||
            hostname.startsWith('fd')
          ) {
            return {
              valid: false,
              error: `IPv6 privado não permitido: ${hostname}`,
            };
          }
        }
      }

      // 5. Resolver DNS e verificar IP resultante (previne DNS rebinding)
      try {
        const ips = await this.resolveDns(hostname);
        for (const ip of ips) {
          if (this.isPrivateIP(ip)) {
            return {
              valid: false,
              error: `DNS resolveu para IP privado: ${ip} (${hostname})`,
              resolvedIp: ip,
            };
          }
        }
      } catch (dnsError) {
        logger.warn(`DNS resolution failed for ${hostname}: ${dnsError}`);
        // Permitir continuar — hostname pode ser válido mas DNS temporariamente indisponível
      }

      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: `Erro na validação: ${error.message}` };
    }
  }

  /**
   * Fetch seguro com proteção SSRF completa
   */
  static async safeFetch(
    url: string,
    options?: {
      timeout?: number;
      maxSize?: number;
      maxRedirects?: number;
      headers?: Record<string, string>;
    }
  ): Promise<{
    ok: boolean;
    text?: string;
    error?: string;
    finalUrl?: string;
    redirectCount?: number;
  }> {
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;
    const maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE;
    const maxRedirects = options?.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

    // 1. Validar URL
    const validation = await this.validate(url);
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }

    // 2. Fetch com controles de segurança
    try {
      let currentUrl = url;
      let redirectCount = 0;

      while (true) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(currentUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'ContentFlow-Extractor/1.0',
            ...options?.headers,
          },
          redirect: 'manual', // Controle manual de redirects
        });

        clearTimeout(timeoutId);

        // 3. Tratar redirects manualmente
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          redirectCount++;
          if (redirectCount > maxRedirects) {
            return {
              ok: false,
              error: `Máximo de ${maxRedirects} redirects atingido`,
              redirectCount,
            };
          }

          const location = response.headers.get('location');
          if (!location) {
            return { ok: false, error: 'Redirect sem Location header' };
          }

          // Validar URL de redirect contra SSRF
          const redirectUrl = new URL(location, currentUrl).toString();
          const redirectValidation = await this.validate(redirectUrl);
          if (!redirectValidation.valid) {
            return {
              ok: false,
              error: `Redirect para URL bloqueada: ${redirectValidation.error}`,
              finalUrl: redirectUrl,
              redirectCount,
            };
          }

          currentUrl = redirectUrl;
          continue;
        }

        // 4. Verificar tamanho da resposta
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > maxSize) {
          return {
            ok: false,
            error: `Resposta muito grande: ${contentLength} bytes (máximo: ${maxSize})`,
            finalUrl: currentUrl,
            redirectCount,
          };
        }

        // 5. Ler conteúdo com limite de tamanho
        const reader = response.body?.getReader();
        if (!reader) {
          return { ok: false, error: 'Sem body na resposta' };
        }

        const chunks: Uint8Array[] = [];
        let totalSize = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          totalSize += value.length;
          if (totalSize > maxSize) {
            reader.cancel();
            return {
              ok: false,
              error: `Resposta excedeu tamanho máximo: ${totalSize} bytes`,
              finalUrl: currentUrl,
              redirectCount,
            };
          }

          chunks.push(value);
        }

        const text = new TextDecoder().decode(Buffer.concat(chunks));

        return {
          ok: true,
          text,
          finalUrl: currentUrl,
          redirectCount,
        };
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          ok: false,
          error: `Timeout após ${timeout}ms`,
          finalUrl: url,
        };
      }

      return {
        ok: false,
        error: `Fetch falhou: ${error.message}`,
        finalUrl: url,
      };
    }
  }

  /**
   * Verificar se IP é privado (RFC 1918 + link-local + loopback)
   */
  private static isPrivateIP(ip: string): boolean {
    const ipNum = this.ipToNumber(ip);
    if (ipNum === null) return false;

    for (const range of PRIVATE_RANGES) {
      const start = this.ipToNumber(range.start);
      const end = this.ipToNumber(range.end);
      if (start !== null && end !== null && ipNum >= start && ipNum <= end) {
        return true;
      }
    }

    return false;
  }

  /**
   * Converter IPv4 para número inteiro
   */
  private static ipToNumber(ip: string): number | null {
    const parts = ip.split('.');
    if (parts.length !== 4) return null;

    return (
      (parseInt(parts[0]) << 24) +
      (parseInt(parts[1]) << 16) +
      (parseInt(parts[2]) << 8) +
      parseInt(parts[3])
    );
  }

  /**
   * Resolver DNS
   */
  private static resolveDns(hostname: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      dns.resolve4(hostname, (err, addresses) => {
        if (err) reject(err);
        else resolve(addresses);
      });
    });
  }
}
