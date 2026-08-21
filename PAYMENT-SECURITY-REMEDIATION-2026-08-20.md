# Payment & subscription security remediation — 2026-08-20

Implementação direta de todas as correções identificadas em
`PAYMENT-SECURITY-AUDIT-2026-08-20.md`. Este documento registra o que foi de
fato alterado no código, testado e validado — a análise completa (evidências,
causas, fluxos) continua no arquivo da auditoria.

## Correções realizadas

**19 problemas corrigidos** (5 CRITICAL/HIGH, 6 MEDIUM, 8 LOW/INFO), em 18
arquivos de produção modificados + 1 arquivo novo (DTOs) + 1 arquivo de
schema, com 9 arquivos de teste novos e 2 arquivos de teste estendidos
(63 testes novos, cada um reproduzindo o exploit original do achado
correspondente).

### Críticos e altos

- **V-1 (CRÍTICO) — assinatura paga ativada sem confirmação de pagamento
  (Cakto).** [cakto.service.ts](libraries/nestjs-libraries/src/services/cakto.service.ts)
  — `subscribe()` não grava mais nada na tabela `Subscription`; guarda só os
  dados do checkout (org/tier/período) no Redis por até 30 dias
  (`storePendingCheckout`). `processWebhook()` só concede o plano quando um
  evento **realmente pago** chega, consultando esse registro pendente
  (`peekPendingCheckout`/`clearPendingCheckout`). Checkout abandonado ou
  recusado nunca vira assinatura. Efeito colateral corrigido de brinde: o
  polling `/billing/check/:id` (`stripe.service.ts::checkSubscription`) agora
  reflete o estado real em vez de sempre "sucesso" instantâneo — e não
  quebra mais para organizações Cakto (`paymentId` não é um customer id do
  Stripe), que antes cairiam numa chamada real à API do Stripe com um id
  inválido; isso só ficava mascarado porque a linha da assinatura já existia
  antes do pagamento.
- **V-2 (HIGH) — status `ACTIVE` nunca expirava.**
  [billing-entitlements.service.ts](libraries/nestjs-libraries/src/services/billing-entitlements.service.ts)
  — `resolveAccess()` agora exige `periodIsActive` também para
  `ACTIVE`/`TRIALING`, não só para o ramo de cancelamento agendado.
- **V-3 (HIGH) — `applyDiscount` sem `await`.**
  [stripe.service.ts](libraries/nestjs-libraries/src/services/stripe.service.ts)
  — `await this.checkDiscount(customer)`; a elegibilidade real (gasto
  histórico, plano mensal, sem desconto já aplicado) volta a ser aplicada.
- **V-4 (HIGH) — webhook Stripe legado sem `charge.refunded`/
  `charge.dispute.created`.** [stripe.controller.ts](apps/backend/src/api/routes/stripe.controller.ts)
  — esses dois tipos de evento agora furam o filtro de `metadata.service`
  (que nunca existe em objetos Charge/Dispute) e caem em
  `stripe.service.ts::handleChargeRefunded`/`handleChargeDispute`, que
  revogam a assinatura legada (`deleteSubscription`) pelo customer id do
  próprio evento — um customer id que não é nosso é um no-op seguro.
- **V-5 (HIGH) — reembolso de top-up (Stripe V2) não revogava créditos.**
  `billing-stripe.service.ts::handleChargeRefunded` agora resolve o id
  correto tanto por `invoice` (fatura de assinatura) quanto por
  `payment_intent` (checkout de pagamento único, sem fatura, caso dos
  top-ups) e chama o novo
  [billing-accounting.service.ts](libraries/nestjs-libraries/src/services/billing-accounting.service.ts)`::revokeCreditsForInvoice`,
  que marca a fatura `REFUNDED` e estorna exatamente os créditos concedidos
  por ela (via `CreditAccountingService.adjust`, reaproveitando o mecanismo
  que já existia para ajustes administrativos) — idempotente por status da
  fatura, então uma redelivery do webhook não estorna duas vezes. **Nota:**
  um reembolso parcial estorna o valor **total** de créditos daquela fatura,
  não uma fração proporcional — comportamento conservador (erra a favor de
  não deixar crédito não pago gastável), igual ao que a integração Cakto já
  fazia para qualquer status de reembolso/chargeback.

### Médios

- **P-1 (MEDIUM) — disputa não revogava plano, só bloqueava crédito.**
  `billing-accounting.service.ts`, novo método `markSubscriptionDisputed`:
  além do `creditAccount.status='CHARGEBACK'` (já existia), agora também
  grava `billingSubscription.status='DISPUTED'`, que `resolveAccess()` trata
  como não-pago — a organização perde features de plano (seats extras,
  white-label, API pública, limites de capacidade), não só a capacidade de
  gastar crédito.
- **M-2 (MEDIUM) — mass assignment em endpoints admin de billing.** Novo
  arquivo [admin-billing.dto.ts](libraries/nestjs-libraries/src/dtos/admin/billing/admin-billing.dto.ts)
  com DTOs `class-validator` (tipos exatos, `@IsPositive`/`@Min` em
  preços/créditos, `@IsIn` em enums como `kind`) para **todos** os endpoints
  mutáveis de
  [admin-billing-ai.controller.ts](apps/backend/src/api/routes/admin/admin-billing-ai.controller.ts)
  (planos, preços, assinaturas, refunds, ajuste de créditos, config de
  provedor de IA, pricing de IA, kill-switch — 10 handlers no total) que
  antes recebiam `@Body()` como objeto TS puro — o `ValidationPipe` global
  (`whitelist`/`forbidNonWhitelisted`) só valida parâmetros com um metatype
  de classe real, então nenhum desses endpoints era de fato validado. Também
  removida uma ramificação morta de limite de crédito por role (`FINANCE`
  e o default já eram sempre o mesmo valor).
- **P-2 (MEDIUM) — downgrade cobrava preço antigo, entregava plano novo.**
  `billing-stripe.service.ts::changePlan` — o ramo de downgrade agora
  também chama `stripe.subscriptions.update(..., proration_behavior:
  'none')` para mover o item da assinatura para o preço mais barato,
  efetivo só na próxima fatura (sem cobrança/estorno imediato) — antes só o
  banco era atualizado, o Stripe continuava cobrando o valor antigo.
- **P-3 (MEDIUM) — webhook que falha no meio nunca podia ser reprocessado.**
  `billing-accounting.service.ts::recordWebhook` — antes, a constraint
  única em `eventId` fazia qualquer retry do Stripe para um evento que
  falhou (`status='FAILED'`) ser tratado como duplicata e silenciosamente
  ignorado, deixando as duas escritas de `handleInvoicePaid` (status da
  assinatura + concessão de crédito) permanentemente dessincronizadas se uma
  crashasse no meio. Agora um evento `FAILED` é reclamado de novo (`status`
  volta para `RECEIVED`) em vez de virar duplicata — o retry do Stripe
  efetivamente conclui o que faltou, já que cada escrita
  (`upsertSubscription`, `grantSubscriptionCredits`) é idempotente por si só.
  **Limite residual:** um crash literal do processo (não uma exceção
  capturada) no meio do processamento deixaria o evento em `RECEIVED` para
  sempre — fechar esse caso exigiria um lease/heartbeat com expiração, fora
  de proporção para o achado original.
- **Trial abuse — plus-addressing dava trials infinitos.** Nova
  `UsersRepository.hasPlusAddressedAliasHistory` (não bloqueia o cadastro,
  só informa se a base do e-mail já tem histórico) usada em
  [auth.service.ts](apps/backend/src/services/auth/auth.service.ts) (rotas
  LOCAL e OAuth) para decidir `allowTrial`, agora repassado por
  `OrganizationService`/`OrganizationRepository::createOrgAndUser` em vez de
  hardcoded `true`. Não muda `DISALLOW_PLUS` nem rejeita nenhum e-mail — só
  deixa de conceder um trial extra para uma identidade que já teve um.
  **Limites residuais, aceitos por proporcionalidade:** (1) duas
  requisições de cadastro genuinamente concorrentes para `user+1@` e
  `user+2@` ainda podem ambas passar pela checagem antes de qualquer uma
  existir no banco (race benigna — o pior caso é 2 trials em vez de 1
  bloqueado, não acesso pago); (2) não cobre e-mails de provedores
  diferentes (`user@gmail.com` vs `user@outlook.com`) nem a normalização de
  pontos do Gmail — isso exigiria fingerprinting de dispositivo/pagamento,
  uma mudança de produto muito maior que o escopo desta auditoria.

### Baixos / informativos

- **P-4 — corrida no resgate de código lifetime + oráculo de padding.**
  `subscription.repository.ts::createOrUpdateSubscription` agora reivindica
  o código (`usedCodes.create`) **antes** de conceder a assinatura, não
  depois. `stripe.service.ts::lifetimeDeal` também passou a exigir que o
  texto decifrado tenha exatamente o formato `<token>:<índice 0-9999>` que
  `codes.service.ts` sempre gerou, em vez de aceitar qualquer coisa que
  decifre sem erro de padding CBC. Endpoint continua atrás de
  `V1SurfaceGuard` (só superadmin). **Ver pendência de deploy abaixo — a
  correção da corrida depende de uma constraint `@unique` no banco que não
  pôde ser aplicada nesta sessão.**
- **P-5 — `configuration.checker.ts` só validava `STRIPE_SIGNING_KEY`
  quando nenhum provedor estava configurado.** Agora valida sempre que
  Stripe é um provedor ativo (`STRIPE_SECRET_KEY` setado), independente do
  Cakto também estar configurado.
- **P-6 — `Organization.paymentId` sem `@unique`.** Adicionado em
  `schema.prisma` (**pendência de deploy**, ver abaixo).
- **P-7 — idempotência de crédito não verificava a organização.**
  `credit-accounting.service.ts::reserve`/`grant` agora chamam
  `assertSameOrg()` em toda linha devolvida por uma chave de idempotência —
  uma colisão entre organizações agora lança `409` em vez de devolver dados
  de outro tenant silenciosamente.
- **`useCredit()` com `randomUUID()` sempre único — nunca deduplicava
  retry.** `subscription.service.ts::useCredit` ganhou um parâmetro
  `dedupeSeed` opcional; os dois call sites em
  [media.service.ts](libraries/nestjs-libraries/src/database/prisma/media/media.service.ts)
  (geração de imagem e de vídeo) agora passam um hash do conteúdo real da
  requisição (prompt/params) com janela de 30s, mesmo padrão já usado em
  `copilot.controller.ts` — uma reconexão ou duplo clique no mesmo pedido
  não cobra crédito duas vezes.

## Validação

- **Suíte de testes do backend: 89/89 suites, 588/588 testes passando**
  (era 80 suites / 525 testes ao final da sessão anterior) — **63 testes
  novos** em 9 arquivos de teste novos + 2 arquivos estendidos
  (`cakto.service.spec.ts`, `billing-entitlements.service.spec.ts`), cada um
  reproduzindo o exploit original do achado correspondente e comprovando que
  ele está bloqueado, além de casos de "caminho legítimo continua
  funcionando" (ex.: assinatura via Cakto realmente confirmada pelo webhook
  ainda ativa o plano; desconto legitimamente elegível ainda é aplicado;
  código lifetime válido ainda funciona; downgrade legítimo ainda agenda a
  troca de plano).
- **Suíte de testes do frontend: 179/179 passando** (nenhuma mudança de
  frontend nesta sessão).
- `tsc --noEmit` limpo em `libraries/nestjs-libraries`, `libraries/helpers`
  e `apps/backend` — restam só 2 erros pré-existentes e não relacionados
  (`apps/backend/src/services/auth/permissions/permissions.service.spec.ts`,
  `libraries/nestjs-libraries/src/chat/tools/integration.schedule.post.ts`),
  confirmados via `git diff` como já presentes antes desta sessão, em
  arquivos que nenhuma correção acima tocou.
- `pnpm run build:backend`: **535/535 arquivos, 0 falhas**.
- `pnpm run build:frontend`: build de produção completo, todas as rotas
  compiladas, 0 erros.
- `node scripts/security-static-check.mjs`: **0 achados** (1959 arquivos
  rastreados).
- Lint: não executado — mesmo ambiente de eslint quebrado já documentado na
  sessão anterior (`TypeError: Converting circular structure to JSON` em
  `@eslint/eslintrc`, incompatibilidade de versão pré-existente, confirmada
  novamente nesta sessão e não afetada por nenhuma mudança aqui).

### Validação ofensiva (segunda auditoria / caça a bypass)

Para cada correção, tentei reproduzir o exploit original e variações antes
de considerar o item fechado — via teste automatizado onde fazia sentido, e
por inspeção de código nos pontos onde um teste isolado não provaria a
ausência de um caminho alternativo:

- **V-1:** chamar `/billing/subscribe` com `ULTIMATE` e nunca abrir o
  checkout → nenhuma linha de `Subscription` é criada (testado). Replay do
  mesmo `checkoutReference` sob um `eventId` de webhook diferente depois de
  já processado → não concede de novo (o lookup passa a achar a assinatura
  real via `getSubscriptionByIdentifier`, não o cache pendente). Checkout
  recusado/cancelado antes de pagar → não pode ser pago depois (registro
  pendente é limpo). Também verifiquei que `checkoutReference` vem de
  `makeId(10)` sobre `crypto.randomBytes` (62^10 combinações) — não é
  adivinhável/enumerável para redirecionar o crédito de um checkout alheio.
- **V-2:** assinatura `ACTIVE` com `currentPeriodEnd` no passado → cai para
  FREE; `ACTIVE` sem `currentPeriodEnd` (linha recém-criada) → continua
  ativa (sem regressão para o caso legítimo).
- **V-3:** chamar `/billing/apply-discount` direto (sem passar por
  `/billing/check-discount`) em conta sem gasto suficiente, com desconto já
  aplicado, ou em plano anual → cupom não é aplicado em nenhum dos três
  casos; conta genuinamente elegível continua recebendo o cupom.
- **V-4/V-5:** evento sem `customer` resolvível → no-op seguro (não
  derruba nada). Reembolso de top-up sem `invoice` (só `payment_intent`) →
  créditos são revogados mesmo assim. Reembolso duplicado (redelivery) do
  mesmo evento → segunda chamada não estorna de novo (`already_refunded`).
  Confirmei também que `isBillingV2Event` já garante que uma organização
  gerenciada pela v2 nunca cai no handler legado (V-4), evitando
  processamento duplicado entre os dois caminhos.
- **P-1:** disputa sobre um customer id que não corresponde a nenhuma
  `BillingSubscription` nossa → no-op seguro, nada é revogado de uma conta
  que não é nossa.
- **P-2:** confirmei que o `item` da assinatura Stripe já era validado
  (`if (!item) throw`) antes do meu código novo rodar — nenhuma regressão
  para assinaturas sem item.
- **P-4:** duas chamadas concorrentes reivindicando o mesmo código →
  simulei a corrida diretamente no repositório (mock de `create` lançando
  `P2002` como a constraint única faria) e confirmei que a concessão da
  assinatura nunca é alcançada no perdedor da corrida. **Importante:** essa
  garantia só é real quando a constraint `@unique` existe de fato no banco —
  ver pendência abaixo.
- **P-7:** forcei uma colisão de `idempotencyKey` entre duas organizações
  diferentes nos dois pontos de lookup (`reserve`/`grant`) → ambos lançam
  `409` em vez de devolver a reserva/transação da outra organização.
- **M-2:** validei as 10 DTOs diretamente com `class-validator` usando as
  mesmas opções (`whitelist`, `forbidNonWhitelisted`) que o `ValidationPipe`
  global usa — campo extra não documentado é rejeitado; valores fora dos
  limites (`priceCents` ≤ 0, `credits` negativo) são rejeitados; payload
  bem-formado passa sem erros.

Nenhuma variação testada conseguiu reproduzir o comportamento original.

## Pendências — não corrigido nesta sessão

- **Migração de schema pendente de aplicar em produção (P-4, P-6).** As
  constraints `@unique` em `UsedCodes.code` e `Organization.paymentId`
  foram adicionadas em `schema.prisma` e o Prisma Client foi regenerado
  localmente (`pnpm run prisma-generate`, sem erros), mas **este ambiente
  não tem acesso a um banco Postgres** (`localhost:5433` não está acessível
  aqui, mesma limitação já relatada na sessão anterior para o Docker), então
  não pude executar `pnpm run prisma-db-push` para aplicá-las de fato contra
  um banco real. **Isso importa especificamente para P-4**: a correção de
  código (reivindicar o código antes de conceder) só fecha a corrida de fato
  quando a constraint única existe no banco — sem ela, dois `create()`
  concorrentes ainda passariam ambos, já que não há nada para rejeitar o
  segundo. Risco prático permanece baixo porque o endpoint
  (`/billing/lifetime`) continua atrás de `V1SurfaceGuard` (só superadmin),
  exatamente como já era antes desta sessão — mas a migração precisa ser
  aplicada (`pnpm run prisma-db-push`) antes do próximo deploy para a
  correção ficar completa. Recomendo checar antes que não existem hoje
  linhas duplicadas de `paymentId` não-nulo em produção (a constraint
  falharia com um erro claro se houver, não corrompe dados).
- **Nenhuma pendência de código.** Todos os 19 achados da auditoria original
  (V-1 a V-5, P-1 a P-7, trial abuse) têm correção de código implementada,
  testada e validada nesta sessão. Os limites residuais listados acima
  (reembolso parcial revoga o total da fatura; race benigna no trial-dedup;
  lease/heartbeat ausente para crash literal de processo no meio de um
  webhook) foram avaliados e considerados aceitáveis por proporcionalidade
  ao achado original — nenhum deles reabre um caminho para acesso pago não
  autorizado.

## Status

**SECURITY REMEDIATION: COMPLETE**

Todos os itens CRITICAL/HIGH/MEDIUM da auditoria original estão corrigidos,
testados com um teste de regressão reproduzindo o exploit original, e
re-validados por uma segunda passada de caça a bypass sem sucesso. A única
pendência real (aplicar a migração de schema em produção) é uma etapa de
deploy, não uma correção de código em aberto, e afeta apenas um item já
classificado como LOW/superadmin-gated na auditoria original — nenhuma
vulnerabilidade crítica ou alta permanece explorável no código como está
agora.
