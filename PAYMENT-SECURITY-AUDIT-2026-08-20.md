# Auditoria de Segurança — Pagamentos, Assinaturas e Billing

**Data:** 2026-08-20
**Escopo:** checkout, assinaturas, planos, créditos, webhooks (Stripe, Cakto, NOWPayments),
cupons/descontos, refund/chargeback, autorização de endpoints de billing, race conditions.
**Metodologia:** leitura de código real + rastreamento de fluxo completo (checkout → gateway →
webhook → banco → liberação de benefício), sem alterações no projeto, sem pagamentos reais.
**Pergunta central respondida:** **sim** — um usuário malicioso consegue fazer o sistema
acreditar que pagou e obter uma assinatura paga completa sem pagar nada. Ver Vulnerabilidade
Crítica #1.

---

## 1. Payment Security Assessment (resumo executivo)

O projeto tem **duas arquiteturas de billing coexistindo**: um sistema legado
(`Subscription`, sem campo `status` real — só `subscriptionTier`/`cancelAt`/`deletedAt`) e um
sistema v2 bem projetado (`BillingSubscription`/`CreditAccount`/`CreditLot`/`CreditReservation`,
com máquina de estados real e um motor de créditos com transações `Serializable` do Postgres).
A engenharia da v2 — idempotência de webhook por `eventId` único, idempotência de concessão de
crédito por chave própria, reserva-antes-de-gastar com `Serializable` + retry, escopo por
organização derivado sempre do servidor — é sólida e não apresentou nenhuma race condition
explorável.

O problema real não está na criptografia nem nas transações: está na **integração com o
gateway de pagamento Cakto**, que é o provedor **atualmente configurado para produção**
(confirmado por `.env.example` e comentários no código: "quando `CAKTO_*_CHECKOUT_URL` está
configurado, novas assinaturas usam Cakto Pay"). Nesse caminho, `POST /billing/subscribe`
**grava a assinatura paga no banco imediatamente**, antes de o usuário sequer abrir a página de
checkout do Cakto — não é uma falha sutil de race condition, é a ordem das operações estar
invertida. Combinado com o fato de que o webhook legado do Stripe (usado como fallback) não
trata `charge.refunded`/`charge.dispute.created`, e que dois bugs de lógica de negócio
(`applyDiscount` sempre aprova, saldo de crédito de estorno não é revogado) permitem abuso
financeiro adicional, o resultado é uma superfície de billing com uma falha crítica e várias
altas.

**Nenhuma das vulnerabilidades abaixo foi explorada contra produção ou com dados reais** — toda
a análise é estática, seguindo o código e o schema até a conclusão lógica.

---

## 2. Billing Architecture

```
Registro → Organization (allowTrial=true, isTrailing=true) sempre criado com trial
              │
              ├─ Provedor ativo determinado por env: CAKTO_*_CHECKOUT_URL configurado?
              │     ├─ SIM → CaktoService.subscribe()   [ativação ANTES do pagamento — ver V-1]
              │     └─ NÃO → StripeService.subscribe()  [Checkout Session, ativação só via webhook]
              │
              ├─ Stripe V1 (legado, por canal) — grava em `Subscription` (sem status real)
              ├─ Stripe V2 (`BillingStripeService`) — grava em `BillingSubscription`/`CreditAccount`
              └─ Cakto — grava em `Subscription` (mesma tabela legada do V1)

Webhook (server-to-server) → verificação de assinatura → dedup por event-id →
   → grava status/tier → concede créditos (se aplicável)

Leitura de acesso: BillingEntitlementsService.resolveAccess()
   → usa `BillingSubscription` (v2) se existir, senão `Subscription` (legado), senão FREE
   → sempre leitura fresca do banco, nunca cache/JWT — ponto forte confirmado em todo o código
```

Gateways confirmados: **Stripe** (dois sistemas paralelos, V1 legado + V2 atual),
**Cakto** (link de checkout hospedado, provedor ativo em produção), **NOWPayments**
(cripto, restrito a superadmin via `V1SurfaceGuard`). Não existe Paddle/LemonSqueezy.
Não existe motor de cupom próprio — descontos são 100% nativos do Stripe (`allow_promotion_codes`
+ lookup de "auto apply" promotion code), com validação de elegibilidade feita pelo próprio
Stripe no momento do checkout — essa parte está correta.

---

## 3. Attack Surface

| Superfície | Autenticação | Observação |
|---|---|---|
| `POST /billing/subscribe`, `/change-plan`, `/cancel`, `/apply-discount`, `/check-discount`, `/billing/v2/checkout`, `/billing/v2/topups/checkout` | usuário autenticado, escopado por `@GetOrgFromRequest()` | ver V-1, V-3 |
| `POST /stripe` (webhook v1+v2), `POST /stripe/cakto`, `POST /public/crypto/:path` | assinatura HMAC do gateway | maioria fail-closed; ver V-4 |
| `GET /billing/lifetime`, `GET /billing/crypto` | `V1SurfaceGuard` (SUPERADMIN only) | inalcançável por usuário comum hoje |
| `/admin/billing/*` (planos, preços, créditos, assinaturas) | `AdminSessionGuard`+`AdminPermissionGuard`, MFA/dual-approval em ações críticas | bem desenhado; ver M-2 (mass assignment) |
| Studio/MCP tools que gastam crédito (`generateImageTool`, `generateVideoTool`, `creative-*`) | sessão de chat / API key MCP, org resolvida server-side | sem bypass de tenant encontrado |

---

## 4. Confirmed Vulnerabilities

### V-1 — CRÍTICO — Assinatura paga é ativada antes de qualquer confirmação de pagamento (Cakto)

**Local:** [libraries/nestjs-libraries/src/services/cakto.service.ts:232-286](libraries/nestjs-libraries/src/services/cakto.service.ts) (`CaktoService.subscribe`), chamado por [apps/backend/src/api/routes/billing.controller.ts:218-236](apps/backend/src/api/routes/billing.controller.ts) (`POST /billing/subscribe`).

```ts
// billing.controller.ts
subscribe(@GetOrgFromRequest() org, @GetUserFromRequest() user, @Body() body: BillingSubscribeDto) {
  if (this._caktoService.isConfigured()) {
    return this._caktoService.subscribe(uniqueId, org, user, body);
  }
  ...
```
```ts
// cakto.service.ts — subscribe()
await this._subscriptionService.createOrUpdateSubscription(
  true, checkoutReference, customerId,
  pricing[billing].channel!, billing, body.period, null,
  undefined, organization.id
);
return { id, url: url.toString(), ... }; // url = link de checkout do Cakto
```

`billing` vem direto do body, restrito só a `@IsIn(['STANDARD','PRO','TEAM','ULTIMATE'])` — qualquer
usuário autenticado pode escolher `ULTIMATE`. A linha `createOrUpdateSubscription(...)` **grava a
assinatura paga completa na tabela `Subscription` no momento da criação do link de checkout**,
não no momento da confirmação de pagamento. O `url` retornado é só o link para a página de
checkout do Cakto — o usuário nunca precisa abri-lo. `resolveAccess()` lê essa linha diretamente
(nenhuma linha `BillingSubscription` v2 é criada no caminho Cakto) e libera o tier completo.

**Reprodução controlada (sem dados reais):**
1. Criar conta grátis normal.
2. `POST /billing/subscribe` com `{"billing":"ULTIMATE","period":"MONTHLY"}` e a sessão autenticada normal.
3. Ignorar a URL de checkout do Cakto retornada na resposta.
4. A organização já possui entitlements ULTIMATE completos (canais, créditos, features) — **$0 pago**.

**Por que não expira sozinho:** nada revoga essa assinatura a menos que chegue um webhook Cakto de
cancelamento para aquele `checkoutReference` específico — o que nunca acontece se o checkout nunca
foi aberto. Combinado com V-2 abaixo (status `ACTIVE` nunca reavaliado contra data de expiração),
o acesso é permanente.

**Contraste correto:** o equivalente Stripe legado (`StripeService.subscribe`) só retorna a
Checkout Session URL e não grava nada até o webhook confirmar — é o padrão correto que o
caminho Cakto deveria seguir.

**Causa raiz:** a gravação do estado "pago" foi colocada na etapa de *criação do link de
checkout* em vez de na etapa de *confirmação via webhook*.

**Correção recomendada:** `CaktoService.subscribe()` não deve chamar `createOrUpdateSubscription`
com o tier real. Deve criar/atualizar a assinatura em um estado `PENDING`/sem tier pago (ou não
gravar nada) e só promover para o tier pago dentro de `processWebhook()`, no evento de pagamento
aprovado — exatamente como a Stripe V2 já faz.

---

### V-2 — HIGH — `resolveAccess()` nunca reavalia `currentPeriodEnd` para status `ACTIVE`

**Local:** [libraries/nestjs-libraries/src/services/billing-entitlements.service.ts:40-66](libraries/nestjs-libraries/src/services/billing-entitlements.service.ts)

```js
const canUsePaidPlan = ['ACTIVE', 'TRIALING'].includes(status)
  || (subscription.cancelAtPeriodEnd && periodIsActive)
  || inPaymentGrace;
```
`periodIsActive` só é consultado no ramo `cancelAtPeriodEnd`. Se `status` ficar `ACTIVE` (por
V-1, por um webhook de renovação que nunca chegou, ou por qualquer outra divergência) mesmo
com `currentPeriodEnd` já vencido, o acesso pago é concedido para sempre — não existe cron/job
de reconciliação que expire isso (confirmado ausente: nenhum `@Cron`/BullMQ/Temporal relacionado
a billing existe no repositório).

**Correção recomendada:** o ramo `ACTIVE`/`TRIALING` também deve exigir `periodIsActive`
(ou equivalente), e deveria existir um job periódico que reconcilia `BillingSubscription`/
`Subscription` contra o estado real do gateway.

---

### V-3 — HIGH — `applyDiscount`: `await` faltando torna a checagem de elegibilidade um no-op

**Local:** [libraries/nestjs-libraries/src/services/stripe.service.ts:617-621](libraries/nestjs-libraries/src/services/stripe.service.ts)

```ts
async applyDiscount(customer: string) {
  const check = this.checkDiscount(customer);   // falta `await` — check é sempre uma Promise (truthy)
  if (!check) {
    return false;
  }
  // aplica STRIPE_DISCOUNT_ID no Stripe de qualquer forma
```
`checkDiscount` é `async`; sem `await`, `check` é sempre um objeto `Promise` truthy, então
`!check` nunca é `true` e o desconto é sempre aplicado, independente de elegibilidade real
(gasto histórico >$10, plano mensal, sem desconto já aplicado). O endpoint `POST
/billing/apply-discount` ([billing.controller.ts:177-180](apps/backend/src/api/routes/billing.controller.ts))
não tem nenhuma outra checagem — o token assinado emitido por `/billing/check-discount` nunca é
validado nesse endpoint.

**Exploração:** qualquer usuário autenticado com assinatura ativa/trial chama
`POST /billing/apply-discount` a qualquer momento, em qualquer plano (inclusive anual ou já
descontado) → cupom `STRIPE_DISCOUNT_ID` aplicado na assinatura Stripe real, reduzindo receita
recorrente indefinidamente.

**Correção recomendada:** `if (!(await check))`, e adicionalmente validar o token assinado do
`/billing/check-discount` no `/apply-discount` para reforçar a intenção original de fluxo.

---

### V-4 — HIGH — Webhook Stripe legado não trata `charge.refunded` nem `charge.dispute.created`

**Local:** [apps/backend/src/api/routes/stripe.controller.ts:46-57](apps/backend/src/api/routes/stripe.controller.ts)

```js
switch (event.type) {
  case 'invoice.payment_succeeded': ...
  case 'customer.subscription.created': ...
  case 'customer.subscription.updated': ...
  case 'customer.subscription.deleted': ...
  default:
    return { ok: true };
}
```
Qualquer evento `charge.refunded`/`charge.dispute.created` que seja roteado para o caminho
legado (isto é, não classificado como evento V2 por `isBillingV2Event`, que só reconhece
eventos de organizações que já têm uma linha `BillingSubscription`) cai no `default` e não
faz nada — nenhuma revogação, nenhum downgrade. Qualquer organização anterior à migração para
V2 (ou criada fora desse caminho) não tem NENHUM tratamento de reembolso/chargeback.

**Correção recomendada:** adicionar os casos `charge.refunded`/`charge.dispute.created` ao
switch legado, espelhando (ou delegando para) a lógica que já existe no lado V2.

---

### V-5 — HIGH — Reembolso de top-up (Stripe V2) não revoga os créditos já concedidos

**Local:** [libraries/nestjs-libraries/src/services/billing-stripe.service.ts:376-380](libraries/nestjs-libraries/src/services/billing-stripe.service.ts)

```ts
private async handleChargeRefunded(charge: Stripe.Charge) {
  const rawInvoice = (charge as any).invoice;
  const invoiceId = typeof rawInvoice === 'string' ? rawInvoice : undefined;
  if (invoiceId) await this.prisma.billingInvoice.updateMany({ where: { providerInvoiceId: invoiceId }, data: { status: 'REFUNDED' } });
}
```
Isso só marca `billingInvoice.status = 'REFUNDED'` — nunca chama `CreditAccountingService` para
revogar/expirar o lote de créditos concedido para aquele pagamento. Pior: checkouts de top-up são
sessões `mode: 'payment'` (`createTopupCheckout`), que por padrão **não geram um objeto Invoice**
no Stripe — `charge.invoice` normalmente é `null`/`undefined` para esse tipo de cobrança, então
`if (invoiceId)` nem entra, e **nada acontece, nem a atualização cosmética de status**.

**Exploração:** comprar um top-up (ex.: 10.000 créditos), solicitar reembolso/chargeback pelo
banco/emissor do cartão logo em seguida → Stripe dispara `charge.refunded` → handler não faz
nada → org fica com os 10.000 créditos permanentemente. Repetível por compra.

**Correção recomendada:** resolver a fatura/pagamento por `payment_intent`/`charge.id` (não só
por `invoice`), e chamar `CreditAccountingService` para revogar/zerar o lote de créditos
correspondente a esse pagamento.

---

## 5. Potential Vulnerabilities

| # | Achado | Severidade | Local |
|---|---|---|---|
| P-1 | `charge.dispute.created` só bloqueia gasto de crédito (`creditAccount.status='CHARGEBACK'`), nunca muda `billingSubscription.status`, que é o campo que `resolveAccess()` usa para features/capacidade de plano (white-label, API pública, seats extras) — disputa deixa esses benefícios ativos até intervenção manual | MEDIUM | [billing-stripe.service.ts:382-390](libraries/nestjs-libraries/src/services/billing-stripe.service.ts) |
| P-2 | Downgrade de plano (`changePlan`) grava `pendingPlanCode` mas nunca chama `stripe.subscriptions.update` — cliente é cobrado pelo preço antigo (mais caro) na próxima renovação mas recebe o plano novo (mais barato) quando `handleInvoicePaid` aplica o `pendingPlanCode`. Prejudica o negócio, não o usuário, mas é bug real de billing | MEDIUM | [billing-stripe.service.ts:136-148](libraries/nestjs-libraries/src/services/billing-stripe.service.ts) |
| P-3 | `handleInvoicePaid` grava status da assinatura e concede créditos em duas chamadas não-atômicas (sem `$transaction`) — um crash no meio deixa estado inconsistente até o retry do Stripe (auto-curativo na prática, mas não garantido) | MEDIUM | [billing-stripe.service.ts:292-346](libraries/nestjs-libraries/src/services/billing-stripe.service.ts) |
| P-4 | `UsedCodes.code` não tem `@unique`, e o fluxo `getCode → grant → insert UsedCodes` do resgate de código lifetime não é atômico (TOCTOU) — duas requisições concorrentes com o mesmo código concedem duas assinaturas lifetime grátis. **Hoje inalcançável**: `POST /billing/lifetime` exige `V1SurfaceGuard` (SUPERADMIN). Além disso a "validação" do código é um oráculo de padding CBC (`fixedDecryption`, cifra legada não autenticada) que aceita qualquer string que descriptografe sem erro de padding, não verifica se o código foi realmente emitido | LOW hoje / CRITICAL se o guard for removido | [stripe.service.ts:965-1008](libraries/nestjs-libraries/src/services/stripe.service.ts), [subscription.repository.ts:198-205](libraries/nestjs-libraries/src/database/prisma/subscriptions/subscription.repository.ts) |
| P-5 | `configuration.checker.ts` só valida `STRIPE_SIGNING_KEY` quando **nenhum** provedor está configurado, não sempre que Stripe é o provedor ativo — deploy com `STRIPE_SECRET_KEY` setado e `STRIPE_SIGNING_KEY` esquecido não falha no boot; consequência exata (aceitar webhook forjado) não confirmada, depende do comportamento do SDK Stripe para segredo vazio | LOW/INFO | [configuration.checker.ts:56-68](libraries/helpers/src/configuration/configuration.checker.ts) |
| P-6 | `Organization.paymentId` sem `@unique` no schema — defesa em profundidade ausente; não há caminho concreto de colisão hoje (IDs do Stripe/Cakto são gerados de forma única por construção) | LOW/INFO | schema.prisma |
| P-7 | `CreditAccountingService.reserve()`/`.grant()` procuram reserva/transação existente só pela `idempotencyKey` global, sem checar `organizationId` da linha retornada — hoje seguro porque todo call site já prefixa a chave com o org, mas é uma convenção, não uma checagem explícita; um futuro call site que esqueça o prefixo devolveria dados de outro tenant | LOW/MEDIUM (latente, não explorável hoje) | [credit-accounting.service.ts:131,237](libraries/nestjs-libraries/src/services/credit-accounting.service.ts) |
| P-8 | Nenhum job de reconciliação periódica contra o estado real do gateway — sistema é 100% orientado a webhook; uma falha de entrega permanente (fora da janela de retry do Stripe) nunca é detectada/corrigida automaticamente | INFO | arquitetura geral |

---

## 6. Subscription Abuse

- **Trial infinito/reutilizável (CONFIRMADO, por padrão de arquitetura):**
  `OrganizationRepository.createOrgAndUser` marca `allowTrial: true, isTrailing: true` em toda
  conta nova, sem nenhuma dedução por identidade real. `DISALLOW_PLUS` (que bloquearia
  `usuario+1@gmail.com`) **não está setado** em `.env.example` nem nos docker-compose —
  endereços com plus-addressing são aceitos por padrão. Não existe fingerprint de dispositivo,
  telefone ou cartão vinculado ao trial; o único cartão-check existente (`checkValidCard`,
  autoriza e cancela R$1) verifica só que o cartão *funciona*, não se já foi usado em outro
  trial. Severidade isolada seria HIGH, mas na prática é ofuscada por V-1 (que nem precisa do
  trial — dá acesso pago permanente direto).
- Downgrade/cancelamento no sistema legado (`SubscriptionService.modifySubscription`) **reduz
  ativamente** integrações/usuários em excesso no momento da mudança — não é só checagem em
  tempo de uso, é um passo explícito de remoção de acesso. Correto.
- Downgrade no sistema v2 é só verificado em tempo de uso (via `resolveAccess`), o que é
  suficiente **exceto** pelo gap de V-2.

---

## 7. Payment Bypass

Resposta direta às perguntas centrais da auditoria:

> Um usuário malicioso consegue fazer o sistema acreditar que ele pagou, que possui uma
> assinatura válida ou que possui um plano superior quando isso não é verdade?

**Sim — V-1.** Ativação completa de plano pago via `POST /billing/subscribe` no caminho Cakto,
sem qualquer confirmação de pagamento.

> Um usuário que possuía acesso legítimo consegue continuar utilizando recursos pagos depois
> que sua assinatura deveria ter sido encerrada?

**Sim — V-2, V-4, V-5, P-1.** Combinação de: status `ACTIVE` nunca expira sozinho; webhook
legado ignora refund/dispute; refund de top-up não revoga créditos; dispute não revoga
features de plano (só bloqueia gasto de crédito).

> É possível consumir mais valor do sistema do que aquilo que foi efetivamente pago?

**Sim, indiretamente — V-5** (créditos de top-up reembolsado continuam gastáveis) e **V-3**
(desconto aplicado sem elegibilidade real, reduzindo o valor pago pela mesma assinatura).
O motor de crédito em si (reserva/gasto) é resistente a duplicação — nenhum "gastar duas vezes
o mesmo crédito" foi encontrado.

---

## 8. Webhook Security

| Gateway | Assinatura verificada | Fail-closed | Idempotência (event-id) | Vínculo org correto | Refund/chargeback tratado |
|---|---|---|---|---|---|
| Stripe (rota atual, `/stripe`) | Sim (`constructEvent`) | Sim | Sim, v2 (`BillingWebhookEvent.eventId @unique`) | Sim (metadata assinada / customer id do próprio Stripe) | v2: parcial (V-5, P-1) — legado: **não** (V-4) |
| Cakto | Sim (token/HMAC, `timingSafeEqual`) | Sim, exceto escape hatch explícito `ALLOW_UNSIGNED_WEBHOOKS=true` (logado, off por padrão) | Sim (Redis `SET NX`, TTL 24h) | Sim (`checkoutReference` resolvido server-side) | **Sim, completo** — melhor implementação das três |
| NOWPayments | Sim (HMAC-SHA512 + JWT no path, escopado a 1 pedido) | Sim | Não, mas upsert idempotente por natureza (sem impacto) | Sim (JWT + HMAC) | N/A (cripto não é reversível) |

Nenhum webhook foi forjável, repetível-com-efeito-duplicado, ou vinculável ao cliente errado nos
três gateways. A fraqueza real do lado de webhooks está em **eventos que existem mas não são
tratados** (V-4) ou são tratados incompletamente (V-5, P-1), não em falsificação/replay.

---

## 9. Credit / Balance Abuse

Esta foi a subárea mais bem projetada do sistema:

- `CreditAccountingService.reserve()` roda dentro de uma transação
  `Prisma.TransactionIsolationLevel.Serializable` real do Postgres, com retry em `P2034`
  (conflito de serialização) — a clássica race "ler saldo → checar → gastar" **não é
  explorável**: duas requisições concorrentes de fato abortam-e-tentam-de-novo em vez de as
  duas passarem.
- Reserva acontece **antes** do trabalho caro (chamada ao provedor de IA), settle/refund
  acontece depois — inclusive tratando desconexão do cliente (`res.close`), não só sucesso/erro.
- Custo é sempre derivado server-side de uma tabela de preços fixa, nunca de input do cliente
  (o único endpoint que ecoa parâmetros de cliente para `pricingCatalog.quote()` é
  `/billing/v2/quote`, que é somente leitura/preview — nunca reserva ou gasta).
- Concessão de crédito (webhook Stripe → `grantSubscriptionCredits`/`grantTopup`) tem dupla
  camada de idempotência: dedup por `event.id` do Stripe **e** por chave de idempotência própria
  dentro de `CreditAccountingService.grant()` — um retry de webhook não duplica crédito mesmo se
  a primeira camada falhasse.
- Nenhum caminho encontrado onde um org possa ler/gastar saldo de outro org (org sempre resolvida
  server-side, nunca de input do cliente) — ver P-7 para a única ressalva (latente, não
  explorável hoje).

Único achado de menor porte: `SubscriptionService.useCredit()` (caminho legado usado por
`generateImageTool`/`generateVideoTool`) inclui `randomUUID()` na chave de idempotência, o que
anula a deduplicação de retry para essa chamada específica — risco é **cobrar o usuário duas
vezes** por engano (prejudica o usuário, não é uma via de abuso para o atacante).

---

## 10. Business Logic Issues

- **Duas arquiteturas de billing paralelas** (`Subscription` legado sem status real +
  `BillingSubscription` v2 com status) é a causa raiz estrutural por trás de V-1 e V-4: o
  caminho legado/Cakto não herda nenhuma das proteções desenhadas para o v2 (confirmação via
  webhook antes de ativar, tratamento completo de refund/dispute). Qualquer nova proteção
  adicionada só ao v2 continuará não cobrindo o Cakto até que ele seja migrado ou corrigido
  separadamente.
- `applyDiscount` (V-3) é um bug de lógica clássico (Promise não aguardada) com impacto
  financeiro direto — não é um problema de arquitetura, é um bug pontual fácil de corrigir.

---

## 11. Race Conditions

- **Sistema de crédito v2:** protegido (Serializable + retry) — sem achado.
- **Processamento de webhook (Stripe v2, Cakto):** protegido por dedup de event-id — sem
  achado.
- **`handleInvoicePaid` (P-3):** duas escritas não-atômicas (status + concessão de crédito) —
  janela de inconsistência em caso de crash, provavelmente auto-curável no retry do Stripe mas
  não garantido por transação.
- **Resgate de código lifetime (P-4):** TOCTOU real, mas inalcançável hoje (guard de
  superadmin).
- Nenhuma race condition explorável por um atacante com conta normal foi confirmada no sistema
  de créditos ou nos webhooks dos três gateways.

---

## 12. Authorization / IDOR

Revisão completa de todas as rotas de `billing.controller.ts` (planos/v2, checkout, topup,
change-plan, cancel, portal, check/:id, discount, finish-trial, subscribe, embedded, prorate):
**nenhum IDOR encontrado**. Toda rota usa `@GetOrgFromRequest()`, que lê `req.org`, setado pelo
`AuthMiddleware` estritamente a partir das organizações do usuário autenticado — nenhum
`organizationId`/`subscriptionId`/`customerId`/`paymentId` vindo de body/query/params é
confiado diretamente para leitura ou escrita sensível em nenhum lugar do billing.

Endpoints admin de billing (`AdminBillingController`/`AdminCreditsController`/`AdminAiController`)
são protegidos por `AdminSessionGuard`+`AdminPermissionGuard` com permissão obrigatória por
rota (nega por padrão), aprovação dupla e MFA step-up para ações críticas (`billing.plans.write`,
`billing.pricing.write`, `billing.refund`) — bem desenhado.

**M-2 (MEDIUM) — mass assignment em endpoints admin de billing:** `updatePlan`, `updatePrice` e
`changeSubscription` (`admin-billing-ai.controller.ts`) tipam `@Body()` como objeto TS puro, não
como DTO de `class-validator` — o `ValidationPipe` global (`whitelist`/`forbidNonWhitelisted`)
não se aplica a esses parâmetros (Nest só valida quando o metatype refletido é uma classe com
decoradores). Um admin já autorizado com a permissão específica poderia enviar campos extras
que seriam repassados direto para o `prisma.update`. Exige uma conta admin já comprometida ou
maliciosa com a permissão certa — não é explorável por usuário comum.

---

## 13. Refund / Chargeback Issues

Ver V-4, V-5, P-1 (seção 4/5) — resumo:

| Gateway | Refund tratado | Chargeback/dispute tratado |
|---|---|---|
| Stripe (rota legada) | **Não** (V-4) | **Não** (V-4) |
| Stripe V2 | Marca fatura, **não revoga créditos/assinatura** (V-5) | Bloqueia gasto de crédito, **não revoga features de plano** (P-1) |
| Cakto | **Sim, completo** — todos os status de reembolso/chargeback/disputa fazem downgrade imediato para FREE | (mesmo tratamento, unificado) |
| NOWPayments | N/A (cripto não reversível) | N/A |

Cakto é, paradoxalmente, a implementação mais correta de refund/chargeback do projeto — mas é
também a origem da vulnerabilidade mais crítica (V-1), porque a falha ali está na *ativação*, não
na reversão.

---

## 14. Risk Ranking

| # | Título | Severidade | Status | Local principal |
|---|---|---|---|---|
| V-1 | Assinatura paga ativada sem confirmação de pagamento (Cakto) | **CRITICAL** | CONFIRMED | cakto.service.ts:232-286 |
| V-2 | `resolveAccess()` não reavalia `currentPeriodEnd` para status ACTIVE | **HIGH** | CONFIRMED | billing-entitlements.service.ts:40-66 |
| V-3 | `applyDiscount` sem `await` — elegibilidade de desconto é no-op | **HIGH** | CONFIRMED | stripe.service.ts:617-621 |
| V-4 | Webhook Stripe legado sem tratamento de refund/dispute | **HIGH** | CONFIRMED | stripe.controller.ts:46-57 |
| V-5 | Refund de top-up (Stripe V2) não revoga créditos concedidos | **HIGH** | CONFIRMED | billing-stripe.service.ts:376-380 |
| P-1 | Dispute não revoga features/capacidade de plano, só gasto de crédito | MEDIUM | CONFIRMED | billing-stripe.service.ts:382-390 |
| Trial | Trial abuse essencialmente irrestrito (plus-addressing, sem fingerprint) | MEDIUM* | CONFIRMED | organization.repository.ts:286-300 |
| M-2 | Mass assignment em endpoints admin de billing (requer admin já autorizado) | MEDIUM | CONFIRMED | admin-billing-ai.controller.ts |
| P-2 | Downgrade cobra preço antigo, entrega plano novo | MEDIUM | POTENTIAL | billing-stripe.service.ts:136-148 |
| P-3 | `handleInvoicePaid` não-atômico (status + crédito) | MEDIUM | POTENTIAL | billing-stripe.service.ts:292-346 |
| P-4 | Resgate de código lifetime: race + oráculo de padding CBC | LOW hoje / CRITICAL se guard removido | CONFIRMED, mitigado | stripe.service.ts:965-1008 |
| — | Bounds/positividade ausente em preços/créditos criados por admin | LOW | CONFIRMED | admin-billing-ai.controller.ts |
| P-7 | Idempotência de crédito não verifica `organizationId` da linha retornada | LOW/MEDIUM | POTENTIAL, latente | credit-accounting.service.ts:131,237 |
| P-6 | `Organization.paymentId` sem `@unique` | LOW | INFO | schema.prisma |
| P-5 | Gap no config-checker para `STRIPE_SIGNING_KEY` | LOW | POTENTIAL | configuration.checker.ts:56-68 |
| — | Sem idempotência no webhook Stripe V1 legado (impacto baixo, upsert) | INFO | CONFIRMED, sem impacto | stripe.service.ts |
| — | Sem idempotência na IPN do NOWPayments (impacto baixo, upsert) | INFO | CONFIRMED, sem impacto | crypto/nowpayments.ts |
| — | Sem job de reconciliação periódica contra o gateway | INFO | arquitetural | — |
| — | `useCredit()` legado com `randomUUID()` na chave de idempotência (cobra usuário 2x, não beneficia atacante) | INFO | CONFIRMED | subscription.service.ts:31-55 |

\* Severidade isolada de trial abuse seria alta, mas fica ofuscada por V-1 dar acesso pago
completo sem sequer precisar do trial.

**Prioridade de correção recomendada:** V-1 primeiro (é a resposta direta à pergunta central da
auditoria e está, segundo a própria configuração do repositório, ativa em produção) → V-4/V-5
(fecham o ciclo de refund/chargeback) → V-2 (fecha a persistência indevida de acesso) → V-3
(bug pontual, fácil) → P-1/M-2/P-2/P-3 → o restante é baixa prioridade/defesa em profundidade.

---

## Nota sobre metodologia

Esta auditoria foi feita por leitura de código e rastreamento de fluxo completo (5 frentes de
investigação em paralelo: gateways/webhooks, ciclo de vida de assinatura/entitlements,
créditos/uso, autorização de API de billing, cupons/refund/schema/jobs), sem execução de
pagamentos reais e sem qualquer alteração no projeto, conforme solicitado. Nenhuma correção foi
aplicada nesta etapa.
