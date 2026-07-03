# 🟡 Subfase P1-7: SSRF Protection

> **Fase:** CRÍTICO — Riscos de Infraestrutura
> **Subfase:** P1-7
> **Status:** Especificação Técnica Completa
> **Data:** 2026-07-02
> **Autor:** Hermes Agent

---

## 1. Objetivo

Proteger o sistema contra **SSRF (Server-Side Request Forgery)** — ataques onde um usuário malicioso fornece uma URL que faz o servidor acessar recursos internos (localhost, IPs privados, serviços internos) ou recursos não autorizados.

---

## 2. Contexto

### 2.1 Problema Atual

O `ExtractContentService` aceita qualquer URL sem validação:

```typescript
// extract.content.service.ts
async extractContent(url: string) {
  const load = await (await fetch(url)).text();  // ← VULNERÁVEL!
  const dom = new JSDOM(load);
  // ...
}
```

**Vetores de ataque:**
1. URL para `http://localhost:3000/admin` — acessar endpoints internos
2. URL para `http://169.254.169.254/latest/meta-data/` — acessar metadata de cloud
3. URL para `http://192.168.1.1/` — acessar roteadores internos
4. URL para `file:///etc/passwd` — ler arquivos do sistema
5. URL para `gopher://localhost:6379/` — atacar Redis
6. URL com redirect para recurso interno

### 2.2 Por Que Isso É Crítico

| Risco | Impacto | Severidade |
|-------|---------|------------|
| **Acesso a serviços internos** | Vazamento de dados, controle de infraestrutura | ALTA |
| **Leitura de arquivos** | Vazamento de configurações, senhas | ALTA |
| **Ataque a Redis/DB** | Modificação de dados, destruição | ALTA |
| **Pivoting para rede interna** | Acesso a outros serviços | ALTA |

---

## 3. Escopo da Subfase

### 3.1 O Que Será Implementado

1. **Validação de URL** — Bloquear protocolos inseguros
2. **Resolução de DNS** — Bloquear IPs privados após resolução
3. **Bloqueio de IPs** — localhost, 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
4. **Bloqueio de cloud metadata** — 169.254.169.254
5. **Timeout** — Limitar tempo de resposta
6. **Tamanho máximo** — Limitar tamanho da resposta
7. **Redirects** — Limitar número de redirects
8. **Logging** — Registrar tentativas bloqueadas

### 3.2 O Que NÃO Será Implementado

- Proxy de URLs (pode ser feito depois)
- Cache de URLs (será P1-1 ou Fase 1.2)

---

## 4. Implementação Detalhada

### 4.1 Arquivo a Criar

`libraries/nestjs-libraries/src/security/url-validator.ts`

```typescript
/**
 * Validador de URLs contra SSRF
 * 
 * Regras de segurança:
 * 1. Apenas HTTP/HTTPS
 * 2. Bloquear IPs privados
 * 3. Bloquear localhost
 * 4. Bloquear cloud metadata
 * 5. Timeout configurável
 * 6. Limite de tamanho
 * 7. Limite de redirects
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

// Configurações
const DEFAULT_TIMEOUT_MS = 10_000; // 10 segundos
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_MAX_REDIRECTS = 5;

export class UrlValidator {
  /**
   * Validar URL completa
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
      const hostname = parsed.hostname.toLowerCase();

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

      // 4. Verificar se hostname é IP
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

      // 5. Resolver DNS e verificar IP resultante
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
        // DNS falhou — pode ser hostname inválido
        logger.warn(`DNS resolution failed for ${hostname}: ${dnsError}`);
        // Permitir continuar (pode ser hostname válido mas DNS temporariamente indisponível)
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Erro na validação: ${error}` };
    }
  }

  /**
   * Fetch seguro com proteção SSRF
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

        // 3. Tratar redirects
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

          // Validar URL de redirect
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

        // 5. Ler conteúdo com limite
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

        const text = new TextDecoder().decode(
          Buffer.concat(chunks)
        );

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
   * Verificar se IP é privado
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
   * Converter IP para número
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
```

### 4.2 Mudanças no `ExtractContentService`

```typescript
// ANTES (atual - vulnerável):
async extractContent(url: string) {
  const load = await (await fetch(url)).text();  // ← SSRF!
  const dom = new JSDOM(load);
  // ...
}

// DEPOIS (novo - seguro):
async extractContent(url: string) {
  // Validar URL
  const validation = await UrlValidator.validate(url);
  if (!validation.valid) {
    throw new Error(`URL validation failed: ${validation.error}`);
  }

  // Fetch seguro
  const result = await UrlValidator.safeFetch(url, {
    timeout: 10_000,
    maxSize: 5 * 1024 * 1024, // 5MB
    maxRedirects: 5,
  });

  if (!result.ok) {
    throw new Error(`Fetch failed: ${result.error}`);
  }

  const dom = new JSDOM(result.text!);
  // ... resto da lógica
}
```

---

## 5. Tratamento de Erros

| Erro | Causa | Ação |
|------|-------|------|
| **URL inválida** | Formato incorreto | Retornar erro 400 |
| **Protocolo inseguro** | file://, gopher://, etc. | Retornar erro 400 |
| **IP privado** | localhost, 192.168.x.x | Retornar erro 403 |
| **Cloud metadata** | 169.254.169.254 | Retornar erro 403 |
| **DNS falhou** | Hostname inexistente | Retornar erro 404 |
| **Timeout** | Servidor lento | Retornar erro 504 |
| **Tamanho excedido** | Resposta > 5MB | Retornar erro 413 |
| **Redirect loop** | Mais de 5 redirects | Retornar erro 408 |

---

## 6. Edge Cases

| Caso | Comportamento Esperado |
|------|----------------------|
| **URL com porta** | Permitido (ex: http://example.com:8080) |
| **URL com path** | Permitido (ex: http://example.com/page) |
| **URL com query** | Permitido (ex: http://example.com/page?q=1) |
| **IP em hexadecimal** | Validar após normalização |
| **IPv6 link-local** | Bloquear |
| **DNS rebinding** | Validar IP após resolução |
| **Timeout curto** | Configurável por operação |

---

## 7. Critérios de Aceite

- [ ] `UrlValidator.validate()` bloqueia IPs privados
- [ ] `UrlValidator.validate()` bloqueia localhost
- [ ] `UrlValidator.validate()` bloqueia cloud metadata
- [ ] `UrlValidator.validate()` bloqueia protocolos inseguros
- [ ] `UrlValidator.safeFetch()` tem timeout configurável
- [ ] `UrlValidator.safeFetch()` limita tamanho da resposta
- [ ] `UrlValidator.safeFetch()` controla redirects
- [ ] `ExtractContentService` usa `UrlValidator.safeFetch()`
- [ ] Tentativas bloqueadas são logadas
- [ ] Teste unitário: URL com IP privado é bloqueada
- [ ] Teste unitário: URL com localhost é bloqueada
- [ ] Teste unitário: URL válida é permitida

---

## 8. Checklist de Implementação

### Backend
- [ ] Criar `url-validator.ts`
- [ ] Modificar `extract.content.service.ts` para usar validator
- [ ] Adicionar logging de tentativas bloqueadas

### Testes
- [ ] Unit: validate com localhost
- [ ] Unit: validate com IP privado (192.168.x.x)
- [ ] Unit: validate com cloud metadata (169.254.169.254)
- [ ] Unit: validate com URL válida
- [ ] Unit: safeFetch com timeout
- [ ] Unit: safeFetch com redirect
- [ ] Integration: extractContent com URL bloqueada

---

## 9. Decisões de Projeto

| Decisão | Opção Escolhida | Justificativa |
|---------|----------------|---------------|
| **Validação** | IP + DNS + protocolo | Múltiplas camadas |
| **DNS** | Resolução real | Detecta DNS rebinding |
| **Timeout** | 10 segundos padrão | Equilíbrio entre velocidade e confiabilidade |
| **Tamanho** | 5MB padrão | Cobre a maioria dos sites |
| **Redirects** | Máximo 5 | Previne loops infinitos |
| **Logging** | Warn para bloqueios | Auditoria sem spam |

---

## 10. Próximas Subfases Dependentes

- **Fase 1.2**: Pipeline de extração por URL (usará validator)
- **Fase 1.3**: Brand DNA editor (usará validator)
- **Fase 2.1**: Onboarding (usará validator)
- **Fase 2.2**: Content Swipe (usará validator)
