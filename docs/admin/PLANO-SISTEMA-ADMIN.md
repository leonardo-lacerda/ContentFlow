# Plano — Sistema Administrador ContentFlow

**Objetivo:** um painel administrativo único com controle total da plataforma (usuários, organizações, billing, créditos, IA, conteúdo, integrações, infraestrutura), protegido por uma camada de segurança de nível "produção com acesso privilegiado".

Este plano é dividido em: diagnóstico do que existe hoje → arquitetura alvo → modelo de dados → camada de segurança → domínios de controle → fases de implementação.

---

## 1. Diagnóstico do estado atual

### 1.1 O que já existe

| Peça | Local | Estado |
|---|---|---|
| Flag de admin | `User.isSuperAdmin` (boolean) em [schema.prisma:126](libraries/nestjs-libraries/src/database/prisma/schema.prisma) | Binário: ou tudo, ou nada |
| Controller admin | [admin.controller.ts](apps/backend/src/api/routes/admin.controller.ts) | Só 2 rotas (listar erros / plataformas) |
| UI admin | [admin/errors/page.tsx](apps/frontend/src/app/(app)/(site)/admin/errors/page.tsx) + [admin-errors.component.tsx](apps/frontend/src/components/admin/admin-errors.component.tsx) | Uma única tela |
| Endpoints admin dispersos | [billing.controller.ts:153-199](apps/backend/src/api/routes/billing.controller.ts), [:346-390](apps/backend/src/api/routes/billing.controller.ts), [users.controller.ts:106](apps/backend/src/api/routes/users.controller.ts), [announcements.controller.ts:31](apps/backend/src/api/routes/announcements.controller.ts), [posts.controller.ts:154](apps/backend/src/api/routes/posts.controller.ts) | Checagem `if (!user.isSuperAdmin)` copiada inline |
| Impersonação | [auth.middleware.ts:50-76](apps/backend/src/services/auth/auth.middleware.ts) | Funciona, mas sem auditoria/limite |
| Roles por org | `Role { SUPERADMIN, ADMIN, USER }` em [schema.prisma:977](libraries/nestjs-libraries/src/database/prisma/schema.prisma) | Escopo de organização, não da plataforma |
| Rate limit | `ThrottlerModule` + Redis em [app.module.ts:39](apps/backend/src/app.module.ts) | Global, sem política específica de admin |

### 1.2 Falhas de segurança encontradas (precisam ser resolvidas antes de ampliar poderes)

Estas não são hipóteses — são consequências diretas do código atual. Ampliar o poder do admin sem corrigi-las multiplica o dano de cada uma.

**F1 — `isSuperAdmin` vem do JWT, não do banco.**
Em [auth.middleware.ts:39](apps/backend/src/services/auth/auth.middleware.ts), `AuthService.verifyJWT(auth) as User` desserializa o usuário direto do token. Todo `user.isSuperAdmin` posterior confia nesse payload. Combinado com `expiresIn: '30d'` em [auth.service.ts](libraries/helpers/src/auth/auth.service.ts), significa: **revogar admin de alguém não tem efeito por até 30 dias.** Um token vazado é superadmin por um mês.

**F2 — Não há revogação de sessão.** Sem tabela de sessões, sem `jti`, sem denylist. Não existe "deslogar todas as sessões" nem "matar a sessão do invasor".

**F3 — Impersonação sem rastro.** Em [auth.middleware.ts:58](apps/backend/src/services/auth/auth.middleware.ts) o código faz `user.isSuperAdmin = true` no usuário impersonado — ou seja, o admin navega como o cliente **mantendo privilégios de superadmin**. Não há log de quem impersonou quem, quando, por quanto tempo, nem expiração do cookie `impersonate`.

**F4 — Zero auditoria.** Nenhum model de audit log no schema. Hoje é possível ajustar créditos ([billing.controller.ts:165](apps/backend/src/api/routes/billing.controller.ts)), reembolsar cobranças e cancelar assinaturas sem deixar registro imutável.

**F5 — Sem MFA.** Nenhum TOTP/WebAuthn em lugar nenhum do código. A conta mais poderosa do sistema é protegida por e-mail + senha.

**F6 — Autorização copiada e colada, inconsistente.** `throw new HttpException('Unauthorized', 400)` em uns lugares, `403` em outros, `throw new Error('Unauthorized')` em [billing.controller.ts:384](apps/backend/src/api/routes/billing.controller.ts). Cada nova rota admin é uma chance de esquecer a checagem. É o padrão errado para escalar de 2 para ~80 rotas.

**F7 — Sem limites em operações destrutivas.** Nada impede ajustar 10.000.000 de créditos, nem reembolsar em massa.

> **Consequência de projeto:** a Fase 0 (segurança de base) não é opcional nem adiável para depois das features. O painel só deve ganhar poderes novos sobre um alicerce que já registra, limita e revoga.

---

## 2. Arquitetura alvo

```
apps/backend/src/api/routes/admin/          ← controllers do admin (um por domínio)
apps/backend/src/services/admin/            ← guard, decorators, políticas, audit interceptor
libraries/nestjs-libraries/src/database/prisma/admin/   ← services + repositories
apps/frontend/src/app/(app)/(site)/admin/   ← rotas Next.js
apps/frontend/src/components/admin/         ← componentes por domínio
```

**Princípios:**

1. **Superfície separada.** Todas as rotas admin sob o prefixo `/admin/*`, com middleware, guard, throttler e auditoria próprios. Nenhuma rota admin nova fora desse prefixo — as que existem hoje espalhadas (billing, users, posts, announcements) são migradas na Fase 3.
2. **Negar por padrão.** O guard exige uma permissão declarada explicitamente; rota sem declaração é bloqueada, não liberada.
3. **Toda escrita é auditada.** Auditoria por interceptor, não por chamada manual — impossível esquecer.
4. **Leitura ≠ escrita ≠ destrutivo.** Três níveis com requisitos de autenticação crescentes.

---

## 3. Modelo de dados (novos models Prisma)

Adicionar ao [schema.prisma](libraries/nestjs-libraries/src/database/prisma/schema.prisma):

```prisma
// ---------- RBAC de plataforma ----------
enum AdminRoleType {
  OWNER          // controle total, inclusive gerenciar outros admins
  ADMIN          // operação ampla, sem gestão de admins nem config crítica
  SUPPORT        // leitura + ações de suporte (créditos limitados, reprocessar job)
  FINANCE        // billing, créditos, reembolsos, relatórios
  ENGINEER       // erros, jobs, filas, feature flags, integrações
  READONLY       // somente leitura
}

model AdminUser {
  id            String        @id @default(uuid())
  userId        String        @unique
  role          AdminRoleType
  permissions   Json?         // overrides granulares: { "billing.refund": false }
  mfaEnabled    Boolean       @default(false)
  mfaSecret     String?       // cifrado com AuthService.fixedEncryption
  mfaBackupCodes Json?        // hashes bcrypt dos códigos de recuperação
  ipAllowlist   String[]      @default([])
  status        String        @default("ACTIVE") // ACTIVE | SUSPENDED
  lastAccessAt  DateTime?
  createdBy     String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  user          User          @relation(fields: [userId], references: [id])

  @@index([role])
  @@index([status])
}

// ---------- Sessões revogáveis (resolve F1, F2) ----------
model AdminSession {
  id            String    @id @default(uuid())
  adminUserId   String
  jti           String    @unique   // claim do JWT
  ip            String?
  userAgent     String?
  mfaVerifiedAt DateTime?
  expiresAt     DateTime
  revokedAt     DateTime?
  revokedBy     String?
  createdAt     DateTime  @default(now())
  adminUser     AdminUser @relation(fields: [adminUserId], references: [id])

  @@index([adminUserId])
  @@index([expiresAt])
  @@index([revokedAt])
}

// ---------- Auditoria imutável (resolve F4) ----------
model AdminAuditLog {
  id            String   @id @default(uuid())
  adminUserId   String?
  actorEmail    String              // desnormalizado: sobrevive à exclusão do usuário
  action        String              // "billing.credits.adjust"
  resourceType  String              // "Organization"
  resourceId    String?
  targetOrgId   String?
  before        Json?
  after         Json?
  reason        String?             // obrigatório em ações destrutivas
  ip            String?
  userAgent     String?
  requestId     String?
  severity      String   @default("INFO")   // INFO | WARNING | CRITICAL
  success       Boolean  @default(true)
  errorMessage  String?
  createdAt     DateTime @default(now())

  @@index([adminUserId])
  @@index([action])
  @@index([targetOrgId])
  @@index([createdAt])
  @@index([resourceType, resourceId])
}

// ---------- Impersonação controlada (resolve F3) ----------
model AdminImpersonation {
  id            String    @id @default(uuid())
  adminUserId   String
  targetUserId  String
  targetOrgId   String?
  reason        String              // obrigatório
  ticketRef     String?
  readOnly      Boolean   @default(true)
  startedAt     DateTime  @default(now())
  expiresAt     DateTime            // máx. 60 min
  endedAt       DateTime?

  @@index([adminUserId])
  @@index([targetUserId])
  @@index([expiresAt])
}

// ---------- Aprovação em duas pessoas ----------
model AdminApprovalRequest {
  id            String    @id @default(uuid())
  requestedBy   String
  action        String
  payload       Json
  reason        String
  status        String    @default("PENDING") // PENDING | APPROVED | REJECTED | EXPIRED | EXECUTED
  approvedBy    String?
  approvedAt    DateTime?
  rejectReason  String?
  executedAt    DateTime?
  expiresAt     DateTime
  createdAt     DateTime  @default(now())

  @@index([status])
  @@index([requestedBy])
}

// ---------- Configuração dinâmica + feature flags ----------
model PlatformSetting {
  id          String   @id @default(uuid())
  key         String   @unique
  value       Json
  category    String              // "billing" | "ai" | "limits" | "security"
  description String?
  isSecret    Boolean  @default(false)  // valor mascarado na UI e no audit log
  updatedBy   String?
  updatedAt   DateTime @updatedAt

  @@index([category])
}

model FeatureFlag {
  id            String   @id @default(uuid())
  key           String   @unique
  enabled       Boolean  @default(false)
  rolloutPercent Int     @default(0)
  targetOrgIds  String[] @default([])
  targetPlans   String[] @default([])
  description   String?
  updatedBy     String?
  updatedAt     DateTime @updatedAt
}
```

Adicionar em `User`: `adminUser AdminUser?`.

**Imutabilidade do audit log:** aplicar via migração SQL bruta, porque Prisma não expressa isso.

```sql
REVOKE UPDATE, DELETE ON "AdminAuditLog" FROM <app_db_user>;
```

Se o mesmo papel do banco faz as migrações, criar um papel separado só para a aplicação. Sem isso, "log imutável" é só um nome.

---

## 4. Camada de segurança

### 4.1 Identidade e sessão

- **JWT admin separado** do JWT de usuário: cookie `admin_auth`, claim `typ: "admin"`, `jti` obrigatório, TTL de **60 minutos** (contra 30 dias hoje) + refresh token rotativo de 8h.
- **Toda requisição admin revalida no banco**: `AdminSession` ativa (`revokedAt = null`, `expiresAt > now`) **e** `AdminUser.status = ACTIVE`. Isto resolve F1 e F2 — revogar acesso passa a ter efeito imediato.
- **Cache Redis de 30s** para o lookup de sessão, invalidado no revoke, para não pagar 2 queries por request.
- **Bind de sessão**: mudança de IP ou de User-Agent invalida a sessão e exige novo login.
- **Logout global**: `POST /admin/security/sessions/revoke-all`.

### 4.2 MFA obrigatório (resolve F5)

- **TOTP** (RFC 6238) obrigatório para todos os papéis exceto `READONLY`; sem MFA ativo, a única rota liberada é a de enrollment.
- Segredo cifrado com `AuthService.fixedEncryption` (já existe em [auth.service.ts](libraries/helpers/src/auth/auth.service.ts)).
- **10 códigos de recuperação**, exibidos uma única vez, guardados como hash bcrypt.
- **Step-up auth**: ações `CRITICAL` (reembolso, exclusão de org, alteração de plano, gestão de admins) exigem TOTP revalidado nos últimos **5 minutos**, mesmo com sessão válida.
- **WebAuthn/Passkey** como fase 2 opcional para papel `OWNER`.

### 4.3 Autorização granular

Substituir o `if (!user.isSuperAdmin)` espalhado por um guard declarativo:

```ts
// apps/backend/src/services/admin/admin-permission.decorator.ts
@AdminPermission('billing.credits.adjust', { severity: 'CRITICAL', requireReason: true })
```

Namespace de permissões (~60 chaves): `users.*`, `orgs.*`, `billing.*`, `credits.*`, `content.*`, `ai.*`, `integrations.*`, `system.*`, `security.*`, `admins.*`.

O `AdminGuard` executa, em ordem: sessão válida → status ACTIVE → MFA satisfeito → IP na allowlist → permissão do papel (+ overrides) → step-up se `CRITICAL` → limites de valor. **Rota sem `@AdminPermission` é negada** — isso é o que resolve F6 de forma estrutural, e não por disciplina.

### 4.4 Rede e superfície

- **IP allowlist** por admin (`AdminUser.ipAllowlist`), opcional mas recomendada para `OWNER`/`FINANCE`.
- **Throttler dedicado** para `/admin/*`: 60 req/min leitura, 10 req/min escrita, 3 req/min destrutivo — usando o `ThrottlerStorageRedisService` já configurado em [app.module.ts:46](apps/backend/src/app.module.ts).
- **Brute force**: 5 falhas de login/MFA → bloqueio progressivo (1min, 5min, 30min) por conta e por IP.
- Cabeçalhos: `Cache-Control: no-store`, `X-Frame-Options: DENY`, CSP restritiva nas rotas admin.
- Subdomínio dedicado (`admin.contentflow.app`) como reforço opcional de isolamento de cookie.

### 4.5 Impersonação segura (resolve F3)

Reescrever [auth.middleware.ts:50-76](apps/backend/src/services/auth/auth.middleware.ts):

- Exige `reason` e cria registro `AdminImpersonation` antes de começar.
- **`readOnly: true` por padrão** — escritas bloqueadas salvo elevação explícita com step-up.
- **Nunca propagar `isSuperAdmin` para a sessão impersonada.** A linha `user.isSuperAdmin = true` é removida.
- Expiração dura de 60 minutos, encerramento automático.
- Banner permanente na UI e **notificação por e-mail ao usuário-alvo**.
- Toda ação durante a impersonação entra no audit log com `actorEmail` do admin real.

### 4.6 Controles sobre operações destrutivas (resolve F7)

- **Limites por papel**: `SUPPORT` ajusta no máximo 500 créditos/dia; `FINANCE` até 50.000; acima disso exige aprovação.
- **Dupla aprovação** (`AdminApprovalRequest`) para: exclusão de organização, reembolso > R$ 1.000, alteração de preço de plano, promoção/rebaixamento de admin, mudança de config `security.*`.
- **Soft delete + janela de restauração de 30 dias** para exclusões de org e usuário.
- **Dry-run obrigatório** em operações em lote: retorna o que seria alterado e um token; a execução exige esse token.
- **Kill switch**: `PlatformSetting` `system.readonly_mode` que bloqueia todas as escritas da plataforma; e `system.admin_lockdown` que derruba todas as sessões admin. Ambos com step-up.

### 4.7 Detecção e resposta

- Alertas (e-mail + Slack/webhook) em: novo admin criado, MFA desativado, falha de login admin, acesso fora da allowlist, ajuste de crédito acima do normal, > 50 ações admin em 5 min.
- Dashboard de segurança: sessões ativas, últimos acessos, geografia, ações críticas das últimas 24h.
- Exportação do audit log (CSV/JSON) assinada, para retenção externa.

---

## 5. Domínios de controle do painel

O requisito é controle total. Estes são os módulos, cada um com controller + service + tela.

### 5.1 Usuários (`users.*`)
Busca global (e-mail, id, nome, IP); ficha completa com orgs, assinatura, créditos, atividade; ativar/desativar; forçar reset de senha; encerrar sessões; editar e-mail/nome/timezone; excluir com soft delete; exportar dados (LGPD); histórico de ações.

### 5.2 Organizações (`orgs.*`)
Listagem com filtros (plano, status, MRR, uso); ficha com membros, canais, uso, faturas; criar/renomear/excluir; gerenciar membros e papéis; regenerar API key; transferir titularidade; forçar plano; conceder trial; suspender; ver e limpar dados.

### 5.3 Billing e financeiro (`billing.*`, `credits.*`)
Consolida e substitui o que hoje está em [billing.controller.ts](apps/backend/src/api/routes/billing.controller.ts): planos e preços (CRUD sobre `BillingPlan`/`BillingPrice`), pacotes de topup, catálogo de preços (`PricingVersion`), assinaturas (criar, mudar, cancelar, reativar), faturas, reembolsos, ajuste de créditos com motivo obrigatório, ledger completo (`CreditTransaction`, `CreditLot`, `CreditReservation`), custos de provedor (`ProviderCostRecord`), ajustes financeiros, e um painel de margem: receita × custo de IA por org.

### 5.4 IA, créditos e custos (`ai.*`)
Configurar provedores e modelos por feature; tabela de preço em créditos por operação; limites por plano; fila de `GenerationJob` (reprocessar, cancelar, priorizar); custos por org/modelo/dia (`GenerationCost`); alertas de estouro; kill switch por provedor.

### 5.5 Conteúdo e moderação (`content.*`)
Posts de todas as orgs (busca, visualizar, cancelar agendamento, remover); projetos de carrossel, criativos, vídeos curtos, campanhas de e-mail; fila de moderação; templates do marketplace (aprovar/rejeitar/despublicar — `MarketplaceTemplate`); anúncios (`Announcement`, hoje em [announcements.controller.ts](apps/backend/src/api/routes/announcements.controller.ts)).

### 5.6 Integrações e canais (`integrations.*`)
Todos os canais conectados por org; estado de token e refresh; forçar refresh; desconectar; habilitar/desabilitar provedor globalmente; taxa de erro por provedor; apps OAuth (`OAuthApp`) e webhooks (`Webhook`, `WebhookDelivery`) com reenvio.

### 5.7 Sistema e operação (`system.*`)
Erros (evolução da tela atual de [admin-errors.component.tsx](apps/frontend/src/components/admin/admin-errors.component.tsx)); saúde de serviços (DB, Redis, Temporal, storage); filas e workers; feature flags; `PlatformSetting`; jobs agendados; cache (inspecionar/invalidar); logs de deploy e versão.

### 5.8 Analytics da plataforma (`analytics.*`)
MRR/ARR, churn, LTV; crescimento de usuários e orgs; ativação e retenção por coorte; uso por feature; consumo de IA; funil de conversão; programa de afiliados (`Affiliate`, `Referral`).

### 5.9 Segurança e admins (`security.*`, `admins.*`)
CRUD de admins e papéis; sessões ativas com revogação; audit log com busca e exportação; fila de aprovações; histórico de impersonação; alertas; configuração de allowlist e políticas de MFA.

---

## 6. Fases de implementação

Cada fase é entregável e testável de forma independente. **A ordem importa** — a Fase 0 corrige as falhas que tornam as fases seguintes perigosas.

### Fase 0 — Fundação de segurança *(bloqueante)*
Models Prisma + migração; migrar `isSuperAdmin` existente para `AdminUser` com papel `OWNER`; JWT admin com `jti` + `AdminSession`; `AdminGuard` com validação no banco; `@AdminPermission`; `AuditInterceptor`; TOTP + códigos de recuperação; throttler `/admin/*`; SQL de imutabilidade do log.
**Saída:** login admin com MFA, sessão revogável, toda ação auditada.

### Fase 1 — Shell do painel
Layout, navegação por domínio, guard de rota no frontend, tabela/filtro/paginação reutilizáveis, modal de step-up MFA, componente de "motivo obrigatório", tela de audit log e de sessões.

### Fase 2 — Usuários e organizações
Módulos 5.1 e 5.2 completos, incluindo a impersonação reescrita (4.5) e o soft delete com restauração.

### Fase 3 — Billing, créditos e IA
Módulos 5.3 e 5.4. **Migrar aqui** as rotas admin hoje espalhadas em `billing.controller.ts`, `users.controller.ts`, `posts.controller.ts` e `announcements.controller.ts` para `/admin/*`, aplicando limites de valor e dupla aprovação.

### Fase 4 — Conteúdo, integrações e sistema
Módulos 5.5, 5.6 e 5.7, incluindo feature flags e `PlatformSetting`.

### Fase 5 — Analytics e endurecimento
Módulo 5.8; alertas e detecção de anomalias (4.7); dupla aprovação em todas as ações críticas; kill switches; dry-run em lote; exportação assinada do audit log.

### Fase 6 — Validação
Testes do guard (matriz papel × permissão), testes de que rota sem decorator é negada, testes de revogação de sessão, teste de que impersonação não vaza `isSuperAdmin`, verificação de que `UPDATE`/`DELETE` no audit log falham, e um teste de carga na listagem com volume real.

---

## 7. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Lockout do próprio admin ao ativar MFA | Comando CLI de emergência (`apps/commands`) para reset de MFA com acesso ao servidor; códigos de recuperação impressos no enrollment |
| Migração quebrar admins existentes | Script idempotente que cria `AdminUser` OWNER para cada `isSuperAdmin = true`; manter o campo antigo por 2 releases como fallback de leitura |
| Latência extra por validação no banco | Cache Redis de 30s com invalidação no revoke |
| Audit log crescendo sem limite | Particionamento por mês + arquivamento em S3 após 12 meses |
| Painel virar alvo primário de ataque | Subdomínio isolado, IP allowlist, MFA, alertas em tempo real |
| Erro humano em ação destrutiva | Motivo obrigatório, dry-run, dupla aprovação, soft delete com 30 dias |

---

## 8. Estimativa

| Fase | Escopo | Estimativa |
|---|---|---|
| 0 | Fundação de segurança | 4–5 dias |
| 1 | Shell do painel | 2–3 dias |
| 2 | Usuários e orgs | 4–5 dias |
| 3 | Billing, créditos, IA | 5–6 dias |
| 4 | Conteúdo, integrações, sistema | 5–6 dias |
| 5 | Analytics e endurecimento | 4–5 dias |
| 6 | Validação | 2–3 dias |

**Total: ~26–33 dias de desenvolvimento.**

Fases 0 e 1 (~7 dias) já entregam um painel seguro e funcional; as demais ampliam a cobertura de domínios.
