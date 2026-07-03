# RELATÓRIO DE AUDITORIA DE SEGURANÇA — ContentFlow Backend

> Gerado em 02/07/2026. Auditoria completa do backend NestJS.

---

## 🔴 CRÍTICO — Corrigir Imediatamente

### 1. IDOR (Insecure Direct Object Reference) — Múltiplos Endpoints

Endpoints que buscam recursos por ID sem verificar se pertencem à organização do requester:

| Endpoint | Risco |
|----------|-------|
| `GET /content-ideas/:id` | Qualquer usuário autenticado lê qualquer ideia |
| `GET /carousel-projects/:id` | Qualquer usuário autenticado lê qualquer projeto |
| `GET /brands/:id` | Qualquer usuário autenticado lê qualquer brand |
| `GET /brands/:id/dna` | Expõe DNA snapshots cross-org |
| `GET /brands/:id/assets` | Expõe assets cross-org |
| `GET /generation-jobs/:id` | Expõe jobs cross-org |
| `PATCH /carousel-projects/:id` | Qualquer usuário modifica qualquer projeto |
| `PATCH /content-ideas/:id/approve` | Aprova/rejeita ideias de outras orgs |
| `GET /social-posts/from-idea/:ideaId` | **Sem auth** — vaza posts |
| `GET /social-posts/from-carousel/:carouselId` | **Sem auth** — vaza posts |

**Fix:** Adicionar `organizationId` em TODAS as queries de busca de recursos.

### 2. SSRF via Webhook URL

`enterprise.controller.ts:85` — endpoint `/enterprise/url` aceita JWT com `webhookUrl` que é armazenado em Redis e depois `fetch()`ed sem validação. Atacante pode redirecionar para `http://169.254.169.254` (metadata cloud).

**Fix:** Validar URL contra allowlist de domínios e bloquear IPs internos.

### 3. SSRF via Article Import

`GET /article-import/extract?url=` aceita qualquer URL sem proteção SSRF (diferente de `/public/stream` que tem).

**Fix:** Reutilizar a validação de SSRF do `/public/stream`.

### 4. Rate Limiting Bypassed para Usuários Autenticados

`ThrottlerBehindProxyGuard` retorna `true` (skip) para TODAS as requisições autenticadas:

```typescript
if (!(request as Record<string, any>).org) {
  return super.canActivate(context); // throttle anonymous
}
return true; // ALL authenticated traffic is unthrottled
```

**Fix:** Rate limiting por endpoint, especialmente AI generation e billing.

### 5. Timing-Vulnerable API Key Comparison

```typescript
// public.controller.ts:49
body.apiKey !== process.env.AGENT_API_KEY
```

**Fix:** Usar `crypto.timingSafeEqual`.

---

## 🟠 ALTO

### 6. Marketplace Endpoints sem Authorization

| Endpoint | Problema |
|----------|----------|
| `POST /template-marketplace/templates/:id/review` | Qualquer usuário aprova/rejeita templates |
| `GET /template-marketplace/abuse-detection` | Expõe dados de abuso |
| `POST /template-marketplace/templates/:id/suspend` | Qualquer usuário suspende templates |
| `POST /media/video/function` | Sem auth/org check |

### 7. Webhook Registration Fake

`POST /public/v1/webhooks` retorna stub hardcoded sem armazenar nada.

### 8. JWT Exposed in Headers (NOT_SECURED mode)

Auth tokens enviados como response headers — visível para extensões e proxies.

### 9. Cookie Expiry de 365 Dias

Industry standard: 7-30 dias com refresh tokens.

### 10. Raw Error Object para Client

`stripe.controller.ts:53` — `throw new HttpException(e, 500)` expõe stack traces.

---

## 🟡 MÉDIO

### 11. Missing Input Validation

- `POST /posts/` — `@Body() rawBody: any`
- `POST /billing/cancel` — `feedback` sem length limit
- `POST /enterprise/*` — Body typed as `any`
- `POST /ad-creatives/generate` — inline object type, sem DTO
- `POST /email-campaigns/generate` — mesmo problema
- `POST /video-scripts/generate` — mesmo problema

### 12. Silent Error Swallowing

- `POST /enterprise/url` — `catch (err) {}`
- `POST /enterprise/delete-channel` — `catch (err) { return { success: false } }`
- `POST /billing/finish-trial` — `catch (err) {}`
- `POST /integrations/social-connect` — `catch (err) {}` on webhook fetch

### 13. CORS Always Allows localhost

`http://localhost:6274` sempre presente, mesmo em produção.

### 14. Missing Timeout em External Calls

OAuth provider `fetch()` calls sem timeout.

### 15. Duplicate Guard Check

`PoliciesGuard` line 25-26: verificação `/auth` duplicada.

---

## ✅ O que está bem feito

- Prisma ORM (sem SQL injection)
- CASL permission system
- Idempotency middleware no public API
- SSRF protection em `/public/stream`
- Sentry monitoring
- Cookie httpOnly em secure mode
- Stripe webhook signature validation
- Brand ownership em AI endpoints
- ValidationPipe global

---

## Prioridades de Fix

1. IDOR — adicionar `organizationId` filtering
2. SSRF — validar URLs de webhook e article-import
3. Rate limiting — per-endpoint para AI/billing
4. API key — `crypto.timingSafeEqual`
5. Marketplace — authorization checks
6. DTOs — criar para todos os endpoints inline
7. `helmet` middleware
8. Testes de integração
9. Cookie expiry → 30 dias
10. Error logging via Sentry em vez de silent catches
