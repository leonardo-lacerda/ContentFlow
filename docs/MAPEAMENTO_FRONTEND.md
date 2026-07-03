# MAPEAMENTO COMPLETO DO FRONTEND NEXT.JS — ContentFlow

> Gerado em 02/07/2026. Abrange todas as rotas, componentes, hooks, stores, APIs e formulários do frontend.

---

## 1. ESTRUTURA DE ROTAS (App Router)

O frontend utiliza **Next.js App Router** com **5 grupos de rotas** principais:

```
src/app/
├── (app)/           ← App autenticado
│   ├── (site)/      ← Páginas internas (sidebar + layout)
│   ├── (preview)/   ← Preview público de posts
│   ├── auth/        ← Login, registro, forgot, ativação
│   ├── integrations/← Callbacks de OAuth social
│   ├── oauth/       ← Autorização OAuth de apps
│   └── api/         ← API routes do Next.js
├── (landing)/       ← Landing page pública + SEO
├── (extension)/     ← Extensão Chrome
├── (provider)/      ← WebView bridge (app mobile)
└── global-error.tsx ← Error boundary global (Sentry)
```

---

## 2. GRUPO `(app)` — APP AUTENTICADO

### 2.1 Layout Raiz: `/(app)/layout.tsx`

| Aspecto | Detalhe |
|---------|---------|
| **Fonte** | Plus Jakarta Sans (500, 600) |
| **Providers** | `VariableContextComponent`, `SentryComponent`, `LayoutContext`, `PHProvider` (PostHog), `PlausibleProvider` |
| **Analytics** | Dub Analytics, Facebook Pixel, PostHog, Plausible, DataFast |
| **i18n** | Cookie-based (`cookieName`), fallback language |
| **Variáveis de ambiente** | 30+ vars: backend URL, Stripe, Cloudflare, Telegram bot, Sentry DSN, Transloadit, extension ID, etc. |

---

### 2.2 Subgrupo `(site)` — Páginas Internas

#### Layout: `/(site)/layout.tsx`
- **Componente**: `LayoutComponent` (sidebar + top menu + content area)
- Wraps children com sidebar, menu lateral e barra superior

#### Tabela de Rotas

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/ai-generate-images` | `AiGenerateImagesComponent` | **Estúdio de IA** — planejamento, geração de imagens, slides, captions, direção visual, review editorial, templates |
| `/editorial` | `EditorialPlanPage` | **Calendário Editorial** — criar/editar planos, slots, gerar calendário com IA, auto-geração |
| `/content-swipe` | `ContentSwipePage` | **Content Swipe** — aprovar/rejeitar ideias de carrossel estilo Tinder |
| `/brands` | `BrandListPage` | **Lista de Marcas** — CRUD de perfis de marca |
| `/brands/[id]` | `BrandDetailPage` | **Detalhe da Marca** — edição de Brand DNA, assets, snapshots |
| `/social-posts` | `SocialPostsPage` | **Social Posts** — gerar posts otimizados por plataforma |
| `/social-posts/ad-creatives` | `AdCreativesPage` | **Ad Creatives** — gerar criativos para Meta/LinkedIn ads |
| `/social-posts/email-campaigns` | `EmailCampaignsPage` | **Email Campaigns** — newsletter, welcome, promo com IA |
| `/social-posts/video-scripts` | `VideoScriptsPage` | **Video Scripts** — roteiros de vídeo curto a partir de carrosséis |
| `/analytics` | `PlatformAnalytics` | **Analytics** — métricas das plataformas conectadas |
| `/analytics/carousel` | `CarouselPerformanceDashboard` | **Performance de Carrosséis** — dashboard, top performers, tendências |
| `/billing` | `BillingComponent` | **Billing** — assinatura, planos, cobrança |
| `/billing/lifetime` | `LifetimeDeal` | **Lifetime Deal** — compra vitalícia |
| `/settings` | `SettingsPopup` | **Configurações** — perfil, notificações, teams, API keys |
| `/media` | `MediaLayoutComponent` | **Biblioteca de Mídia** — upload, gerenciamento de arquivos |
| `/plugs` | `Plugs` | **Plugs** — integrações internas do sistema |
| `/agents` | `Agent` (layout) | **Agentes IA** — redireciona para `/agents/new` |
| `/agents/[id]` | `AgentChat` | **Chat com Agente** — interface de conversa com IA |
| `/jobs` | `JobsListPage` | **Jobs de Geração** — acompanhar status de jobs assíncronos |
| `/template-marketplace` | `TemplateMarketplacePage` | **Marketplace de Templates** — descobrir/instalar templates de carrossel |
| `/third-party` | `ThirdPartyComponent` | **Integrações** — HeyGen e outras integrações third-party |
| `/affiliates` | `AffiliatesPage` | **Afiliados** — programa de indicação |
| `/onboarding/brand` | `OnboardingWizard` | **Onboarding Marca** — wizard de configuração de marca |
| `/onboarding/company` | `CompanyOnboardingComponent` | **Onboarding Empresa** — wizard de cadastro de empresa |
| `/launches` | redirect → `/analytics` | **LEGADO** — redireciona para analytics |
| `/err` | Mensagem estática | **Erro** — página de erro genérica |
| `/admin/errors` | `AdminErrorsComponent` | **Admin Errors** — painel de erros (SUPERADMIN) |

---

### 2.3 Subgrupo `(preview)` — Preview Público

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/p/[id]` | Server Component inline | **Preview de Post** — renderização pública com conteúdo, imagens, vídeo, comentários |

- **Layout**: `PreviewWrapper` com fundo preto
- **Componentes**: `CommentsComponents`, `CopyClient`, `RenderPreviewDateClient`, `VideoOrImage`, `SafeImage`
- **API**: `GET /public/posts/{id}` (server-side)
- **SEO**: Metadata dinâmico

---

### 2.4 Rotas de Auth (`/auth`)

#### Layout: `/(app)/auth/layout.tsx`
- Split-screen: branding ContentFlow à esquerda, formulário à direita
- Features showcase, prova social ("20k+ empreendedores")
- `ReturnUrlComponent`, `LogoTextComponent`
- Links: Onboarding

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/auth` | `Register` | **Registro** — cadastro com email/senha |
| `/auth/login` | `Login` | **Login** — autenticação |
| `/auth/forgot` | `Forgot` | **Esqueceu Senha** — solicitação de reset |
| `/auth/forgot/[token]` | `ForgotReturn` | **Reset Senha** — definição de nova senha |
| `/auth/activate` | `Activate` | **Ativação** — solicitação de ativação |
| `/auth/activate/[code]` | `AfterActivate` | **Pós-Ativação** — confirmação |
| `/auth/login-required` | Mensagem estática | **Login Obrigatório** — para geração de API code |

**Provedores OAuth**: Google, GitHub, Farcaster, Wallet (Web3), OAuth genérico

**Lógica especial**: Se `DISABLE_REGISTRATION=true`, checa `/auth/can-register` — se não pode registrar, mostra apenas `LoginWithOidc`

---

### 2.5 Integração Social (`/integrations/social`)

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/integrations/social/[provider]` | `ContinueIntegration` | **Callback OAuth** — processa retorno de integração social |

- Layout: fundo escuro simples
- Lê cookie `auth` para verificar login
- Forward `searchParams` e `provider` para o componente

---

### 2.6 OAuth Authorization (`/oauth/authorize`)

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/oauth/authorize` | `OAuthAuthorizePage` (client) | **Autorização OAuth** — aprovar/deniar acesso de apps |

- Layout: fundo escuro + `Logo`
- Fluxo: GET `/oauth/authorize` para validar → POST para approve/deny → redirect
- Suporta `response_type=code`, `client_id`, `state`
- UI: Loading spinner, error state, approve/deny buttons

---

### 2.7 API Route

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/uploads/[[...path]]` | GET | **Proxy de Uploads** — serve arquivos do `UPLOAD_DIRECTORY` local com streaming |

- Usa `createReadStream`, `mime` para content-type
- Cache: `public, max-age=31536000, immutable`

---

## 3. GRUPO `(landing)` — LANDING PAGE PÚBLICA

### Layout: `/(landing)/layout.tsx`
- HTML standalone (sem providers internos)
- Fontes: Fraunces + Inter (Google Fonts)
- CSS: `/landing-styles.css`
- Metadata: PT-BR SEO otimizado

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/` | Client Component inline | **Landing Page** — hero, recursos, formatos, como funciona, galeria, comparação, preços, FAQ |
| `/docs/integrations` | Server Component inline | **Docs de Integração** — API REST, endpoints, webhooks, automações (Make/Zapier/n8n) |
| `/seo/[slug]` | Server Component inline | **SEO Clusters** — 6 páginas otimizadas para keywords específicas |

**SEO Slugs**:
- `carrossel-instagram` — Gerador de Carrossel para Instagram
- `carrossel-linkedin` — Gerador de Carrossel para LinkedIn
- `calendario-editorial` — Calendário Editorial com IA
- `brand-dna` — Brand DNA Automatizado
- `comparacao-canva` — ContentFlow vs Canva
- `comparacao-chatgpt` — ContentFlow vs ChatGPT

**Funcionalidades da Landing**:
- `generateStaticParams` para todos os slugs
- `generateMetadata` dinâmico por slug
- `ConversionTracker` em páginas SEO
- Nav responsiva com menu mobile
- Galeria de exemplos
- Tabela comparativa

---

## 4. GRUPO `(extension)` — EXTENSÃO CHROME

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/modal/[style]/[platform]` | `StandaloneModal` | **Modal da Extensão** — criação de posts via browser |

- Layout: `MantineWrapper` + `LayoutContext` (completamente independente)
- Providers de variáveis sem analytics (dub=false, language=en)
- Fundo preto, overflow hidden

---

## 5. GRUPO `(provider)` — WEBVIEW BRIDGE (APP MOBILE)

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/provider/[p]` | `InBridge` → `ProviderPreviewBridge` | **WebView de Provider** — configuração de integração via app mobile |
| `/provider/add` | `MobileIntegration` | **Adicionar Provider** — tela de adição |

**Bridge Architecture**:
- Native injecta `window.__PROVIDER_INIT__` com settings atuais
- WebView expõe globals:
  - `__getProviderPreviewValues__()` → valores do form
  - `__validateProviderPreview__()` → validação + errors
  - `__getProviderMaxCharacters__()` → limite de caracteres
- Auth via `?loggedAuth=<jwt>` na URL
- Excluído do redirect 401 no `LayoutContext`

---

## 6. STORE ZUSTAND

### `useLaunchStore` (`components/new-launch/store.ts`)

**Única store Zustand no frontend.** ~654 linhas.

**Estado**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `editor` | `'none' \| 'normal' \| 'markdown' \| 'html'` | Tipo de editor ativo |
| `loaded` | `boolean` | Se os dados foram carregados |
| `date` | `dayjs.Dayjs` | Data do post |
| `postComment` | `PostComment` | Modo de comentário |
| `tags` | `{label, value}[]` | Tags do post |
| `integrations` | `Integrations[]` | Todas as integrações disponíveis |
| `selectedIntegrations` | `SelectedIntegrations[]` | Integrações selecionadas |
| `global` | `Values[]` | Conteúdo global (todos os posts) |
| `internal` | `Internal[]` | Conteúdo por integração específica |
| `current` | `string` | ID da integração atual ('global' ou integration ID) |
| `tab` | `0 \| 1` | Tab ativa |
| `chars` | `Record<string, number>` | Contagem de caracteres por ID |
| `totalChars` | `number` | Total de caracteres |
| `locked` | `boolean` | Se o form está locked |
| `dummy` | `boolean` | Modo dummy |
| `repeater` | `number` | Repetição de posts |
| `isCreateSet` | `boolean` | Se está criando um set |
| `activateExitButton` | `boolean` | Botão de saída ativo |
| `comments` | `boolean \| 'no-media'` | Modo de comentários |
| `hide` | `boolean` | Se está oculto |

**Ações principais**: `addGlobalValue`, `deleteGlobalValue`, `changeOrderGlobal`, `setGlobalValueText`, `setGlobalValueMedia`, `addOrRemoveSelectedIntegration`, `setAllIntegrations`, `setDate`, `setTags`, `reset`, etc.

---

## 7. HOOKS CUSTOMIZADOS

### 7.1 Brand DNA (`brand-dna/brand-dna.hooks.ts`)

| Hook | SWR Key | Descrição | Refresh |
|------|---------|-----------|---------|
| `useBrands()` | `brands` | Lista todas as marcas | on-focus off |
| `useBrand(id)` | `brand-{id}` | Detalhes de uma marca | on-focus off |
| `useSelectedBrand()` | `brand-selected` | Marca selecionada | on-focus off |
| `useDnaSnapshots(brandId)` | `dna-snapshots-{id}` | Snapshots de DNA | on-focus off |
| `useLatestDna(brandId)` | `dna-latest-{id}` | Último DNA | on-focus off |
| `useAssets(brandId)` | `assets-{id}` | Assets da marca | on-focus off |

### 7.2 Content Ideas (`content-ideas/content-ideas.hooks.ts`)

| Hook | SWR Key | Descrição |
|------|---------|-----------|
| `useIdeas()` | `content-ideas` | Lista ideias |
| `useIdeasByBrand(brandId)` | `content-ideas-brand-{id}` | Ideias por marca |
| `useIdea(id)` | `content-idea-{id}` | Detalhe da ideia |
| `useProjects()` | `carousel-projects` | Lista projetos de carrossel |
| `useProjectsByBrand(brandId)` | `carousel-projects-brand-{id}` | Projetos por marca |
| `useProject(id)` | `carousel-project-{id}` | Detalhe do projeto |

### 7.3 Editorial Plans (`editorial-plans/editorial-plans.hooks.ts`)

| Hook | SWR Key | Descrição |
|------|---------|-----------|
| `useEditorialPlans()` | `editorial-plans` | Lista planos editoriais |
| `useEditorialSlots(planId)` | `editorial-slots-{id}` | Slots de um plano |

### 7.4 Generation Jobs (`generation-jobs/generation-jobs.hooks.ts`)

| Hook | SWR Key | Descrição |
|------|---------|-----------|
| `useJobs()` | `generation-jobs` | Lista jobs (**refreshInterval: 5s**) |

### 7.5 Carousel Performance (`carousel-performance/carousel-performance.hooks.ts`)

| Hook | SWR Key | Descrição |
|------|---------|-----------|
| `useCarouselDashboard(brandProfileId?)` | `carousel-dashboard` | Dashboard geral |
| `useCarouselPerformance(filters)` | `carousel-performance-{filters}` | Performance filtrada |
| `useBrandCarouselPerformance(brandId)` | `carousel-brand-{id}` | Performance por marca |
| `useCarouselTopPerformers(limit)` | `carousel-top-performers` | Top performers |
| `useCarouselTrend(brandId, days)` | `carousel-trend-{id}-{d}` | Tendência temporal |

### 7.6 Social Posts (`social-posts/social-posts.hooks.ts`)

| Hook | Descrição |
|------|-----------|
| `useSocialPosts()` | Geração de posts: `generate`, `generating`, `error`, `result`, `reset` |

### 7.7 AI Generate Studio (`ai-generate/use-ai-generate-images-studio.ts`)

- **Hook massivo: ~2861 linhas**
- `useAiGenerateImagesStudio` — estado completo do estúdio
- Gerencia: planejamento, slides, mídia, referências, direção visual, captions, review editorial, templates, custos

### 7.8 Hooks de Utilidade

| Hook | Localização | Descrição |
|------|-------------|-----------|
| `useIsScroll()` | `components/ui/is.scroll.hook.tsx` | Detecção de scroll |
| `useUser()` | `components/layout/user.context.tsx` | Dados do usuário logado (context) |
| `useFetch()` | `libraries/helpers/src/utils/custom.fetch.tsx` | Fetch wrapper com auth automática |
| `useVariables()` | `libraries/react/...` | Variáveis de ambiente globais |
| `useReturnUrl()` | `app/(app)/auth/return.url.component.tsx` | URL de retorno após login |

---

## 8. SERVIÇOS E APIs CONSUMIDAS

### 8.1 Brand DNA API (`brand-dna/brand-dna.service.ts`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/brands` | Listar marcas |
| `GET` | `/brands/selected` | Marca selecionada |
| `GET` | `/brands/{id}` | Detalhe |
| `POST` | `/brands` | Criar marca |
| `PUT` | `/brands/{id}` | Atualizar marca |
| `DELETE` | `/brands/{id}` | Deletar marca |
| `POST` | `/brands/{id}/select` | Selecionar marca |
| `POST` | `/brands/{id}/analyze` | Extrair Brand DNA via URL |
| `GET` | `/brands/{id}/dna` | Snapshots de DNA |
| `GET` | `/brands/{id}/dna/latest` | Último DNA |
| `POST` | `/brands/{id}/dna` | Criar snapshot |
| `GET` | `/brands/{id}/assets` | Assets da marca |
| `POST` | `/brands/{id}/assets` | Criar asset |
| `POST` | `/brands/{id}/assets/{assetId}/approve` | Aprovar asset |
| `DELETE` | `/brands/{id}/assets/{assetId}` | Deletar asset |

### 8.2 Content Ideas & Carousel Projects API (`content-ideas/content-ideas.service.ts`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/content-ideas` | Listar ideias |
| `GET` | `/content-ideas/brand/{brandId}` | Por marca |
| `GET` | `/content-ideas/{id}` | Detalhe |
| `POST` | `/content-ideas` | Criar ideia |
| `PATCH` | `/content-ideas/{id}/approve` | Aprovar |
| `PATCH` | `/content-ideas/{id}/reject` | Rejeitar |
| `PATCH` | `/content-ideas/{id}/save` | Salvar |
| `PATCH` | `/content-ideas/{id}/archive` | Arquivar |
| `GET` | `/carousel-projects` | Listar projetos |
| `GET` | `/carousel-projects/brand/{brandId}` | Por marca |
| `GET` | `/carousel-projects/{id}` | Detalhe |
| `POST` | `/carousel-projects` | Criar projeto |
| `PATCH` | `/carousel-projects/{id}` | Atualizar |
| `PATCH` | `/carousel-projects/{id}/status` | Mudar status |
| `POST` | `/carousel-projects/from-idea/{ideaId}` | Criar a partir de ideia |
| `POST` | `/carousel-projects/{id}/request-approval` | Solicitar aprovação |
| `POST` | `/carousel-projects/{id}/approve` | Aprovar |
| `POST` | `/carousel-projects/{id}/reject` | Rejeitar |

### 8.3 Editorial Plans API (`editorial-plans/editorial-plans.service.ts`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/editorial-plans` | Listar planos |
| `GET` | `/editorial-plans/brand/{brandId}` | Por marca |
| `GET` | `/editorial-plans/{id}` | Detalhe |
| `POST` | `/editorial-plans` | Criar plano |
| `PATCH` | `/editorial-plans/{id}` | Atualizar |
| `DELETE` | `/editorial-plans/{id}` | Deletar |
| `POST` | `/editorial-plans/{id}/generate-calendar` | Gerar calendário com IA |
| `GET` | `/editorial-plans/{planId}/slots` | Slots do plano |
| `PATCH` | `/editorial-plans/slots/{slotId}` | Atualizar slot |
| `POST` | `/editorial-plans/{id}/run-generation` | Rodar geração |
| `POST` | `/editorial-plans/{id}/toggle-auto` | Toggle auto-geração |

### 8.4 Generation Jobs API (`generation-jobs/generation-jobs.service.ts`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/generation-jobs` | Listar jobs |
| `GET` | `/generation-jobs/{id}` | Detalhe |
| `POST` | `/generation-jobs` | Criar job |
| `PATCH` | `/generation-jobs/{id}/cancel` | Cancelar |
| `GET` | `/generation-jobs/active/count` | Contagem ativa |

### 8.5 Carousel Performance API (`carousel-performance/carousel-performance.service.ts`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/carousel-performance/dashboard` | Dashboard |
| `GET` | `/carousel-performance` | Performance filtrada |
| `GET` | `/carousel-performance/brand/{brandId}` | Por marca |
| `GET` | `/carousel-performance/top-performers` | Top performers |
| `GET` | `/carousel-performance/trend/{brandId}` | Tendência |
| `POST` | `/carousel-performance` | Registrar métricas |

### 8.6 Social Posts API (`social-posts/social-posts.api.ts`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/social-posts/generate` | Gerar posts |
| `GET` | `/social-posts/from-idea/{ideaId}` | Posts a partir de ideia |
| `GET` | `/social-posts/from-carousel/{carouselId}` | Posts a partir de carrossel |

### 8.7 AI Generate Images API (`ai-generate/ai-generate-images.api.ts`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/media?page=1&search=Carrossel` | Projetos salvos |
| `GET` | `/settings/company-profiles` | Perfis de empresa |
| `POST` | `/settings/company-profiles` | Salvar perfil |
| `GET` | `/ai-generate/carousel-image-jobs/{id}` | Job de imagem |
| `GET` | `/ai-generate/cost-history` | Histórico de custos |
| `POST` | `/ai-generate/cost-estimate` | Estimativa de custo |
| `GET` | `/ai-references/manifest.json` | Manifesto de referências |
| `POST` | `/ai-generate/carousel-ideas` | Gerar ideias com IA |
| `POST` | `/ai-generate/carousel-plan` | Gerar plano |
| `POST` | `/ai-generate/carousel-caption` | Gerar legenda |
| `POST` | `/ai-generate/carousel-review` | Review editorial |
| `POST` | `/ai-generate/carousel-fix` | Corrigir carrossel |
| `POST` | `/ai-generate/carousel-image-jobs` | Criar job de imagens |
| `POST` | `/ai-generate/images` | Gerar imagem |
| `POST` | `/media/carousel` | Salvar carrossel |
| `GET` | `/ai-generate/templates` | Listar templates |
| `POST` | `/ai-generate/templates/recommend` | Recomendar templates |
| `POST` | `/ai-generate/templates/track` | Rastrear uso |

---

## 9. CONTEXTOS (React Context)

| Contexto | Localização | Descrição |
|----------|-------------|-----------|
| `LayoutContext` | `layout/layout.context.tsx` | Auth wrapper, fetch com auto-redirect 401, cookies |
| `UserContext` | `layout/user.context.tsx` | Usuário logado: id, email, orgId, tier, role, publicApi, totalChannels, isLifetime, streak |
| `CalendarContext` | `launches/calendar.context.tsx` | Estado do calendário: startDate, endDate, posts, integrations, sets, trendings, comments |
| `PlugsContext` | `plugs/plugs.context.ts` | Estado dos plugs |
| `VideoContext` | `videos/video.context.wrapper.tsx` | Contexto de vídeos |
| `VariableContextComponent` | `libraries/react/...` | 30+ variáveis de ambiente globais |

---

## 10. MODAIS

| Modal | Localização | Descrição |
|-------|-------------|-----------|
| `OnboardingModal` | `onboarding/onboarding.modal.tsx` | Modal de onboarding |
| `StandaloneModal` | `standalone-modal/standalone.modal.tsx` | Modal da extensão Chrome |
| `AddEditModal` | `new-launch/add.edit.modal.tsx` | Adicionar/editar post no calendário |
| `ManageModal` | `new-launch/manage.modal.tsx` | Gerenciar post |
| `ModalWrapperComponent` | `new-launch/modal.wrapper.component.tsx` | Wrapper base de modais |
| `NewModal` | `layout/new-modal.tsx` | Componente base de modal |
| `SettingsModal` | `launches/settings.modal.tsx` | Configurações de lançamento |
| `MissingReleaseModal` | `launches/missing-release.modal.tsx` | Release ausente |
| `ImportDebugPostModal` | `launches/import-debug-post.modal.tsx` | Debug de import |
| `CustomerModal` | `launches/customer.modal.tsx` | Seleção de cliente |

---

## 11. FORMULÁRIOS

| Formulário | Componente | Descrição |
|-----------|-----------|-----------|
| Registro | `auth/register.tsx` | Cadastro com email/senha |
| Login | `auth/login.tsx` | Autenticação |
| Esqueceu Senha | `auth/forgot.tsx` | Solicitação de reset |
| Reset Senha | `auth/forgot-return.tsx` | Nova senha |
| Onboarding Empresa | `company-onboarding.component.tsx` | Wizard multi-step |
| Onboarding Marca | `onboarding-wizard.component.tsx` | Wizard de configuração |
| Brand DNA Form | `brand-detail-page.component.tsx` | Edição de marca + URL análise |
| AI Generate Planning | `ai-generate-images-planning-form.tsx` | Briefing do carrossel |
| Social Posts | `social-posts-page.component.tsx` | Geração de posts |
| Email Campaigns | `email-campaigns-page.component.tsx` | Campanhas de email |
| Ad Creatives | `ad-creatives-page.component.tsx` | Criativos de anúncio |
| Video Scripts | `video-scripts-page.component.tsx` | Roteiros de vídeo |
| Editorial Plan | `editorial-plan-page.component.tsx` | Criação de plano |
| Settings | `settings.component.tsx` | Configurações do usuário |
| OAuth Authorize | `oauth/authorize/page.tsx` | Aprovação de apps OAuth |

---

## 12. COMPONENTES PRINCIPAIS POR DOMÍNIO

### Layout (`components/layout/`)
- `LayoutComponent` — Sidebar + menu + top bar principal
- `MediaLayoutComponent` — Layout para biblioteca de mídia
- `TopMenu` — Barra superior
- `MenuItem` — Itens do menu lateral
- `Logo` — Logo do ContentFlow
- `Loading` — Spinner de carregamento
- `OrganizationSelector` — Seletor de organização
- `ModeComponent` — Toggle de modo (dark/light)
- `LanguageComponent` — Seletor de idioma
- `AnnouncementBanner` — Banner de anúncios
- `StreakComponent` — Streak do usuário
- `CheckPayment` — Verificação de pagamento
- `Impersonate` — Modo de impersonação (admin)
- `ChromeExtensionComponent` — Prompt de instalação da extensão
- `Support` — Widget de suporte
- `DropFiles` — Drag & drop de arquivos
- `ClickOutside` — Detector de click outside
- `Redirect` — Componente de redirecionamento
- `SetTimezone` — Configuração de timezone
- `LogoutComponent` — Logout

### AI Generate Estúdio (`components/ai-generate/`)
- `AiGenerateImagesComponent` — Componente raiz
- `AiGenerateImagesStudioView` — Visão principal
- `AiGenerateImagesPlanningForm` — Formulário de briefing
- `AiGenerateImagesSlideEditor` — Editor de slides
- `AiGenerateImagesPreview` — Preview do carrossel
- `AiGenerateImagesGalleryPanel` — Painel de galeria
- `AiGenerateImagesDirectionPanel` — Direção visual
- `AiGenerateImagesCaptionPanel` — Legendas
- `AiGenerateImagesGenerationPanel` — Geração
- `AiGenerateImagesStyleReferencesPanel` — Referências de estilo
- `EditorialReviewPanel` — Review editorial
- `TemplateRecommendationPanel` — Recomendação de templates
- `ReferenceLibraryPanel` — Biblioteca de referências
- `EditorialIssueBadge` — Badge de issue editorial

### Launches / Posts (`components/launches/`)
- `LaunchesComponent` — Calendário principal
- `NewPost` — Criação de novo post
- `MergePost` — Merge de posts
- `SeparatePost` — Separar posts
- `RepeatComponent` — Repetição
- `SelectCustomer` — Seleção de cliente
- `TagsComponent` — Tags
- `Statistics` — Estatísticas
- `TimeTable` — Grade temporal
- `Generator` — Gerador de posts
- `AiImage` — Imagem gerada por IA
- `GeneralPreview` — Preview geral
- `Information` — Informações do post
- `IntegrationRedirect` — Redirect de integração
- `InternalChannels` — Canais internos
- `LayoutStandalone` — Layout standalone
- `Polonto` / `PolontoPictureGeneration` — Geração de imagens Polonto

### Providers de Social (`components/new-launch/providers/`)
**25+ plataformas suportadas:**
Facebook, Instagram, LinkedIn, X/Twitter, TikTok, YouTube, Pinterest, Reddit, Threads, Discord, Slack, Telegram, Medium, Dev.to, Hashnode, Bluesky, Mastodon, Lemmy, Nostr, Warpcast/Farcaster, Dribbble, Twitch, VK, Kick, MeWe, Skool, Whop, WordPress, Google My Business, Listmonk, Moltbook

### Auth (`components/auth/`)
- `Login`, `Register`, `Forgot`, `ForgotReturn`, `Activate`, `AfterActivate`
- `LoginWithOidc` — Login com OIDC genérico
- `NaynerAuthButton` — Botão de auth Nayner
- Provedores: Google, GitHub, Farcaster, Wallet, OAuth genérico

### Billing (`components/billing/`)
- `BillingComponent`, `MainBillingComponent`, `FirstBillingComponent`
- `EmbeddedBilling`, `LifetimeDeal`, `PurchaseCrypto`
- `FinishTrial`, `FaqComponent`

### Settings (`components/settings/`)
- `SettingsPopup` — Container principal
- `GlobalSettings` — Configurações globais
- `EmailNotifications` — Notificações por email
- `TeamsComponent` — Gerenciamento de equipe
- `Signatures` — Assinaturas
- `ShortlinkPreference` — Preferências de shortlink
- `MetricComponent` — Métricas
- `GithubComponent` — Integração GitHub

### Brand DNA (`components/brand-dna/`)
- `BrandListPage` — Lista de marcas
- `BrandDetailPage` — Detalhe da marca
- `BrandSelector` — Seletor de marca
- `BrandAssetList` — Lista de assets
- `BrandStatusBadge` — Badge de status
- `DnaSnapshotList` — Lista de snapshots
- `AnalyzeSiteButton` — Botão de análise de site

### Content Ideas (`components/content-ideas/`)
- `ContentSwipePage` — Página principal
- `ContentSwipe` — Componente de swipe

### Editorial Plans (`components/editorial-plans/`)
- `EditorialPlanPage` — Página principal

### Generation Jobs (`components/generation-jobs/`)
- `JobsListPage` — Lista de jobs

### Carousel Performance (`components/carousel-performance/`)
- `CarouselPerformanceDashboard` — Dashboard
- `EmptyPerformance` — Estado vazio

### Social Posts (`components/social-posts/`)
- `SocialPostsPage` — Página principal
- `AdCreativesPage` — Criativos de anúncio
- `EmailCampaignsPage` — Campanhas de email
- `VideoScriptsPage` — Roteiros de vídeo
- `SocialPostCard` — Card de post
- `PostPreview` — Preview de post
- `PlatformBadge` — Badge de plataforma

### Analytics (`components/analytics/`)
- `Chart` — Gráfico genérico
- `ChartSocial` — Gráfico social
- `StarsAndForks` — GitHub stars/forks
- `StarsTable` — Tabela de stars
- `ConversionTracker` — Rastreamento de conversão

### Third-Party (`components/third-parties/`)
- `ThirdPartyComponent` — Container principal
- `ThirdPartyList` — Lista de integrações
- `ThirdPartyWrapper` — Wrapper
- `HeygenProvider` — Integração HeyGen
- `SliderComponent` — Slider de integrações
- `ThirdPartyMediaLibrary` — Biblioteca de mídia third-party

### Videos (`components/videos/`)
- `VideoRenderComponent` — Renderização de vídeo
- `VideoWrapper` — Wrapper de vídeo
- `VideoContextWrapper` — Contexto de vídeo
- `ImageTextSlidesProvider` — Slides imagem+texto
- `Veo3Provider` — Provider Veo3

### Agents (`components/agents/`)
- `Agent` — Container do agente
- `AgentChat` — Chat com agente
- `AgentInput` — Input do agente
- `AgentTextarea` — Textarea do agente

### UI (`components/ui/`)
- `CheckIconComponent` — Ícone de check
- `Icons/index.tsx` — Ícones globais
- `LogoTextComponent` — Logo com texto
- `TranslatedLabel` — Label traduzido

### Developer (`components/developer/`)
- `DeveloperComponent` — Painel de desenvolvedor
- `DeveloperIconComponent` — Ícone de desenvolvedor

### Webhooks (`components/webhooks/`)
- `Webhooks` — Gerenciamento de webhooks

### Notifications (`components/notifications/`)
- `NotificationComponent` — Notificações

### Preview (`components/preview/`)
- `PreviewWrapper` — Wrapper de preview
- `CommentsComponents` — Comentários
- `CopyClient` — Botão de copiar
- `RenderPreviewDate` / `RenderPreviewDateClient` — Renderização de data

### Approved Apps (`components/approved-apps/`)
- `ApprovedAppsComponent` — Apps aprovados

### Public API (`components/public-api/`)
- `PublicComponent` — API pública

### Sets (`components/sets/`)
- `Sets` — Gerenciamento de sets

### Onboarding (`components/onboarding/`)
- `OnboardingWizard` — Wizard de onboarding
- `CompanyOnboardingComponent` — Onboarding de empresa
- `GithubOnboarding` — Onboarding via GitHub

### Post URL Selector (`components/post-url-selector/`)
- `PostUrlSelector` — Seletor de URL de post

### Carousel Projects (`components/carousel-projects/`)
- `ApprovalPanelComponent` — Painel de aprovação

### Templates (`components/templates/`)
- `TemplateMarketplacePage` — Marketplace de templates

### Signature (`components/signature.tsx`)
- Componente de assinatura

---

## 13. MIDDLEWARE

**Não há arquivo `middleware.ts` no frontend Next.js.**

Proteção de rotas é feita via:
- `LayoutContext` → redirect 401 → `/auth/login`
- Cookies de autenticação (`auth`)
- Server-side `internalFetch` com tratamento de erro
- Route group `(provider)` é excluído do redirect 401

---

## 14. RESUMO NUMÉRICO

| Categoria | Quantidade |
|-----------|-----------|
| **Rotas de página** | ~32 |
| **Layouts de grupo** | 7 |
| **Layouts aninhados** | 3 |
| **Componentes .tsx** | ~200+ |
| **Stores Zustand** | 1 (`useLaunchStore`) |
| **Hooks customizados** | ~25 (SWR) + 5 utilidade |
| **Serviços de API** | 7 módulos |
| **Endpoints de API** | ~65 |
| **Contexts React** | 6 |
| **Modais** | 10 |
| **Formulários** | 15 |
| **Provedores social** | 25+ |
| **Páginas SEO** | 6 clusters + docs |

---

## 15. FLUXO DE DADOS

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser    │────→│  Next.js SSR │────→│   Backend   │
│  (React)     │     │  / RSC       │     │  (NestJS)   │
└─────────────┘     └──────────────┘     └─────────────┘
      │                    │                     │
      │ useFetch()         │ internalFetch()     │
      │ (cookie auth)      │ (server-side)       │
      │                    │                     │
      ▼                    ▼                     ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  SWR Cache   │     │  Server      │     │  PostgreSQL  │
│  (client)    │     │  Components  │     │  + pgvector  │
└─────────────┘     └──────────────┘     └─────────────┘
```

**Auth flow**: Cookie `auth` → `useFetch` adiciona header → Backend valida → 401 → redirect `/auth/login`

**Data fetching**: SWR para client-side (revalidateOnFocus: false, polling em jobs), server components para SSR
