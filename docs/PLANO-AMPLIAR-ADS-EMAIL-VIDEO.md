# Plano de Desenvolvimento Completo — Ampliar: Ads · E-mail · Video Scripts

**Produto:** ContentFlow  
**Data:** 2026-07-19  
**Status:** Must (Fases 0–3) **implementado** em 2026-07-19  
**Fase 4 (distribuição ESP/render):** backlog opcional — fora do Must  
**Depende de:** loop v1+ estável (DNA → Swipe → Carrossel → Publish)

---

## 0. Norte do plano

### Problema
Ads, E-mail e Video Scripts **já existem no monorepo** (services, Prisma, pages), mas:
- estão atrás de `V1SurfaceGuard` + `CheckPolicies(ADMIN)`
- vivem em rotas órfãs (`/social-posts/...`)
- não entram no loop da ideia/carrossel
- a saída (export/teleprompter/preview) não é o centro da UX

### Objetivo
Tornar as três features **extensões do mesmo DNA + da mesma ideia**, com time-to-first-win &lt; 2 min e saída óbvia (export/uso real) — sem virar ESP, Ads Manager ou editor de vídeo.

### Frase de produto
> Você aprovou uma ideia (ou gerou um carrossel). Em um clique, vira **kit de anúncio**, **sequência de e-mail** ou **roteiro de Reels** — com a cara da marca.

### Não-objetivos (fase deste plano)
- Media buying / billing de mídia Meta
- Envio de e-mail (deliverability)
- Render cinematográfico in-house
- Agents, plugs, marketplace

### Metáfora de IA
```text
DNA
  → Swipe (aprova ideia)
      → Carrossel / Post          (já existe)
      → Anúncio (kit + export)    ← este plano
      → E-mail / welcome          ← este plano
      → Roteiro Reels/TikTok      ← este plano
  → Publicar orgânico / Exportar pago & e-mail
```

---

## 1. Estado atual no código (baseline)

### Backend

| Feature | Controller | Service | Models Prisma |
|---------|------------|---------|---------------|
| Ads | `ad-creatives.controller.ts` + **V1SurfaceGuard** + ADMIN | `AdCreativeGenerateService` | `AdCreative` |
| E-mail | `email-campaigns.controller.ts` + **V1SurfaceGuard** + ADMIN | `EmailCampaignGenerateService` + `EmailCampaignService` | `EmailCampaign` |
| Vídeo | `video-scripts.controller.ts` + **V1SurfaceGuard** + ADMIN | `ShortVideoService` | `ShortVideoProject` |

Handoff de fonte **já suportado nos services**:
- Ads / E-mail: `brandProfileId` + `contentIdeaId` | `carouselProjectId` | objective
- Vídeo: `brandProfileId` + `carouselProjectId` (+ `contentIdeaId` opcional); generate lega a carrossel

Extras existentes:
- Ads: `adTemplateRegistry`, `ad-policy-checker`, export
- E-mail: welcome sequence, export HTML
- Vídeo: generate-script, download JSON na UI

### Frontend

| Feature | Page component | FE service |
|---------|----------------|------------|
| Ads | `social-posts/ad-creatives-page.component.tsx` + `ads/*` | `ads.service.ts` |
| E-mail | `social-posts/email-campaigns-page.component.tsx` | fetch direto |
| Vídeo | `social-posts/video-scripts-page.component.tsx` | fetch direto |

Rotas antigas: `/social-posts/ad-creatives`, `/email-campaigns`, `/video-scripts` (hoje stub/redirect cut).

---

## 2. Princípios de execução

1. **Handoff &gt; menu** — CTAs no Swipe/carrossel antes de item hero no menu.  
2. **Esconder → destravar → handoff → qualidade de saída → distribuição.**  
3. **Founder solo** — zero path feliz com role ADMIN.  
4. **Uma marca selecionada** como default; multi-marca só seletor.  
5. **Done = arquivo/ação usável**, não “salvo no banco”.  
6. **Limits no plano** antes de abrir o torneira de tokens.  
7. **Não reescrever** engines de generate; polir UX + permissões + handoff + export.  
8. **Métrica norte:** % de gerações com `contentIdeaId` ou `carouselProjectId` ≥ 70% após 2 semanas.

---

## 3. Arquitetura alvo

### 3.1 Rotas canônicas

| Feature | Rota nova | Redirect old |
|---------|-----------|--------------|
| Ads | `/ads` | `/social-posts/ad-creatives` → `/ads` |
| E-mail | `/email` | `/social-posts/email-campaigns` → `/email` |
| Vídeo | `/video` | `/social-posts/video-scripts` → `/video` |

Query de handoff (padrão único):

```text
/ads?from=swipe&ideaId=&projectId=&brandId=&topic=&hook=&angle=&goal=&objective=
/email?from=swipe&ideaId=&projectId=&brandId=&topic=&type=WELCOME_SEQUENCE|PROMOTIONAL|NEWSLETTER
/video?from=carousel&projectId=&ideaId=&brandId=&format=9x16&duration=30
```

### 3.2 Menu (faseada)

**Fase 1 (handoff only):** sem item top-level obrigatório; deep links + CTAs.  
**Fase 2:** grupo **Ampliar** no menu Criar:

```text
CRIAR
  · Content Swipe
  · Gerar carrossel
  · Posts
  · Editorial
  · Anúncios          /ads
  · E-mail            /email
  · Roteiro de vídeo  /video
```

Ordem no menu: Swipe primeiro; Ampliar abaixo.

### 3.3 Componente compartilhado: `AmpliarActions`

Novo: `apps/frontend/src/components/ampliar/ampliar-actions.component.tsx`

Props:
```ts
{
  brandId: string;
  ideaId?: string;
  carouselProjectId?: string;
  topic?: string;
  hook?: string;
  angle?: string;
  goal?: string;
  compact?: boolean; // botões ícone no card do swipe
}
```

Gera `URLSearchParams` e `router.push` para `/ads|/email|/video`.

Usado em:
- `content-swipe.component.tsx` (ideia APPROVED ou card atual)
- estúdio carrossel (após plan pronto) — botão na toolbar
- `studio-home.component.tsx` (último conteúdo)
- opcional: editorial slot

### 3.4 Prefill hook compartilhado

Novo: `apps/frontend/src/components/ampliar/use-ampliar-prefill.ts`

- Lê `useSearchParams`
- Normaliza brand/idea/project/topic/hook
- Expõe `{ prefill, hasSource, clearPrefillFromUrl }`
- Mesmo padrão do prefill Swipe→Generate

---

## 4. Fases de implementação

---

### FASE 0 — Destravar acesso (1–2 dias)

**Meta:** founder logado chama as 3 APIs e abre as 3 UIs sem 404/FEATURE_DISABLED/403 ADMIN.

#### 0.1 Backend permissions

Arquivos:
- `apps/backend/src/api/routes/ad-creatives.controller.ts`
- `apps/backend/src/api/routes/email-campaigns.controller.ts`
- `apps/backend/src/api/routes/video-scripts.controller.ts`

Tarefas:
1. Remover `@UseGuards(V1SurfaceGuard)` e imports.
2. Em endpoints de generate/save/export/update:
   - Trocar `Sections.ADMIN` por a mesma section usada em carrossel/ideias  
     (preferência: `Sections.CHANNEL` ou section de conteúdo já liberada ao org member — **auditar** `permission.exception.class` e espelhar `carousel-projects` / `content-ideas`).
3. GET list/templates: permitir Read para membro da org (sem ADMIN).
4. Manter validação de ownership de `brandProfileId` nos services (já existe).

#### 0.2 Rotas frontend

Criar (conteúdo real, não stub):

```text
apps/frontend/src/app/(app)/(site)/ads/page.tsx
  → AdCreativesPage (reexport ou wrapper fino)

apps/frontend/src/app/(app)/(site)/email/page.tsx
  → EmailCampaignsPage

apps/frontend/src/app/(app)/(site)/video/page.tsx
  → VideoScriptsPage
```

`next.config.js`:
- Remover redirects que mandam social-posts cut para `/posts` **apenas** se engolirem ads/email/video — hoje `/social-posts/:path* → /posts` **quebra** deep links antigos; ajustar para:
  - `/social-posts/ad-creatives` → `/ads`
  - `/social-posts/email-campaigns` → `/email`
  - `/social-posts/video-scripts` → `/video`
  - resto de `/social-posts` → `/posts`

#### 0.3 Pages legadas

- Restaurar ou redirecionar stubs em `social-posts/ad-creatives|email-campaigns|video-scripts`.

#### 0.4 Smoke

- [ ] `GET /ad-creatives/templates` 200 (user não-admin)
- [ ] `GET /email-campaigns` 200
- [ ] `GET /video-scripts` 200
- [ ] Abrir `/ads`, `/email`, `/video` logado

**Done quando:** UIs abrem e listam vazio sem erro de gate.

---

### FASE 1 — Handoff no loop (3–5 dias) ← maior ROI

**Meta:** &gt;70% das gerações partem de ideia ou carrossel; zero brief longo no happy path.

#### 1.1 `AmpliarActions` + prefill hook

Arquivos novos:
- `components/ampliar/ampliar-actions.component.tsx`
- `components/ampliar/use-ampliar-prefill.ts`
- `components/ampliar/ampliar.types.ts`
- `components/ampliar/build-ampliar-url.ts` (puro, testável)

#### 1.2 Swipe

Arquivo: `content-ideas/content-swipe.component.tsx`

- No card atual (e/ou após Aprovar): grupo **Ampliar**  
  `Anúncio` | `E-mail` | `Roteiro`
- Se status ainda NEW: opcional “Aprovar e ampliar” ou permitir ampliar direto (marcar USED/APPROVED em background).
- Decisão de produto: **permitir ampliar a partir de NEW** (menos fricção) e marcar ideia `APPROVED` ou `USED` ao gerar.

#### 1.3 Estúdio carrossel

Arquivos:
- `ai-generate/ai-generate-images.component.tsx` (toolbar)
- ou painel pós-plan em `ai-generate-images-planning-form.tsx`

Quando `plan` existe:
- CTAs Ampliar com `carouselProjectId` se houver; senão passar `topic` + slides resumidos via `sessionStorage` key `cf-ampliar-carousel-draft` (fallback se project ainda não persistido).

#### 1.4 Prefill nas 3 pages

Cada page no mount:
1. `useAmpliarPrefill()`
2. Preenche brand, nome da campanha (`topic`), context fields
3. Se `hasSource`, destaca banner: “A partir da ideia: {topic}” + botão Gerar primário
4. Empty state sem source: “Aprove uma ideia no Swipe ou abra um carrossel — ou preencha manualmente”

#### 1.5 Estúdio home

`studio-home.component.tsx`:
- Se último job/carrossel/ideia recente → card “Ampliar último conteúdo”
- Senão ocultar

#### 1.6 Video: permitir ideia sem carrossel (gap atual)

Hoje `ShortVideoService.createProject` exige `carouselProjectId`.

Tarefas:
1. Tornar `carouselProjectId` **opcional** no DTO + service.
2. Se só `contentIdeaId`: montar brief da ideia (title/hook/angle) no generateScript.
3. FE: handoff do Swipe para `/video` sem project funciona.

Arquivos:
- `dtos/short-video/create-short-video-project.dto.ts`
- `short-video.service.ts` / repository
- `video-scripts.controller.ts` body generate
- schema Prisma: se FK obrigatória, migration tornar nullable

#### 1.7 Jobs

- Garante que generate ads/email/video criam `GenerationJob` (ads/email já logam job — verificar vídeo).
- `JobsIndicator` já global; validar deep link para resultado se houver `resultPath`.

**Done quando:**
- [ ] Swipe → Anúncio gera com DNA+ideia sem re-digitar
- [ ] Carrossel → Roteiro gera cenas
- [ ] Swipe → Welcome sequence com brand preenchida
- [ ] Vídeo funciona só com ideaId

---

### FASE 2 — Qualidade de saída (1–2 semanas)

**Meta:** cada feature tem um “done” óbvio e preview confiável.

#### 2.1 Ads — kit de campanha

Prioridade de UX (reusar page atual, não rewrite):

| Item | Detalhe |
|------|---------|
| Banner de origem | ideia/carrossel |
| Default generate | 3 variantes, objective TRAFFIC ou conversão default |
| Preview feed | card estilo IG/FB/LinkedIn (primary text, headline, description, CTA) |
| Policy warnings | UI já parcial — tornar bloqueante suave (warn antes export) |
| Variantes A/B | listar hooks lado a lado; “usar este” |
| Export | botão primário: JSON/CSV Meta + copiar primary text; ZIP se houver assets |
| Salvar batch | fluxo save atual pós-generate |

Arquivos:
- `ad-creatives-page.component.tsx`
- `ads/ads.service.ts` (export helpers)
- novo `ads/ad-preview-card.tsx`
- novo `ads/ad-export.ts` (client-side CSV)

Backend (só se faltar):
- Endpoint export batch se só unitário existir
- Garantir policy warnings no response de generate

**Aceite Ads:**
- [ ] 3 criativos em &lt; 2 min a partir de ideia
- [ ] Preview legível
- [ ] Export baixa arquivo usável
- [ ] Policy warning visível se claim arriscado

#### 2.2 E-mail — sequência + export

| Item | Detalhe |
|------|---------|
| Atalhos tipo | Welcome (1-click) · Promo da ideia · Newsletter |
| Welcome default | 4 e-mails, delays D0/D2/D5/D9 sugeridos na UI |
| Preview | iframe `srcDoc` já existe — mobile/desktop toggle |
| Editor mínimo | subject, preheader, ctaText, ctaUrl editáveis antes export |
| Export | HTML download (já existe) + copiar plain-text + copiar subject |
| DNA visual | primaryColor/secondaryColor do DNA no generate (service já puxa DNA — validar prompt) |

Arquivos:
- `email-campaigns-page.component.tsx`
- opcional extrair `email-preview.tsx`, `email-welcome-cta.tsx`

**Aceite E-mail:**
- [ ] Welcome 4 e-mails gerados e listados
- [ ] Preview HTML renderiza
- [ ] Export .html baixa
- [ ] Promo a partir de ideaId preenche nome/assunto seed

#### 2.3 Vídeo — teleprompter + caption

| Item | Detalhe |
|------|---------|
| Formatos | 15s / 30s / 60s chips |
| Cenas | duration, fala, texto na tela, nota visual |
| **Teleprompter mode** | fullscreen, fonte grande, auto-scroll opcional, next scene |
| Caption | bloco copiável + hashtags |
| Export | TXT roteiro + JSON (já tem JSON) + “copiar tudo” |
| A partir carrossel | mapear slide→cena na UI (label “Slide 2 → Cena 2”) |

Arquivos:
- `video-scripts-page.component.tsx`
- novo `video/teleprompter.component.tsx`
- novo `video/video-script-export.ts`

Backend:
- generateScript aceita `targetDurationSec`, `format`, idea-only brief (Fase 1.6)

**Aceite Vídeo:**
- [ ] Roteiro 30s a partir de carrossel
- [ ] Teleprompter usável no mobile width
- [ ] Caption copiada em 1 clique
- [ ] Idea-only path funciona

#### 2.4 Empty states e erros

Padrão page-system:
- Sem brand → CTA `/brands`
- Sem source e lista vazia → CTA Swipe
- Erro de limit → CTA billing
- Loading via JobsIndicator + botão disabled

**Done quando:** checklist 2.1–2.3 verde em conta Free de teste.

---

### FASE 3 — Limits, billing, menu, landing (3–5 dias)

#### 3.1 Pricing + plan-limits

Arquivo: `pricing.ts` + `plan-limits.service.ts`

Novos campos (ou reutilizar contadores se já existirem no schema de usage):

| Limit | FREE | STANDARD |
|-------|------|----------|
| `ad_kits_per_month` | 3 | 30 |
| `email_campaigns_per_month` | 2 | 20 |
| `video_scripts_per_month` | 3 | 40 |

Enforce nos services generate (antes de gastar LLM):
- `enforceLimit(orgId, 'ad_kit' | 'email_campaign' | 'video_script')`

Se usage tracking não existir:
1. Contar rows criados no mês por org (`AdCreative`, `EmailCampaign`, `ShortVideoProject`)
2. Ou estender tabela de usage existente — **preferir padrão já usado por carousel_generations**

#### 3.2 UI billing

- `main.billing.component.tsx`: listar os 3 limits no card Free/Pro
- Landing constants: **não** hero de ads; bullet secundário “Amplie ideia em anúncio, e-mail e Reels” só se Fase 2 done

#### 3.3 Menu

- Incluir 3 itens sob Criar (ou subnav Ampliar)
- `top.menu.tsx` + `MENU_SECTIONS`

#### 3.4 i18n

- Chaves pt/en mínimas para labels Ampliar, empty states, exports

**Done quando:** Free bloqueia no 4º ad kit com mensagem clara; menu mostra as 3 rotas.

---

### FASE 4 — Distribuição leve (opcional, 1–2 semanas, só com uso)

Só iniciar se métrica handoff &gt; 50% e tickets de “e agora?”.

| Track | Escopo |
|-------|--------|
| E-mail | 1 integração export-push: Brevo **ou** Mailchimp (OAuth + create campaign draft) |
| Vídeo | Render simples: cenas como slides + legenda queimada **ou** export CapCut subtitle file |
| Ads | Melhorar CSV no formato Advantage+ / bulk import Meta; templates por objective |

Fora de escopo até receita:
- ESP completo, pixel, bid management, editor timeline

---

### FASE 5 — Hardening (contínuo após Fase 2)

1. Testes unitários services (já há specs ads/email — estender idea-only video).  
2. Teste e2e playwright smoke: swipe → ads generate mock.  
3. Rate limit / cost estimate nos 3 generates.  
4. Observabilidade: log `source=idea|carousel|manual` por generate.  
5. Revisar prompts para forbidden words do DNA em ads/email/video.  
6. A11y teleprompter e previews.

---

## 5. Ordem de implementação recomendada (sprint board)

```text
Sprint A (Fase 0)     ████░░░░░░  Destravar API + rotas
Sprint B (Fase 1)     ████████░░  AmpliarActions + prefill + video idea-only
Sprint C (Fase 2a)    ████████░░  Video teleprompter + email welcome UX
Sprint D (Fase 2b)    ████████░░  Ads preview + export
Sprint E (Fase 3)     ██████░░░░  Limits + menu + billing copy
Sprint F (Fase 4)     ░░ opcional Distribuição
```

**Ordem de valor para o ICP dentro da Fase 2:**  
1) Vídeo (reuso semanal) → 2) E-mail welcome (one-shot alto valor) → 3) Ads kit (quando já posta).

---

## 6. Breakdown por arquivo (checklist de PR)

### PR1 — Ungate
- [ ] `ad-creatives.controller.ts`
- [ ] `email-campaigns.controller.ts`
- [ ] `video-scripts.controller.ts`
- [ ] `next.config.js` redirects
- [ ] `app/.../ads/page.tsx`
- [ ] `app/.../email/page.tsx`
- [ ] `app/.../video/page.tsx`

### PR2 — Handoff core
- [ ] `components/ampliar/*`
- [ ] `content-swipe.component.tsx`
- [ ] `studio-home.component.tsx`
- [ ] prefill em 3 pages
- [ ] short-video DTO/service nullable carousel + idea brief

### PR3 — Video quality
- [ ] `teleprompter.component.tsx`
- [ ] polish `video-scripts-page.component.tsx`
- [ ] export TXT/caption

### PR4 — Email quality
- [ ] welcome 1-click UX
- [ ] preview mobile/desktop
- [ ] copy subject + plain text

### PR5 — Ads quality
- [ ] `ad-preview-card.tsx`
- [ ] export CSV/JSON
- [ ] policy UI

### PR6 — Monetization surface
- [ ] `pricing.ts` + plan-limits
- [ ] enforce nos 3 services
- [ ] billing UI + menu

---

## 7. Modelo de dados / migrations

| Mudança | Necessária? | Notas |
|---------|-------------|-------|
| `ShortVideoProject.carouselProjectId` nullable | **Sim** (Fase 1) | idea-only path |
| Usage counters ads/email/video | Sim se não houver | ou count queries |
| Novos models | Não | reusar `AdCreative`, `EmailCampaign`, `ShortVideoProject` |
| Drop V1 guard table | Não | |

Migration nome sugerido: `YYYYMMDD_short_video_carousel_optional`

---

## 8. Permissões — regra única

| Ação | Quem |
|------|------|
| Listar templates / campanhas / projetos | qualquer member da org |
| Generate / save / export / delete próprio | member da org + ownership brand |
| Superadmin only | nada neste fluxo |

Auditar `Sections` enum; se não houver section ideal, usar a mesma de `POST /content-ideas` ou `POST /carousel-projects`.

---

## 9. UX copy (pt-BR) — referência

| Contexto | Copy |
|----------|------|
| CTA Swipe | Ampliar |
| Ads button | Anúncio |
| Email button | E-mail |
| Video button | Roteiro |
| Banner prefill | A partir da ideia: “{title}” |
| Empty ads | Transforme uma ideia aprovada em criativos prontos pro Meta e LinkedIn. |
| Empty email | Gere uma sequência de boas-vindas com o DNA da marca e exporte HTML. |
| Empty video | Vire carrossel ou ideia em roteiro de Reels com teleprompter. |
| Export ads | Baixar kit |
| Export email | Baixar HTML |
| Export video | Abrir teleprompter |
| Limit hit | Você atingiu o limite do plano Início. Faça upgrade para continuar ampliando. |

---

## 10. Observabilidade e métricas de produto

Instrumentar (analytics interno ou logs estruturados):

```text
ampliar.cta_clicked { surface: swipe|carousel|studio, target: ads|email|video }
ampliar.generate_started { target, source: idea|carousel|manual }
ampliar.generate_succeeded { target, latency_ms, variants }
ampliar.export_clicked { target, format }
ampliar.limit_blocked { target, plan }
```

Dashboard mínimo semanal:
- gerações por target
- % com source ≠ manual
- exports / gerações (qualidade de “done”)
- conversão Free→Pro após limit block (se billing evento existir)

---

## 11. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Custo LLM explode | limits mensais + batch size cap (ads máx 5) |
| ADMIN policies esquecidas em 1 endpoint | checklist PR1 + teste user role USER |
| Video quebra sem carousel | migration nullable + testes |
| Menu poluído | Fase 1 sem menu; Fase 3 só após handoff |
| Expectativa de “publicar ads” | copy de export; empty state honesto |
| Qualidade genérica GPT | sempre injetar DNA + forbidden + idea hook no prompt (já parcial — auditar) |
| Conflito redirect `/social-posts/:path*` | redirects específicos antes do catch-all |
| Deploy desatualizado | checklist pós-deploy §13 |

---

## 12. Critérios de aceite globais (Definition of Done do plano)

### Must (ship Ampliar v1)
1. User não-admin gera ad kit, welcome email e video script.  
2. Swipe → cada um dos 3 targets com prefill.  
3. Carrossel → video script.  
4. Exports: ads arquivo, email HTML, video teleprompter + caption.  
5. Limits Free aplicados.  
6. Menu ou CTAs descobráveis; JobsIndicator mostra running.  
7. Sem V1SurfaceGuard nos 3 controllers.  
8. DNA usado (tom/cores/forbidden) de forma verificável no output.

### Should
9. % generate com source idea/carousel &gt; 70% em staging test script.  
10. Preview ads + email mobile.  
11. Billing lista os 3 limits.

### Could (Fase 4)
12. 1 ESP push.  
13. Render vídeo básico.

---

## 13. Checklist de QA manual

### Prep
- [ ] Conta Free com DNA ACTIVE e 1 ideia NEW  
- [ ] 1 carrossel salvo (project id)  
- [ ] User role não-admin  

### Fluxos
- [ ] `/ads` abre; generate manual com brand  
- [ ] Swipe → Anúncio → banner prefill → generate → 3 variantes → export  
- [ ] Swipe → E-mail → Welcome → 4 items → preview → HTML  
- [ ] Swipe → Roteiro (sem carrossel) → cenas → teleprompter  
- [ ] Carrossel studio → Roteiro → cenas ligadas a slides  
- [ ] Estúdio home “Ampliar último”  
- [ ] 4º ad kit no Free → erro de limit + CTA billing  
- [ ] Policy warning em ad com claim absoluto (se fixture)  
- [ ] Mobile width teleprompter  
- [ ] Deep link antigo `/social-posts/ad-creatives` → `/ads`  

### Regressão v1+
- [ ] Swipe descartar / gerar mais  
- [ ] Swipe → carrossel prefill  
- [ ] Editorial / analytics / multi-marca intactos  
- [ ] Canais ainda 5 redes  

---

## 14. Estimativa de esforço

| Fase | Esforço | Dependências |
|------|---------|--------------|
| 0 Destravar | 1–2 dias | — |
| 1 Handoff | 3–5 dias | Fase 0 |
| 2 Qualidade | 5–10 dias | Fase 1 |
| 3 Limits/menu | 3–5 dias | Fase 2 (pode paralelizar limits cedo) |
| 4 Distribuição | 5–10 dias | Uso real |
| **Total Must (0–3)** | **~2,5–4 semanas** | 1 dev full-stack focado |

Paralelo possível: Fase 2 video/email/ads em 3 streams após AmpliarActions existir.

---

## 15. Sequência de commits sugerida

```text
feat(ampliar): ungate ads/email/video APIs and add canonical routes
feat(ampliar): shared AmpliarActions + prefill handoff from swipe/carousel
feat(video): allow idea-only scripts + teleprompter mode
feat(email): welcome one-click UX + export polish
feat(ads): feed preview + kit export (csv/json)
feat(ampliar): plan limits + menu + billing copy
```

---

## 16. Decisões abertas (fechar antes/durante Fase 1)

| # | Decisão | Recomendação default |
|---|---------|----------------------|
| D1 | Ampliar exige ideia APPROVED? | Não — aceitar NEW e marcar APPROVED/USED ao gerar |
| D2 | Menu na Fase 1? | Não; só CTAs |
| D3 | Video sem carrossel | Sim (nullable FK) |
| D4 | Ads gera imagem paga automaticamente? | Não na v1 Ampliar — copy+prompt; imagem opcional depois |
| D5 | Qual ESP primeiro na Fase 4? | Brevo (API simples, BR-friendly) |
| D6 | Section de permission | Espelhar content-ideas/carousel |

---

## 17. Apêndice — mapa de arquivos críticos

```text
Backend
  apps/backend/src/api/routes/ad-creatives.controller.ts
  apps/backend/src/api/routes/email-campaigns.controller.ts
  apps/backend/src/api/routes/video-scripts.controller.ts
  libraries/.../ai-generate/ad-creative-generate.service.ts
  libraries/.../ai-generate/email-campaign-generate.service.ts
  libraries/.../ai-generate/ad-templates/*
  libraries/.../database/prisma/short-video/*
  libraries/.../database/prisma/email-campaigns/*
  libraries/.../database/prisma/subscriptions/pricing.ts
  libraries/.../database/prisma/subscriptions/plan-limits.service.ts

Frontend
  apps/frontend/src/components/ads/*
  apps/frontend/src/components/social-posts/ad-creatives-page.component.tsx
  apps/frontend/src/components/social-posts/email-campaigns-page.component.tsx
  apps/frontend/src/components/social-posts/video-scripts-page.component.tsx
  apps/frontend/src/components/content-ideas/content-swipe.component.tsx
  apps/frontend/src/components/studio/studio-home.component.tsx
  apps/frontend/src/components/ai-generate/*
  apps/frontend/src/components/layout/top.menu.tsx
  apps/frontend/next.config.js
  apps/frontend/src/app/(app)/(site)/{ads,email,video}/page.tsx  (criar)
  apps/frontend/src/components/ampliar/*  (criar)
```

---

## 18. Resumo executivo

| Pergunta | Resposta |
|----------|----------|
| Reescrever engines? | **Não** |
| Só tirar o guard? | **Não** — sem handoff ninguém usa |
| O que desbloqueia uso? | **CTA Ampliar no Swipe/carrossel + export óbvio** |
| Ordem de polish | Vídeo → E-mail → Ads |
| Tempo até ship usável | **~3 semanas** (Fases 0–3) |
| Risco principal | permissions ADMIN + redirect social-posts catch-all + video FK obrigatória |

**Definição de pronto deste plano:**  
um founder com DNA e uma ideia no Swipe gera, em menos de dois minutos cada, (1) kit de anúncio exportável, (2) welcome HTML, (3) roteiro com teleprompter — sem ser admin e sem reescrever o brief.

---

*Documento vivo — atualizar checkboxes conforme PRs mergearem.*
