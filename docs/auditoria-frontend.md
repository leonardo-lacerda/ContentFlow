# Auditoria de Telas do Frontend (Next.js App Router)

## Estrutura Geral

- **Framework:** Next.js 14+ (App Router)
- **Path base:** `apps/frontend/src/`
- **Layout principal:** `apps/frontend/src/app/(app)/(site)/layout.tsx` → `LayoutComponent`
- **Menu de navegação:** `TopMenu` em `components/layout/top.menu.tsx`
- **Autenticação:** `useSWR('/user/self', ...)` no `LayoutComponent`
- **Fetch customizado:** `useFetch` de `@gitroom/helpers/utils/custom.fetch`
- **Cache/Estado:** SWR (`useSWR`), `useSWRConfig`
- **i18n:** `useT()` de `@gitroom/react/translation/get.transation.service.client`

---

## 1. AI Carousel Studio (`/ai-generate-images`)

### Rota
- **Pasta:** `apps/frontend/src/app/(app)/(site)/ai-generate-images/`
- **Arquivo:** `page.tsx`
- **Componente principal:** `AiGenerateImagesComponent`

### Componentes
| Componente | Caminho | Descrição |
|---|---|---|
| `AiGenerateImagesComponent` | `components/ai-generate/ai-generate-images.component.tsx` | Entry point, conecta hook ao view |
| `AiGenerateImagesStudioView` | `components/ai-generate/ai-generate-images-studio-view.tsx` | View principal do estúdio |
| `useAiGenerateImagesStudio` | `components/ai-generate/use-ai-generate-images-studio.ts` | Hook principal (~2655 linhas) |
| `AiGenerateImagesPlanningForm` | `components/ai-generate/ai-generate-images-planning-form.tsx` | Formulário de planejamento |
| `DirectionPanel` | `components/ai-generate/ai-generate-images-direction-panel.tsx` | Painel de direção criativa |
| `CaptionPanel` | `components/ai-generate/ai-generate-images-caption-panel.tsx` | Geração de legendas |
| `CompanyGalleryPanel` | `components/ai-generate/ai-generate-images-gallery-panel.tsx` | Galeria de projetos salvos |
| `CarouselPreviewPanel` | `components/ai-generate/ai-generate-images-preview.tsx` | Preview do carrossel |
| `SlideEditorPanel` | `components/ai-generate/ai-generate-images-slide-editor.tsx` | Editor de slides |
| `ImageGenerationPanel` | `components/ai-generate/ai-generate-images-generation-panel.tsx` | Geração de imagens |
| `StyleReferencesPanel` | `components/ai-generate/ai-generate-images-style-references-panel.tsx` | Referências de estilo |
| `aiGenerateImagesApi` | `components/ai-generate/ai-generate-images.api.ts` | API calls centralizadas |

### APIs chamadas (via `aiGenerateImagesApi`)
| Endpoint | Método | Descrição |
|---|---|---|
| `/media?page=1&search=Carrossel` | GET | Carregar projetos salvos |
| `/settings/company-profiles` | GET | Carregar perfis de empresa |
| `/settings/company-profiles` | POST | Salvar perfil de empresa |
| `/ai-generate/carousel-image-jobs/:id` | GET | Status de job de imagens |
| `/ai-generate/cost-history` | GET | Histórico de custos |
| `/ai-generate/cost-estimate` | POST | Estimar custo |
| `/ai-generate/carousel-ideas` | POST | Gerar ideias de carrossel |
| `/ai-generate/carousel-plan` | POST | Gerar plano de carrossel |
| `/ai-generate/carousel-caption` | POST | Gerar legenda |
| `/ai-generate/carousel-review` | POST | Revisão editorial |
| `/ai-generate/carousel-fix` | POST | Corrigir carrossel |
| `/ai-generate/carousel-image-jobs` | POST | Criar job de imagens |
| `/ai-generate/images` | POST | Gerar imagem individual |
| `/media/carousel` | POST | Salvar carrossel na mídia |
| `/ai-references/manifest.json` | GET | Manifesto de referências globais |
| `/style-references/index.json` | GET | Referências de estilo |

### Types
- **Arquivo:** `components/ai-generate/ai-generate-images.types.ts`
- Principais: `CompanyProfile`, `CarouselPlan`, `CarouselSlide`, `ReferenceImage`, `StyleReference`, `BrandPalette`, `BrandFontPreset`, `BrandLogoAsset`, `StyleRule`, `CompanyInspiration`, `CarouselIdea`, `SavedAiProject`, `EditorialReview`, `CostEstimate`, `CostHistoryResponse`

---

## 2. Company Profiles (`/onboarding/company`)

### Rota
- **Pasta:** `apps/frontend/src/app/(app)/(site)/onboarding/company/`
- **Arquivo:** `page.tsx`
- **Componente principal:** `CompanyOnboardingComponent`

### Componente
| Componente | Caminho | Descrição |
|---|---|---|
| `CompanyOnboardingComponent` | `components/onboarding/company-onboarding.component.tsx` | Formulário multi-step de perfil da empresa (~1509 linhas) |

### Fluxo
- 5 steps: Identidade → Posicionamento → Visual → Voz e regras → Revisão
- Gerencia múltiplos perfis de empresa (selecionável via `selectedCompanyId`)
- Upload de assets visuais (compressão client-side)
- Geração automática de resumo via IA (endpoint `/settings/company-profiles/generate-summary`)
- Geração de pilares de conteúdo e ideias de post

### APIs chamadas
| Endpoint | Método | Descrição |
|---|---|---|
| `/settings/company-profiles` | GET | Listar perfis |
| `/settings/company-profiles` | POST | Salvar/atualizar perfil |
| `/settings/company-profiles/generate-summary` | POST | Gerar resumo automático via IA |

### Observação
- **Não existe** uma rota `/settings/company-profiles` separada no frontend.
- O gerenciamento de company profiles está integrado em **dois lugares**:
  1. **Onboarding** (`/onboarding/company`) — formulário completo multi-step
  2. **AI Carousel Studio** (`/ai-generate-images`) — seletor de perfil + Brand Kit dentro do estúdio
- Ambos consomem o mesmo backend: `/settings/company-profiles`

---

## 3. Media (`/media`)

### Rota
- **Pasta:** `apps/frontend/src/app/(app)/(site)/media/`
- **Arquivo:** `page.tsx`
- **Componente principal:** `MediaLayoutComponent`

### Componentes
| Componente | Caminho | Descrição |
|---|---|---|
| `MediaLayoutComponent` | `components/new-layout/layout.media.component.tsx` | Wrapper que renderiza `MediaBox` em modo standalone |
| `MediaBox` | `components/media/media.component.tsx` | Grid de mídia com upload, seleção, paginação, busca (~1194 linhas) |
| `ShowMediaBoxModal` | `components/media/media.component.tsx` | Versão modal do MediaBox |
| `new.uploader` | `components/media/new.uploader.tsx` | Uploader Uppy |

### APIs chamadas
| Endpoint | Método | Descrição |
|---|---|---|
| `/media?page=:page&search=:search` | GET | Listar mídia (via `useSWR`) |
| `/media/:id` | DELETE | Deletar mídia |

### Funcionalidades
- Upload drag-and-drop via Uppy
- Filtro por tipo (imagem/video)
- Paginação com debounce na busca
- Suporte a carrosséis salvos (exibe children)
- Modal de maximizar com detalhes do projeto AI

---

## 4. Launches / Calendário (`/launches`)

### Rota
- **Pasta:** `apps/frontend/src/app/(app)/(site)/launches/`
- **Arquivo:** `page.tsx` (redireciona para `/analytics`)
- **Nota:** A rota `/launches` redireciona para `/analytics`. O componente real de Launches está no layout principal.

### Componente principal
| Componente | Caminho | Descrição |
|---|---|---|
| `LaunchesComponent` | `components/launches/launches.component.tsx` | Calendário + sidebar de canais (~604 linhas) |
| `Calendar` | `components/launches/calendar.tsx` | Calendário semanal (~1304 linhas) |
| `CalendarWeekProvider` | `components/launches/calendar.context.tsx` | Contexto do calendário |
| `Filters` | `components/launches/filters` | Filtros do calendário |
| `Menu` | `components/launches/menu/menu.tsx` | Menu de ações por canal |
| `NewPost` | `components/launches/new.post.tsx` | Criar novo post |
| `GeneratorComponent` | `components/launches/generator/generator` | Gerador de posts |

### APIs chamadas
| Endpoint | Método | Descrição |
|---|---|---|
| `/integrations/list` | GET | Listar integrações/canais (via `useIntegrationList`) |
| `/integrations/:id/group` | PUT | Mover canal para grupo |
| `/integrations/social/:identifier?refresh=:internalId` | GET | Refresh de canal |

### Hooks
| Hook | Caminho | Descrição |
|---|---|---|
| `useIntegrationList` | `components/launches/helpers/use.integration.list.tsx` | Hook SWR para `/integrations/list` |
| `useValues` | `components/launches/helpers/use.values.ts` | Configurações de lançamento |
| `useIntegration` | `components/launches/helpers/use.integration.ts` | Hook de integração individual |

---

## 5. Settings (`/settings`)

### Rota
- **Pasta:** `apps/frontend/src/app/(app)/(site)/settings/`
- **Arquivo:** `page.tsx`
- **Componente principal:** `SettingsPopup`

### Componentes
| Componente | Caminho | Descrição |
|---|---|---|
| `SettingsPopup` | `components/layout/settings.component.tsx` | Modal de configurações com abas |
| `GlobalSettings` | `components/settings/global.settings.tsx` | Configurações globais (métrica, email, shortlink) |
| `TeamsComponent` | `components/settings/teams.component.tsx` | Gerenciamento de times |
| `SignaturesComponent` | `components/settings/signatures.component.tsx` | Assinaturas |
| `Webhooks` | `components/webhooks/webhooks` | Webhooks |
| `Autopost` | `components/autopost/autopost` | Auto Post |
| `Sets` | `components/sets/sets` | Sets |
| `PublicComponent` | `components/public-api/public.component.tsx` | API pública |
| `ApprovedAppsComponent` | `components/approved-apps/approved-apps.component.tsx` | Apps aprovados |

### APIs chamadas
| Endpoint | Método | Descrição |
|---|---|---|
| `/user/personal` | GET | Carregar perfil pessoal |
| `/user/personal` | POST | Atualizar perfil pessoal |

---

## 6. Navegação (TopMenu)

**Arquivo:** `components/layout/top.menu.tsx`

Itens do menu principal (primeira seção):
1. **Calendar/Launches** → `/launches`
2. **Agent** → `/agents`
3. **Analytics** → `/analytics`
4. **Media** → `/media`
5. **Onboarding** → `/onboarding/company`
6. **AI Images** → `/ai-generate-images`
7. **Plugs** → `/plugs`
8. **Integrations** → `/third-party`

Itens do menu secundário:
1. **UGC** → (SSO externo)
2. **Affiliate** → `https://affiliate.contentflow.com`
3. **Assinatura** → `/billing`
4. **Settings** → `/settings`

---

## 7. Layout Principal

**Arquivo:** `components/new-layout/layout.component.tsx`

Estrutura:
- `ContextWrapper` (user context)
- `CopilotKit` (chat IA)
- `MantineWrapper`
- `ToolTip`, `Toaster`
- `CheckPayment`
- `ShowMediaBoxModal`, `ShowLinkedinCompany`, `MediaSettingsLayout`
- `ShowPostSelector`, `PreConditionComponent`, `NewSubscription`
- `ContinueProvider`
- Sidebar esquerda: `Logo` + `TopMenu`
- Top bar: `Title`, `StreakComponent`, `OrganizationSelector`, `ModeComponent`, `LanguageComponent`, `ChromeExtensionComponent`, `NotificationComponent`
- Content area: `{children}`

---

## Resumo de Rotas Mapeadas

| Rota | Página | Componente Principal | APIs Relevantes |
|---|---|---|---|
| `/ai-generate-images` | AI Carousel Studio | `AiGenerateImagesComponent` | `/settings/company-profiles`, `/ai-generate/*`, `/media/carousel` |
| `/onboarding/company` | Company Profiles | `CompanyOnboardingComponent` | `/settings/company-profiles`, `/settings/company-profiles/generate-summary` |
| `/media` | Media Library | `MediaLayoutComponent` → `MediaBox` | `/media?page=&search=`, `/media/:id` |
| `/launches` | Calendário (redirect → `/analytics`) | `LaunchesComponent` | `/integrations/list`, `/integrations/:id/group` |
| `/settings` | Configurações | `SettingsPopup` | `/user/personal` |

## Observações Finais

1. **Company Profiles** não tem rota própria em `/settings/company-profiles`. O gerenciamento está dividido entre o onboarding (`/onboarding/company`) e o seletor dentro do AI Carousel Studio.
2. **Launches** redireciona para `/analytics` — o calendário real é renderizado como parte do layout principal (sidebar + calendário).
3. **AI Carousel Studio** é o componente mais complexo, com ~20 subcomponentes e 15+ endpoints de API.
4. **Media** é um componente reutilizável (usado tanto como página standalone quanto como modal em Settings e outros lugares).
5. Todos os componentes usam `'use client'` — não há Server Components significativos além dos page.tsx/layout.tsx.
