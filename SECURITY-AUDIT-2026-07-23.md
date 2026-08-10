# Auditoria de Segurança — ContentFlow

**Data:** 2026-07-23
**Escopo:** `apps/backend`, `apps/frontend`, `apps/orchestrator`, `libraries/*`, configuração de deploy
**Método:** revisão manual de código-fonte (autenticação, autorização, criptografia, entrada de dados, SSRF, XSS, webhooks, configuração de infra)
**Commit base:** `f925069` — branch `main`

---

## Sumário

| Severidade | Qtd | Corrigidos |
|---|---|---|
| Crítico | 6 | 3 (C-3, C-4, C-5) |
| Alto | 7 | 2 parciais (A-1, A-3) |
| Médio | 9 | 0 |
| Baixo | 5 | 0 |

### Estado das correções (aplicadas em 2026-07-23)

| Item | Estado |
|---|---|
| C-3 `/public/modify-subscription` | **Corrigido** — endpoint removido |
| C-4 `Math.random()` em segredos | **Corrigido no código** — `makeId` agora usa `randomBytes`; `state` 6→32 chars, `code_verifier` 10→48. **Pendente: rotacionar as API keys já emitidas**, que continuam fracas |
| C-5 webhook Cakto fail-open | **Corrigido** — rejeita sem segredo configurado; opt-out só via `ALLOW_UNSIGNED_WEBHOOKS=true`, com log de erro |
| A-1 IDOR | **Parcial** — `editorial-plans` e `generation-jobs` corrigidos (escopo de org + whitelist de campos no update). Restam: `brands` (assets), `brand-learning`, `template-marketplace/suspend`, `carousel-performance`, `content-ideas`, `video-scripts`, `email-campaigns`, `social-posts` |
| A-3 XSS | **Corrigido** — `sanitize-html.ts` usa DOMPurify de verdade; notificações passam a ser sanitizadas |
| C-1, C-2, C-6 | **Não corrigidos** — exigem rotação de segredos e mudanças no servidor (decisão do responsável) |

Verificação executada: 12 payloads de XSS bloqueados com conteúdo legítimo preservado; 10 cenários do webhook Cakto conferindo; `makeId` validado em comprimento, alfabeto, unicidade e uniformidade; `tsc` do backend caiu de 44 para 37 erros (todos os 7 removidos eram meus), zero erros novos no backend e no frontend.

O sistema herda a base do Postiz/Gitroom. Boa parte dos problemas críticos **não vem do upstream** — são de configuração de deploy (segredo em git, HTTP sem TLS) e de código novo (controllers de brands/editorial-plans/generation-jobs sem escopo de organização).

Há um ponto de falha único e dominante: **o `JWT_SECRET` de produção está commitado no repositório**. Como esse mesmo segredo também deriva a chave que criptografa os tokens OAuth das redes sociais e as API keys das organizações, o vazamento dele compromete praticamente todo o modelo de segurança de uma vez.

---

## CRÍTICO

### C-1. `JWT_SECRET` de produção commitado no Git

`ecosystem.config.js:12` e `:34` (arquivo rastreado pelo git, commit `2dee1ca`):

```
JWT_SECRET: '0accd0dc0cee31e2a891cb68f9efa87adea7614b81f638de44e5fa1e8fc7d708'
DATABASE_URL: 'postgresql://contentflow-user:contentflow-password@localhost:5432/contentflow-db-local'
```

Consequências, todas em cadeia:

- **Forja de sessão para qualquer usuário**, inclusive `isSuperAdmin: true` — o middleware confia inteiramente no payload do JWT (`auth.middleware.ts:39-51`).
- **Descriptografia de todos os tokens OAuth das redes sociais** e de todas as API keys de organização — `AuthService.fixedEncryption` deriva a chave AES do `JWT_SECRET` (`libraries/helpers/src/auth/auth.service.ts:23,30`).
- **Forja de tokens de reset de senha, ativação e convite de organização** — todos assinados com o mesmo segredo.
- **Upgrade de plano gratuito** via `POST /public/modify-subscription` (ver C-3).

O segredo está no histórico do git — trocá-lo no servidor não basta; é preciso considerar o valor permanentemente queimado.

**Correção:**
1. Gerar novo `JWT_SECRET` (`openssl rand -hex 32`) e injetar por variável de ambiente/secret manager, nunca em arquivo versionado.
2. Remover `ecosystem.config.js` do rastreamento (`git rm --cached`) e adicionar ao `.gitignore`; manter um `ecosystem.config.example.js` sem valores.
3. Rotacionar a senha do Postgres.
4. **Revogar e reconectar todas as integrações sociais** — os refresh tokens armazenados devem ser considerados comprometidos.
5. Rotacionar todas as API keys de organização.
6. Limpar o histórico (`git filter-repo`) se o repositório for ou vier a ser público/compartilhado.

---

### C-2. Produção servida em HTTP puro, sem TLS

`ecosystem.config.js`:
```
MAIN_URL:     'http://216.238.121.214:4007'
FRONTEND_URL: 'http://216.238.121.214:4007'
```

Todo o tráfego — cookie `auth` com o JWT de sessão, senhas no login, conteúdo dos posts — trafega em texto claro. Além disso os cookies são emitidos com `secure: true` (`auth.controller.ts:76`), flag que o navegador **ignora/rejeita em HTTP**, o que significa que o comportamento real de sessão em produção hoje é indefinido.

**Correção:** colocar um reverse proxy com TLS (Caddy ou nginx + Let's Encrypt) na frente, apontar um domínio real para o servidor, redirecionar 80→443, habilitar HSTS e atualizar `FRONTEND_URL` / `MAIN_URL` / `NEXT_PUBLIC_BACKEND_URL` para `https://`.

---

### C-3. `POST /public/modify-subscription` — endpoint sem autenticação que concede qualquer plano

`apps/backend/src/api/routes/public.controller.ts:135-159`

```ts
@Post('/modify-subscription')
async modifySubscription(@Body('params') params: string) {
  const load = AuthService.verifyJWT(params) as { orgId, billing };
  ...
  await this._subscriptionService.modifySubscriptionByOrg(load.orgId, totalChannels, load.billing);
```

O `PublicController` não está na lista `authenticatedController` (`api.module.ts:103-141`) — não passa pelo `AuthMiddleware`. A única barreira é a assinatura JWT, com o segredo do C-1. Não há verificação de expiração própria, nonce ou idempotência: o mesmo token pode ser replayado por 30 dias.

**Correção:** remover o endpoint se não houver um sistema de billing externo o consumindo. Se houver, usar um segredo dedicado (não o `JWT_SECRET`), exigir claim `typ`, expiração curta (minutos) e nonce de uso único em Redis.

---

### C-4. API keys de organização e OAuth `state`/`code_verifier` gerados com `Math.random()`

`libraries/nestjs-libraries/src/services/make.is.ts`:
```ts
export const makeId = (length: number) => { ... Math.random() ... }
```

Usos:
- `organization.repository.ts:24,162,269` — `apiKey: AuthService.fixedEncryption(makeId(20))`
- Todos os providers sociais — `const state = makeId(6)` e `codeVerifier = makeId(10)` (bluesky, discord, facebook, instagram, linkedin, gmb, dev.to, dribbble, hashnode, farcaster, …)

`Math.random()` usa xorshift128+, não criptográfico: o estado interno do PRNG é recuperável a partir de algumas saídas observadas, permitindo prever valores seguintes. Além disso:

- **API key de 20 caracteres previsível** → acesso total à API pública da organização (`public.auth.middleware.ts:41-57`, que ainda atribui `role: 'SUPERADMIN'`).
- **`state` de 6 caracteres** é a chave Redis que guarda `organization:${state}` (`integrations.controller.ts:243`). Um `state` adivinhado permite sequestrar o fluxo de conexão social — vincular um canal do atacante à organização da vítima ou o inverso.
- **`code_verifier` PKCE de 10 caracteres** viola a RFC 7636, que exige 43–128 caracteres de alta entropia. Na prática o PKCE não oferece proteção nenhuma aqui.

**Correção:**
```ts
import { randomBytes } from 'crypto';
export const makeId = (length: number) =>
  randomBytes(length).toString('base64url').slice(0, length);
```
Elevar `state` para ≥32 caracteres e `code_verifier` para 43+. Rotacionar todas as API keys existentes.

---

### C-5. Webhook da Cakto abre em caso de configuração ausente (fail-open)

`libraries/nestjs-libraries/src/services/cakto.service.ts:287-294`

```ts
if (!expectedToken && !expectedSecret && !expectedHmacSecret) {
  return process.env.NODE_ENV !== 'production';
}
```

Se nenhuma das três variáveis estiver configurada — e no `.env` local nenhuma está — o webhook **aceita qualquer requisição** sempre que `NODE_ENV` não for exatamente `'production'`. Qualquer pessoa pode forjar `POST /stripe/cakto` e conceder assinaturas.

Falha por omissão: esquecer de definir `CAKTO_WEBHOOK_TOKEN` em um ambiente novo desativa silenciosamente a validação.

**Correção:** rejeitar sempre quando não houver segredo configurado. Se for necessário um modo de desenvolvimento, exigir uma flag explícita e ruidosa (`ALLOW_UNSIGNED_WEBHOOKS=true`) que emita `Logger.error` no boot.

---

### C-6. Chave SSH privada de produção dentro do diretório do repositório

`credentials/contentflow-vultr` (chave privada), `credentials/vultr-server.md`.

O diretório está no `.gitignore` — não vazou pelo git. Mas está no working tree, e o repositório contém dois tarballs de deploy de ~375 MB (`contentflow-billing.tar.gz`, `contentflow-deploy.tar.gz`) montados a partir dessa mesma árvore. Se algum deles incluir `credentials/`, a chave de acesso root ao servidor de produção está empacotada dentro.

**Correção:** verificar o conteúdo dos tarballs (`tar tzf contentflow-deploy.tar.gz | grep -i credential`); se estiver presente, rotacionar o par de chaves no Vultr. Mover `credentials/` para fora da árvore do projeto (`~/.ssh/`) e adicionar `credentials/` e `*.tar.gz` ao `.dockerignore`.

---

## ALTO

### A-1. IDOR multi-tenant: acesso e escrita cruzada entre organizações

Vários handlers recebem um ID de recurso mas nunca verificam a que organização ele pertence. Todos exigem apenas *estar autenticado*.

**Confirmado no nível do repositório:**

`generation-jobs.controller.ts:24-27`
```ts
@Get('/:id')
async getJob(@Param('id') id: string) {
  return this.generationJobService.getJob(id);   // getJob(id, orgId) — orgId fica undefined
}
```
→ `findFirst({ where: { id, organizationId: undefined } })`. O Prisma **descarta** filtros `undefined`, então a consulta vira "busque por id, qualquer organização". Leitura cruzada confirmada.

`generation-jobs.controller.ts:45-48` — `cancelJob(id)` sem escopo algum.

`editorial-plans.controller.ts` — `getPlan`, `updatePlan`, `deletePlan`, `getSlots`, `updateSlot`, `generateCalendar`, `runGeneration`, `toggleAutoGeneration`. O serviço (`editorial-plan.service.ts:20-50`) recebe só o `id`. Leitura, escrita **e exclusão** de planos editoriais de qualquer organização.

`brands.controller.ts:111,150,158` — `createAsset`, `approveAsset`, `deleteAsset` sem `@GetOrgFromRequest`.

`brand-learning.controller.ts` — `getLearnings`, `getLearning`, `approveLearning`, `rejectLearning`, `applyLearning` (`brand-learning.service.ts:9-40`, só `id`).

`template-marketplace.controller.ts:101` — `suspendTemplate` sem verificação de admin: qualquer usuário autenticado derruba qualquer template do marketplace. `GET /abuse-detection` (linha 96) também está exposto sem restrição.

**Provável, mesma assinatura (confirmar no serviço):** `carousel-performance` (`/brand/:brandId`, `/project/:projectId`, `/trend/:brandId`), `carousel-projects/brand/:brandId`, `content-ideas/brand/:brandId`, `email-campaigns/brand/:brandId`, `video-scripts/brand/:brandId`, `social-posts/from-idea/:ideaId` e `/from-carousel/:carouselId`, `ad-creatives/templates/:id`, `ai-generate/templates/:id`.

Note que o `PoliciesGuard` **não** cobre isso — ele valida limites de plano/assinatura, não pertencimento de recurso (`permissions.guard.ts:39-41`: sem `@CheckPolicies` ele libera).

**Correção:** propagar `orgId` até a cláusula `where` de toda consulta por ID. O padrão correto já existe no código — `brandProfileService.validateBrandOwnership(org.id, id)` é usado em `generation-jobs.controller.ts:36`. Recomendo além disso tornar `orgId` obrigatório na assinatura dos repositórios (sem default) para que o TypeScript pegue as omissões, e adicionar um teste de integração "usuário A não enxerga recurso de B" por controller.

---

### A-2. Sessões JWT sem revogação — troca de senha não desloga ninguém

`libraries/helpers/src/auth/auth.service.ts:42-47` — JWT stateless de 30 dias, sem `jti`, sem versão de sessão, sem lista de revogação. O cookie é emitido com validade de **1 ano** (`auth.controller.ts:81`), inconsistente com a expiração do token.

Efeitos:
- Após um comprometimento de conta, **trocar a senha não expulsa o atacante** — o token dele continua válido por até 30 dias. Isso anula boa parte do valor do fluxo de reset.
- `user.activated` e `user.isSuperAdmin` são lidos do payload do token (`auth.middleware.ts:46,51`). Desativar um usuário ou remover privilégio de superadmin no banco **não tem efeito** até o token expirar.
- Remover um usuário da organização é parcialmente mitigado (o middleware relê as orgs no banco, linha 79-81), mas os demais atributos não são.

**Correção:** adicionar `sessionVersion: Int @default(0)` ao model `User`; incluir no payload; comparar no middleware contra o valor do banco (com cache curto no Redis para não pagar uma query por request); incrementar em troca de senha, logout global, desativação e mudança de privilégio. Reler `activated` e `isSuperAdmin` do banco em vez do token. Reduzir a expiração do JWT para 24h e alinhar a validade do cookie.

---

### A-3. XSS armazenado em notificações + sanitizador de front sempre no fallback quebrado

**(a)** `apps/frontend/src/components/notifications/notification.component.tsx:41-45`
```tsx
<div dangerouslySetInnerHTML={{ __html: replaceLinks(notification.content) }} />
```
`replaceLinks` (linha 11) apenas transforma URLs em `<a>`. **Nenhuma sanitização.** O conteúdo da notificação é interpolado a partir de dados de integração e de fluxos de workflow (`integration.service.ts:193-196`, `post.activity.ts:242`). Qualquer caminho em que um nome de canal, mensagem de erro de provider ou entrada de usuário chegue ao texto vira XSS armazenado que dispara na sessão da vítima — e o cookie `auth` é `httpOnly`, mas o XSS pode simplesmente chamar a API autenticada em nome dela.

**(b)** `apps/frontend/src/components/layout/sanitize-html.ts:47`
```ts
const DOMPurify = (window as Record<string, unknown>).__DOMPurify;
```
`window.__DOMPurify` **nunca é atribuído em lugar nenhum do código**. O ramo do DOMPurify é morto; no navegador a função sempre cai no `regexSanitize`, que é trivialmente contornável:

- `<svg/onload=alert(1)>` — o regex de handlers exige `\s+` antes de `on`, e `/` não é whitespace.
- `<a href=javascript:alert(1)>` — só `href="javascript:…"` **com aspas** é removido.
- `ALLOWED_TAGS`/`ALLOWED_ATTRS` não são aplicados no fallback: `<iframe>`, `<object>`, `<form>` passam inteiros.

Essa função é usada em ~10 componentes de preview.

O irônico é que o sanitizador correto **já está instalado e em uso** em `libraries/helpers/src/utils/sanitize.post.content.ts` (`isomorphic-dompurify`, com `ALLOWED_URI_REGEXP`), aplicado corretamente na página pública `/p/[id]`.

**Correção:**
```ts
import DOMPurify from 'isomorphic-dompurify';
export const sanitizeHtml = (dirty: string) =>
  !dirty ? '' : DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTRS],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|\/|#)/i,
  });
```
Deletar `regexSanitize` inteiro. Aplicar `sanitizeHtml` em `replaceLinks` (sanitizar **antes** de injetar as tags `<a>`).

---

### A-4. Criptografia dos tokens sociais: IV fixo, sem autenticação, chave derivada do JWT_SECRET

`libraries/helpers/src/auth/auth.service.ts:9-34`

```ts
const { key, iv } = EVP_BytesToKey(pass, null, keyLength * 8, ivLength, 'md5');
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
```

Quatro problemas:
1. **IV determinístico e global.** Todo texto claro idêntico gera o mesmo ciphertext. Um observador do banco consegue identificar tokens repetidos e, em campos de baixa entropia, montar dicionário.
2. **Sem autenticação (nenhum MAC).** AES-CBC maleável — expõe a padding-oracle se qualquer caminho de código diferenciar erro de padding de erro de parsing.
3. **KDF obsoleto:** `EVP_BytesToKey` com MD5, sem salt, 1 iteração.
4. **Reuso de chave entre finalidades:** a mesma chave assina sessões e criptografa segredos armazenados. Um vazamento (C-1) compromete os dois domínios simultaneamente.

**Correção:** migrar para AES-256-GCM com IV aleatório de 12 bytes por operação e tag de autenticação, armazenando `iv:tag:ciphertext`. Chave separada (`ENCRYPTION_KEY`, 32 bytes aleatórios), independente do `JWT_SECRET`. Manter `decrypt_legacy_using_IV` apenas para leitura durante uma migração one-shot dos registros existentes. Atenção: as API keys são armazenadas criptografadas e **consultadas pelo valor criptografado** (`getOrgByApiKey`) — o determinismo é usado como índice, então essa migração precisa trocar o esquema para hash (SHA-256 da chave) no lookup.

---

### A-5. Bypasses de SSRF no `UrlValidator`

`libraries/nestjs-libraries/src/security/url-validator.ts`

O validador é bem-intencionado mas tem quatro furos:

**(a) Fail-open no DNS** (linha 128-131):
```ts
} catch (dnsError) {
  logger.warn(...);
  // Permitir continuar — hostname pode ser válido mas DNS temporariamente indisponível
}
```
Se `dns.resolve4` falhar, a URL é **aprovada**. Basta um hostname sem registro A.

**(b) Só resolve IPv4.** `dns.resolve4` ignora registros AAAA. Um host com apenas AAAA apontando para `::1` ou `fd00::/8` passa em (a) por erro de resolve4 e depois é resolvido normalmente pelo `fetch`.

**(c) DNS rebinding não é prevenido**, apesar do comentário na linha 5. O `fetch` recebe a **URL original** e resolve o hostname de novo — janela TOCTOU clássica.

**(d) Formatos alternativos de IP.** `http://2130706432/` ou `http://127.1/`: `net.isIP()` retorna 0, `dns.resolve4` falha → cai no fail-open (a) → o `getaddrinfo` do Node resolve para 127.0.0.1.

Faltam também as faixas 100.64.0.0/10 (CGNAT) e 198.18.0.0/15.

Usado em `enterprise.controller.ts:90` (webhook URL) e `extract.content.service.ts:22`.

**Correção:** o padrão certo já existe no próprio repositório — `ssrfSafeDispatcher` + `isSafePublicHttpsUrl` (`libraries/nestjs-libraries/src/dtos/webhooks/`), usados em `public.controller.ts:200` e `local.storage.ts:28`, que validam **no socket** e portanto imunizam contra rebinding. Migrar `UrlValidator.safeFetch` para o mesmo dispatcher e trocar o fail-open por fail-closed.

---

### A-6. Rate limiting ausente na quase totalidade da superfície autenticada

`libraries/nestjs-libraries/src/throttler/throttler.provider.ts:37`
```ts
// Other authenticated traffic: skip throttling
return true;
```

Só `/public/v1/posts` (POST), `/ai-generate`, `/billing`, `/social-posts/generate`, `/email-campaigns/generate`, `/ad-creatives/generate`, `/video-scripts` e tráfego anônimo são limitados. Todo o resto — uploads, geração de carrossel, criação de posts, chamadas de integração — é ilimitado por organização.

Agravante: **`trust proxy` não está configurado** em `main.ts`. Por trás do reverse proxy, `req.ips` fica vazio e `req.ip` é o IP do proxy, então **todo o tráfego anônimo compartilha um único bucket** de 30 req/h (`getTracker`, linha 47-52). Um único visitante consegue trancar login e registro para o mundo inteiro. E `@RealIP()` (usado no registro/login para logging) confia em `X-Forwarded-For` sem `trust proxy` validado — spoofável.

**Correção:** configurar `app.set('trust proxy', 1)` com o número de proxies correto. Inverter a política do throttler para *deny by default*: limitar tudo, com limites por organização mais generosos em rotas de leitura. Adicionar limite específico e agressivo em `/auth/login`, `/auth/register`, `/auth/forgot` e `/auth/resend-activation`, com chave por e-mail além de por IP.

---

### A-7. Token de ativação de conta é um token de sessão válido, enviado por e-mail dentro da URL

`apps/backend/src/services/auth/auth.service.ts:75-80`
```ts
const obj = { addedOrg, jwt: await this.jwt(create.users[0].user) };
await this._emailService.sendEmail(..., `${process.env.FRONTEND_URL}/auth/activate/${obj.jwt}`, ...);
```

O link enviado por e-mail carrega um JWT de sessão completo, válido por 30 dias, em um **path de URL**. Vaza em logs de servidor, logs de proxy, header `Referer` para terceiros, histórico de navegador e no próprio e-mail em texto claro.

Combinado com A-2 (sem revogação): qualquer um com acesso ao e-mail obtém sessão persistente por 30 dias, mesmo depois de o usuário trocar a senha.

**Correção:** usar um token opaco de uso único (`randomBytes(32)`), armazenado com hash no banco, com TTL de 24h, consumido na ativação. Emitir o cookie de sessão só *depois* da ativação.

---

## MÉDIO

### M-1. Sem separação de tipos de token
`verifyJWT` é chamado sem discriminar finalidade em: sessão (`auth.middleware.ts:39`), reset de senha (`auth.service.ts:236`), ativação (`:248`), convite de org (`:121`), e modificação de assinatura (`public.controller.ts:137`). Todos assinados com o mesmo segredo, sem claim `typ` ou `aud`. Hoje as diferenças de payload evitam confusão acidental, mas isso é frágil — qualquer refactor que adicione um campo pode abrir troca de contexto.
**Correção:** claim `typ` obrigatório em cada emissão e validado em cada verificação.

### M-2. Token de reset de senha reutilizável
`auth.service.ts:235-245` — o token não é invalidado após o uso. Vale por 20 minutos e serve para redefinir a senha quantas vezes quiser nesse intervalo. Também não invalida sessões existentes (A-2).
**Correção:** consumo único (nonce em Redis ou coluna `passwordResetTokenHash` limpa após uso) + incremento de `sessionVersion`.

### M-3. `ValidationPipe` sem `whitelist` — mass assignment
`main.ts:54-58`
```ts
new ValidationPipe({ transform: true })
```
Sem `whitelist: true` e `forbidNonWhitelisted: true`, propriedades não declaradas no DTO sobrevivem no `body`. Perigoso onde o body chega a um `create`/`update` do Prisma (ex.: `editorial-plans.controller.ts` → `updatePlan(id, data: Record<string, unknown>)`, que repassa o objeto inteiro ao `repository.update`).
**Correção:** `new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })` e substituir `Record<string, unknown>` por DTOs tipados nos serviços.

### M-4. `PoliciesGuard` faz bypass por substring de path
`permissions.guard.ts:24-31`
```ts
if (request.path.indexOf('/auth') > -1 || ...) return true;
```
Match por substring em vez de prefixo. Qualquer rota futura cujo path contenha `/auth` em qualquer posição — inclusive dentro de um parâmetro com barra — desativa silenciosamente a checagem de plano. A condição `/auth` ainda aparece duplicada (linhas 25 e 26), sinal de que a lista não foi revisada.
**Correção:** `PUBLIC_PREFIXES.some(p => request.path === p || request.path.startsWith(p + '/'))`.

### M-5. CSRF: `sameSite: 'none'` em todos os cookies de autenticação
`auth.controller.ts:78`, `users.controller.ts:127`, `public.controller.ts:110,127`. O cookie `auth` acompanha requisições cross-site. A proteção efetiva hoje é só o CORS (`main.ts:44-48`) somado ao preflight exigido por `Content-Type: application/json`. É uma defesa de segunda ordem: qualquer endpoint que venha a aceitar `application/x-www-form-urlencoded` ou `text/plain` fica exposto imediatamente. Piora com `impersonate` também sendo cookie `sameSite: 'none'` (`users.controller.ts:122`).
**Correção:** `sameSite: 'lax'` se front e back compartilham site; caso contrário manter `none` mas adicionar token CSRF double-submit nas rotas mutantes, ou exigir um header customizado (`X-Requested-With`) validado no middleware.

### M-6. Enumeração de usuários
- `POST /auth/register` → `'Email already exists'` (`auth.service.ts:52`)
- `POST /auth/resend-activation` → `'User not found'` / `'Account is already activated'` (`:271-277`)

`/auth/forgot` já está correto (resposta genérica) — os outros dois não seguiram o padrão.
**Correção:** resposta genérica idêntica nos dois casos; comunicar o conflito por e-mail.

### M-7. Sem cabeçalhos de segurança HTTP
Nenhum `helmet`, CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` ou HSTS no backend (`main.ts`) nem no `next.config.js`. Sem CSP, o impacto de A-3 é máximo — nada limita a exfiltração. Sem `X-Frame-Options`/`frame-ancestors`, clickjacking no painel.
**Correção:** `app.use(helmet())` no backend com CSP explícita; bloco `headers()` no `next.config.js` para o frontend; `Referrer-Policy: strict-origin-when-cross-origin` (também reduz o vazamento de A-7).

### M-8. `POST /public/crypto/:path` sem autenticação
`public.controller.ts:161-164` — repassa `path` e o body cru direto para `Nowpayments.processPayment`. Endpoint de callback de pagamento sem middleware de auth; a validação depende inteiramente da implementação do `Nowpayments`. Merece verificação de assinatura HMAC no mesmo padrão do Stripe (`stripe.controller.ts:22-27`, que está correto).

### M-9. Artefatos de trabalho e tarballs de deploy na árvore do repositório
`contentflow-deploy.tar.gz` (383 MB) e `contentflow-billing.tar.gz` (375 MB) no diretório raiz, mais ~25 arquivos `_run*.cjs` / `_script*.b64` / `tmp-*.py` / `LP Qwen.html` não rastreados. Os tarballs foram montados a partir de uma árvore que contém `.env` e `credentials/` (ver C-6). Superfície de vazamento acidental e ruído que dificulta revisão.
**Correção:** mover para fora do repositório; adicionar `*.tar.gz`, `_*.cjs`, `_*.b64`, `tmp-*` ao `.gitignore` e ao `.dockerignore`.

---

## BAIXO

### B-1. `verifyJWT` sem restrição explícita de algoritmo
`auth.service.ts:46` — `verify(token, secret)` sem `{ algorithms: ['HS256'] }`. Versões atuais do `jsonwebtoken` já rejeitam `alg: none`, então não é explorável hoje; é defesa em profundidade contra downgrade de dependência.

### B-2. Cookie `track` com `sameSite: 'none'` fora do bloco condicional
`public.controller.ts:67` — `sameSite: 'none'` fica fora do spread de `NOT_SECURED`, ao contrário de `secure` e `httpOnly`. Em modo `NOT_SECURED`, resulta em `SameSite=None` sem `Secure`, combinação que navegadores modernos rejeitam. Bug de consistência.

### B-3. `PublicAuthMiddleware` concede `SUPERADMIN` a toda API key
`public.auth.middleware.ts:39,57` — `req.org = { ...org, users: [{ users: { role: 'SUPERADMIN' } }] }`. Além do privilégio máximo indiscriminado, a forma do objeto (`users[0].users.role`) não bate com o que o `PoliciesGuard` lê (`org.users[0].role`, `permissions.guard.ts:50`), então o papel efetivo vira `undefined` nesse caminho. Vale alinhar as duas representações e conceder o papel real da chave.

### B-4. `MonitorController` sem autenticação
`monitor.controller.ts` — `GET /monitor/queue/:name` responde sempre `"Queue X is healthy"` com o nome refletido. Hoje é um stub inofensivo (o valor não é interpretado nem renderizado como HTML), mas é um endpoint público que reflete entrada — vale autenticar antes que ganhe lógica real.

### B-5. Auditoria de dependências não executada
`pnpm audit` esgotou a heap do Node (>4 GB) neste ambiente e não completou. Não foi possível avaliar CVEs de terceiros — uma lacuna real desta auditoria.
**Correção:** rodar em CI com heap ampliada:
```bash
NODE_OPTIONS=--max-old-space-size=8192 pnpm audit --audit-level high
```
Considerar habilitar Dependabot ou Renovate — o `sonar-project.properties` sugere que já existe intenção de análise estática no pipeline.

---

## Ordem de correção sugerida

**Imediato (horas)**
1. C-1 — rotacionar `JWT_SECRET`, tirar `ecosystem.config.js` do git, rotacionar senha do Postgres e API keys, reconectar integrações sociais.
2. C-3 — remover ou blindar `/public/modify-subscription`.
3. C-5 — fail-closed no webhook da Cakto.
4. C-6 — verificar os tarballs; rotacionar a chave SSH se estiver dentro.

**Esta semana**
5. C-2 — TLS + domínio real.
6. A-1 — escopo de organização nos controllers listados (comece por editorial-plans e generation-jobs, que permitem escrita e exclusão).
7. C-4 — `makeId` com `randomBytes`; rotacionar API keys.
8. A-3 — usar `isomorphic-dompurify` no `sanitize-html.ts` e sanitizar as notificações.

**Este mês**
9. A-2 — `sessionVersion` e revogação de sessão.
10. A-4 — AES-GCM com chave dedicada + migração das API keys para lookup por hash.
11. A-5 — migrar `UrlValidator` para o `ssrfSafeDispatcher`.
12. A-6 — `trust proxy` + throttling deny-by-default.
13. A-7 — token de ativação opaco de uso único.
14. M-3, M-4, M-5, M-6, M-7.

---

## O que está bem feito

Vale registrar, porque não é pouco:

- Validação da assinatura do webhook Stripe está correta (`stripe.controller.ts:22-27`, usando `rawBody`).
- `POST /public/agent` usa `timingSafeEqual` com verificação prévia de comprimento (`public.controller.ts:50-56`).
- `sanitizePostContent` usa DOMPurify corretamente, inclusive com `ALLOWED_URI_REGEXP` — e é o que protege a página pública `/p/[id]`.
- Upload valida o tipo por **magic bytes** (`file-type`), não pela extensão nem pelo `Content-Type` do cliente, e reescreve o nome do arquivo (`custom.upload.validation.ts:35-52`). Defesa correta.
- `GET /public/stream` refaz a validação SSRF a cada hop de redirect, com `redirect: 'manual'` e `ssrfSafeDispatcher` no socket — a abordagem certa, com referência ao GHSA no comentário.
- Nenhum SQL dinâmico: os 7 usos de `$queryRaw` são todos template tags parametrizados. Zero ocorrências de `$queryRawUnsafe`.
- Senhas com bcrypt cost 10 (`auth.service.ts:37`).
- Zero ocorrências de `eval`, `new Function` ou atribuição direta a `.innerHTML` no frontend.
- `AuthMiddleware` relê as organizações do banco e filtra membros desabilitados em vez de confiar no token para isso (`auth.middleware.ts:79-81`).
