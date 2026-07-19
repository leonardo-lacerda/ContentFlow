# ContentFlow — Relatório de Estado Atual do Sistema

**Data:** 2026-07-19  
**Branch:** `main`  
**Últimos commits relevantes:**

- `9fb70cb` — páginas reais Analytics / Editorial / Marcas
- `f4d1f44` — reabertura multi-marca + insights + editorial
- `8b2048c` — Swipe: índice estável + gerar mais ideias
- `2ada9e1` — Swipe → estúdio com ideia pré-preenchida
- `2191e3f` — onboarding sem feature-tour
- `60224a4` — redesign estrutural v1

---

## 1. Resumo executivo

O ContentFlow saiu de um fork Postiz “cheio de features coladas” para um produto centrado no loop:

> **URL da marca → Brand DNA → Ideias (Swipe) → Criar → Publicar**

Depois do feedback do founder, **três superfícies cortadas no v1 foram reabertas**:

1. Analytics + Performance de carrossel
2. Multi-marca (lista `/brands`)
3. Editorial

O sistema hoje é um **híbrido v1+**: core loop limpo + insights/editorial/multi-marca de volta, mantendo corte de agents, plugs, ads, marketplace, lifetime, etc.

| Dimensão | Estado |
|----------|--------|
| Produto (IA + menu) | **Operacional no código** |
| Core loop | **Implementado** |
| Features reabertas | **Implementadas** |
| Deploy no IP de teste | **Depende de rebuild/redeploy** (código local ≠ necessariamente o que está em produção/teste) |
| Verificação E2E M1–M4 | **Não fechada** (manual) |
| Higiene L3 (delete código morto) | **Pendente** |

---

## 2. Arquitetura de informação (menu logado)

### 2.1 Menu atual

| Seção | Item | Rota |
|-------|------|------|
| Estúdio | Início | `/` |
| Marca | Marcas | `/brands` |
| Criar | Content Swipe | `/swipe` |
| Criar | Gerar carrossel | `/generate` |
| Criar | Posts | `/posts` |
| Criar | Editorial | `/editorial` |
| Publicar | Calendário | `/publish` |
| Publicar | Canais | `/channels` |
| Insights | Analytics | `/analytics` |
| Insights | Performance | `/analytics/carousel` |
| Biblioteca | Mídia | `/media` |
| Conta | Assinatura | `/billing` |
| Conta | Configurações | `/settings` |

**Jobs:** fora do menu; indicador/drawer no topbar (`JobsIndicator`).

### 2.2 Home = Estúdio

`/` renderiza `StudioHome` — CTAs contextuais por estado de DNA / canais / jobs (não é calendário).

### 2.3 Redirects canônicos (next.config)

| De | Para | Motivo |
|----|------|--------|
| `/launches` | `/publish` | calendário |
| `/content-swipe` | `/swipe` | swipe |
| `/ai-generate-images` | `/generate` | carrossel |
| `/social-posts` (+ subpaths) | `/posts` | posts |
| `/brand` | `/brands` | multi-marca |
| `/onboarding/company`, `/onboarding/brand` | `/onboarding` | onboarding unificado |
| `/billing/lifetime` | `/billing` | sem lifetime deal |
| `/jobs` | `/` | jobs no topbar |
| `/agents`, `/plugs`, `/third-party`, `/template-marketplace`, `/affiliates` | `/` | fora do produto atual |

---

## 3. Superfícies do produto

### 3.1 CORE — ativas e no menu

| Superfície | Status | Notas |
|------------|--------|-------|
| Estúdio (`/`) | OK | Próximo passo contextual |
| Marcas (`/brands`, `/brands/[id]`) | OK (reaberto) | Lista + detalhe DNA |
| Content Swipe | OK | Descartar estável; Gerar mais; handoff ideia→estúdio |
| Gerar carrossel | OK | Brand DNA via bridge; prefill por query |
| Posts | OK | Import artigo embutido |
| Editorial | OK (reaberto) | API sem V1SurfaceGuard |
| Calendário / Publicar | OK | Re-skin de launches |
| Canais | OK | 5 redes no add |
| Analytics | OK (reaberto) | Platform analytics |
| Performance carrossel | OK (reaberto) | Dashboard + API |
| Mídia | OK | Library |
| Billing | OK | Free + Profissional na vitrine |
| Settings | OK | Tabs avançadas condicionais ao tier |
| Onboarding | OK | 6 steps, sem feature-tour |
| OnboardingGate | OK | Força wizard se sem marca/DNA |
| JobsIndicator | OK | Badge/drawer topbar |

### 3.2 SUPORTE / bridge

| Item | Status |
|------|--------|
| Brand DNA ↔ estúdio (`brand-company-bridge`) | OK |
| Import artigo `POST /article-import/generate` | OK (path corrigido no FE) |
| Prefill Swipe/onboarding → `/generate?topic&hook…` | OK |

### 3.3 FORA do produto atual (escondidas / gateadas)

| Feature | UI | API |
|---------|----|-----|
| Agents / Copilot | redirect `/` | — |
| Plugs | redirect `/` | — |
| Third-party (HeyGen etc.) | redirect `/` | V1SurfaceGuard |
| Template marketplace | redirect `/` | V1SurfaceGuard |
| Afiliados | redirect `/` | V1SurfaceGuard |
| Lifetime / crypto UI | billing limpo | lifetime endpoints gated |
| Ad creatives | stub/redirect | V1SurfaceGuard |
| Email campaigns | stub/redirect | V1SurfaceGuard |
| Video scripts | stub/redirect | V1SurfaceGuard |
| Webhooks | settings só se tier | V1SurfaceGuard |
| Auto Post | settings só se tier | V1SurfaceGuard |
| Public API / OAuth apps | settings só se tier | guards parciais |
| Jobs página | redirect `/` | backend ok via indicator |

**Importante:** código legado **ainda existe** no monorepo (não foi L3-delete). Esconder ≠ apagar.

### 3.4 Rotas que existem mas não estão no menu

Exemplos: `/ideas`, `/jobs`, `/ai-generate-images` (redirect), `/launches` (redirect), `/social-posts/*` cut.

---

## 4. Brand DNA e multi-marca

| Aspecto | Estado |
|---------|--------|
| Modelo | BrandProfile + BrandDnaSnapshot + assets |
| UI lista | `/brands` → BrandListPage |
| UI detalhe | `/brands/[id]` → BrandDetailPage |
| Atalho | `/brand` → `/brands` |
| Estúdio carrossel | lê DNA via /brands + DNA latest (bridge) |
| Limite create | planLimits.enforceLimit(brand_profile) |

### Limites de marcas por plano

| Plano | Marcas | Editorial plans |
|-------|--------|-----------------|
| FREE | 3 | 2 |
| STANDARD (Profissional) | 10 | 10 |
| PRO (grandfather) | 15 | 20 |
| TEAM (grandfather) | 20 | 30 |
| ULTIMATE (grandfather) | 50 | ilimitado (-1) |

---

## 5. Redes sociais

**Allowlist no add channel** (`V1_SOCIAL_ALLOWLIST`):

- Instagram (+ standalone)
- Facebook
- LinkedIn (+ page)
- X
- TikTok

Providers long-tail (Reddit, Discord, Slack, Mastodon, Bluesky, Nostr, etc.) **continuam no código** mas **não aparecem** em `getAllIntegrations()` para adicionar. Contas legadas já conectadas não são removidas automaticamente.

---

## 6. Billing e planos

### Vitrine (landing + intenção de venda)

| Plano | Preço | Map interno |
|-------|-------|-------------|
| Início | R$ 0 | FREE |
| Profissional | R$ 79/mês | STANDARD |

### Limits principais (FREE / STANDARD)

| Limit | Free | Profissional |
|-------|------|--------------|
| Canais | 1 | 5 |
| Marcas | 3 | 10 |
| DNA extractions/mês | 1 | 10 |
| Ideias/mês | 10 | 100 |
| Carrosséis/mês | 5 | 40 |
| Imagens IA/mês | 10 | 200 |
| Posts/mês | 15 | 300 |
| Editorial plans | 2 | 10 |
| webhooks / public_api / autoPost | off | off |
| team_members | false | false |

PRO / TEAM / ULTIMATE existem no backend para **grandfather**, não na landing.

Auth UI: email + Google + GitHub (+ Oauth genérico). **Sem Wallet/Farcaster** na tela de login.

---

## 7. Onboarding

Fluxo atual (`ONBOARDING_VERSION = 4`):

1. Welcome
2. Brand identity (nome + URL)
3. Analisar (job DNA)
4. Revisar DNA
5. Primeiro conteúdo (ideias / carrossel) — **antes** de OAuth
6. Canais (opcional)
7. Done → Estúdio

- Feature tour **removido**
- Gate global se incompleto e sem marca
- Canais não bloqueiam “done”

---

## 8. Content Swipe (estado recente)

| Comportamento | Status |
|---------------|--------|
| Aprovar / Descartar / Salvar | OK |
| Índice estável ao descartar em sequência | OK (fix 8b2048c) |
| Fila vazia → CTA “Gerar 10 ideias” | OK |
| Header “Gerar mais” | OK |
| Criar carrossel leva ideia no query string | OK |
| Estúdio preenche topic/hook/angle/goal | OK |

---

## 9. Backend — gates L2

`V1SurfaceGuard` ainda em:

- ad-creatives, email-campaigns, video-scripts
- affiliates, autopost, third-party, template-marketplace
- webhooks (+ integrations)
- oauth-app
- billing (endpoints lifetime/crypto seletivos)
- public API carousels/integrations (parcial)

**Removidos** (features reabertas):

- carousel-performance.controller
- editorial-plans.controller

---

## 10. Landing

- Headline alinhada ao loop DNA → publicar
- How-it-works em 4 passos
- Preços: Início + Profissional R$79
- Promessa: 5 redes (não 30), sem agents/API na vitrine

---

## 11. Dívida técnica e riscos

| Item | Severidade | Notas |
|------|------------|-------|
| Código cut ainda no monorepo | Média | L3 delete não feito |
| company-profiles legado ainda existe | Média | Bridge interno; endpoints legados vivos |
| Deploy ≠ git local | Alta p/ QA | Servidor de teste precisa rebuild |
| E2E M1–M4 não automatizado | Alta | Validação só manual |
| CheckPolicies ADMIN em alguns POST | Média | Pode bloquear user não-admin em create ideia/plano |
| Stripe/Cakto price IDs reais | Média | Depende de env/dashboard |
| Pages stub vs next redirect duplicados | Baixa | Redundante mas ok |
| Working tree suja (docs/docker extras) | Baixa | Artefatos fora do core |

---

## 12. Checklist de verificação recomendado

1. **M1** Conta nova → onboarding → URL → DNA revisado
2. **M2** Swipe: gerar ideias → descartar várias → gerar mais → criar carrossel **com prefill**
3. **M3** `/channels` só 5 redes; conectar uma
4. **M4** Agendar em `/publish`
5. **Multi-marca** criar 2ª marca em `/brands` (respeitando limite do plano)
6. **Editorial** abrir `/editorial`, criar plano
7. **Analytics** `/analytics` e `/analytics/carousel` carregam
8. Menu **não** mostra agents, plugs, affiliates, marketplace, lifetime
9. Import artigo em `/posts` ou `/generate` → `POST …/article-import/generate` ≠ 404
10. Landing preços = Free + R$79

---

## 13. Mapa “antes → agora”

| Antes (bagunça) | Agora |
|-----------------|-------|
| ~20 itens, 5 seções confusas | ~12 itens, seções Estúdio/Marca/Criar/Publicar/Insights/Biblioteca |
| Home = calendário | Home = Estúdio |
| Company Profile + Brand DNA | Brand DNA (+ bridge no estúdio) |
| 1 marca forçada no v1 | Multi-marca reaberto (limites por plano) |
| Analytics/Editorial cortados | Reabertos |
| 30+ redes no picker | 5 redes |
| 3 planos landing + 5 tiers | 2 na vitrine; tiers extras grandfather |
| Feature tour de ads/agents | Onboarding slim 6 steps |
| Swipe bugado no descartar | Índice estável + gerar mais |

---

## 14. Conclusão

O sistema **no repositório** está coerente como **ContentFlow v1+**:

- Loop DNA → Swipe → Criar → Publicar **funcional no código**
- Insights (Analytics + Performance) e Editorial **de volta**
- Multi-marca **de volta** com limites
- Superfícies de agência/dev **continuam fora** (escondidas + API gate)

**Não está “shipped validado”** até:

1. rebuild/deploy no ambiente que você testa, e
2. checklist da seção 12 passar no browser.

### Próximos passos sugeridos (ordem)

1. Deploy do `main` atual no servidor de teste
2. Rodar checklist §12 e abrir bugs pontuais
3. Revisar CheckPolicies ADMIN em fluxos de founder solo
4. Fase 3 higiene: apagar stubs/controllers órfãos quando o loop estiver estável
5. Alinhar copy de billing/landing com limites multi-marca novos (3/10 marcas)

---

*Gerado a partir do estado do código em 2026-07-19 — branch main.*
