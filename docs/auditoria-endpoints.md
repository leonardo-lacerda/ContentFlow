# Auditoria de Endpoints — Backend NestJS

> Gerado em: 2026-06-28
> Projeto: ContentFlow
> Foco: AI Generate Images, Company Profiles, Carrosséis

---

## 1. AI Generate — Endpoints (`/ai-generate`)

### Controller
- **Arquivo:** `apps/backend/src/api/routes/ai-generate.controller.ts`
- **Tag Swagger:** `AI Generate`
- **Service injetado:** `AiGenerateService` (de `@gitroom/nestjs-libraries/ai-generate/ai-generate.service.ts`)
- **Autenticação:** Todas as rotas usam `@GetOrgFromRequest()` para extrair `Organization` do request

### Endpoints

| Método | Rota | Método no Controller | DTO |
|--------|------|---------------------|-----|
| POST | `/ai-generate/images` | `generateImage()` | `AiGenerateImageDto` |
| POST | `/ai-generate/carousel-plan` | `generateCarouselPlan()` | `AiGenerateCarouselDto` |
| POST | `/ai-generate/carousel-ideas` | `generateCarouselIdeas()` | `AiGenerateCarouselIdeasDto` |
| POST | `/ai-generate/carousel-caption` | `generateCarouselCaption()` | `AiGenerateCaptionDto` |
| POST | `/ai-generate/carousel-review` | `reviewCarousel()` | `AiGenerateCarouselDto` |
| POST | `/ai-generate/carousel-fix` | `fixCarousel()` | `AiGenerateCarouselDto` |
| POST | `/ai-generate/cost-estimate` | `estimateCosts()` | Inline `{ slideCount?, referenceCount?, promptChars? }` |
| GET | `/ai-generate/cost-history` | `getCostHistory()` | — |
| POST | `/ai-generate/carousel-image-jobs` | `startCarouselImageJob()` | Inline `{ slides?: [{ slideIndex?, request: AiGenerateImageDto }] }` |
| GET | `/ai-generate/carousel-image-jobs/:id` | `getCarouselImageJob()` | — |

### Service: `AiGenerateService`
- **Arquivo:** `libraries/nestjs-libraries/src/ai-generate/ai-generate.service.ts`
- **Services injetados:**
  - `MediaService` (para persistir imagens)
  - `ExtractContentService` (para extrair conteúdo de URLs)
- **Métodos principais:**
  - `generateImage(orgId, body)` — Gera imagem via provider `ia_generate` ou `openai_official`
  - `generateCarouselPlan(orgId, body)` — Gera plano completo de carrossel (slides, copy, prompts)
  - `generateCarouselIdeas(orgId, body)` — Gera ideias de carrossel via OpenAI
  - `generateCarouselCaption(orgId, body)` — Gera legenda + hashtags
  - `reviewCarousel(orgId, body)` — Revisão editorial do carrossel
  - `fixCarouselWithEditorialReview(orgId, body)` — Corrige carrossel com base em revisão
  - `estimateCarouselCosts(orgId, body)` — Estima custos de geração
  - `getCostHistory(orgId)` — Histórico de custos (em memória, Map)
  - `startCarouselImageJob(orgId, body)` — Job assíncrono de geração de imagens (em memória, Map)
  - `getCarouselImageJob(orgId, id)` — Status do job de imagens do carrossel

### DTOs de AI Generate

| DTO | Arquivo | Campos principais |
|-----|---------|-------------------|
| `AiGenerateImageDto` | `libraries/nestjs-libraries/src/dtos/ai-generate/ai-generate-image.dto.ts` | `provider` (ia_generate\|openai_official), `prompt`, `model`, `n`, `size`, `quality`, `style`, `response_format`, `user`, `background`, `moderation`, `output_compression`, `output_format`, `input_fidelity`, `reference_images[]`, `reference_description_model`, `reference_mode` (brand\|balanced\|inspiration), `persist` |
| `AiGenerateCarouselDto` | `libraries/nestjs-libraries/src/dtos/ai-generate/ai-generate-carousel.dto.ts` | `topic`, `sourceUrl`, `sourceText`, `goal`, `audience`, `tone`, `platform`, `slideCount` (2-10), `visualStyle`, `brandNotes`, `language`, `textModel`, `reviewPayload` |
| `AiGenerateCarouselIdeasDto` | `libraries/nestjs-libraries/src/dtos/ai-generate/ai-generate-carousel-ideas.dto.ts` | `topicHint` (3-240 chars), `companyContext` (até 5000), `language`, `textModel`, `existingTitles[]` |
| `AiGenerateCaptionDto` | `libraries/nestjs-libraries/src/dtos/ai-generate/ai-generate-caption.dto.ts` | `title`, `slides[]` (headline+body), `platform`, `tone`, `language`, `companyContext`, `forbiddenTerms`, `defaultCta`, `textModel` |

---

## 2. Company Profile — Endpoints (`/settings/company-profile*`)

### Controller
- **Arquivo:** `apps/backend/src/api/routes/settings.controller.ts`
- **Tag Swagger:** `Settings`
- **Service injetado:** `OrganizationService` (de `@gitroom/nestjs-libraries/database/prisma/organizations/organization.service.ts`)

### Endpoints

| Método | Rota | Método no Controller | DTO | Policy |
|--------|------|---------------------|-----|--------|
| GET | `/settings/company-profile` | `getCompanyProfile()` | — | — |
| GET | `/settings/company-profiles` | `getCompanyProfiles()` | — | — |
| POST | `/settings/company-profile` | `updateCompanyProfile()` | `CompanyProfileDto` | Admin |
| POST | `/settings/company-profiles` | `updateCompanyProfiles()` | `CompanyProfileDto` | Admin |
| DELETE | `/settings/company-profiles/:id` | `deleteCompanyProfile()` | — | Admin |
| POST | `/settings/company-profile/generate-summary` | `generateCompanySummary()` | `CompanyProfileSummaryDto` | Admin |
| POST | `/settings/company-profiles/generate-summary` | `generateCompanyProfileSummary()` | `CompanyProfileSummaryDto` | Admin |
| POST | `/settings/company-profiles/generate-visual-identity` | `generateCompanyVisualIdentity()` | `CompanyProfileDto` | Admin |

### Service: `OrganizationService`
- **Arquivo:** `libraries/nestjs-libraries/src/database/prisma/organizations/organization.service.ts`
- **Services injetados:**
  - `OrganizationRepository` (Prisma)
  - `NotificationService`
  - `ExtractContentService`
- **Métodos de CompanyProfile:**
  - `getCompanyProfile(orgId)` — Retorna perfil **selecionado** (com flag `hasProfile`)
  - `getCompanyProfiles(orgId)` — Retorna **coleção** com `{ companies[], selectedCompanyId }`
  - `upsertCompanyProfile(orgId, body)` — Cria ou atualiza perfil
  - `deleteCompanyProfile(orgId, id)` — Remove perfil da coleção
  - `generateCompanySummary(orgId, body)` — Gera resumo via OpenAI + extração de site
  - `generateCompanyVisualIdentity(orgId, body)` — Gera descrição de identidade visual via modelo de visão

### Repository: `OrganizationRepository`
- **Arquivo:** `libraries/nestjs-libraries/src/database/prisma/organizations/organization.repository.ts`
- **Métodos relevantes:**
  - `getCompanyProfile(orgId)` — Busca `{ id, name, description }` da Organization
  - `updateCompanyProfile(orgId, data)` — Atualiza `name` e/ou `description` da Organization

### Como CompanyProfile é armazenado

Os dados de CompanyProfile são serializados como JSON no campo `description` da tabela `Organization` (Prisma). Dois formatos:

1. **Formato atual (v2):** `__type: "company_profiles_v2"` com `{ selectedCompanyId, companies[] }` — suporta múltiplos perfis
2. **Formato legado (v1):** `__type: "company_profile_v1"` com dados de um único perfil

A migração entre formatos é feita de forma transparente em `parseCompanyProfiles()`.

### DTOs de Company Profile

**`CompanyProfileDto`** — `libraries/nestjs-libraries/src/dtos/settings/company-profile.dto.ts`

Campos: `id`, `companyName`, `website`, `industry`, `targetAudience`, `productsOrServices`, `differentials`, `toneOfVoice`, `summary`, `visualIdentitySummary`, `brandColors`, `brandFonts`, `defaultCta`, `forbiddenTerms`, `contentPreferences`, `visualIdentityAssets[]`, `brandPalettes[]`, `brandFontPresets[]`, `brandLogos[]`, `styleRules[]`, `inspirationLibrary[]`, `ideasLibrary[]`

**`CompanyProfileSummaryDto`** — `libraries/nestjs-libraries/src/dtos/settings/company-profile-summary.dto.ts`

Mesmos campos do `CompanyProfileDto` (sem `ideasLibrary`).

### Fluxo de leitura/escrita

```
Controller → OrganizationService → OrganizationRepository → Prisma (Organization.description)
                                    ↓
                           parseCompanyProfiles() ← JSON.parse(description)
                                    ↓
                           serializeCompanyProfiles() → JSON.stringify → updateCompanyProfile()
```

---

## 3. Media & Carrosséis — Endpoints (`/media`)

### Controller
- **Arquivo:** `apps/backend/src/api/routes/media.controller.ts`
- **Tag Swagger:** `Media`
- **Services injetados:** `MediaService`, `SubscriptionService`
- **Storage:** `UploadFactory.createStorage()`

### Endpoints

| Método | Rota | Descrição | DTO |
|--------|------|-----------|-----|
| GET | `/media` | Listar mídia (paginado) | `page`, `search` (query) |
| DELETE | `/media/:id` | Deletar mídia | — |
| POST | `/media/generate-video` | Gerar vídeo | `VideoDto` |
| POST | `/media/generate-image` | Gerar imagem via OpenAI | `prompt` (body) |
| POST | `/media/generate-image-with-prompt` | Gerar imagem e salvar automaticamente | `prompt` (body) |
| POST | `/media/upload-server` | Upload de arquivo | Multipart `file` |
| POST | `/media/save-media` | Salvar mídia (URL externa) | `name`, `originalName` |
| POST | `/media/information` | Salvar informação de mídia | `SaveMediaInformationDto` |
| **POST** | **`/media/carousel`** | **Salvar carrossel** | **`SaveMediaCarouselDto`** |
| POST | `/media/upload-simple` | Upload simples | Multipart `file`, `preventSave` |
| POST | `/media/:endpoint` | Upload R2 multipart | Parâmetro de rota |
| GET | `/media/video-options` | Opções de vídeo disponíveis | — |
| POST | `/media/video/function` | Chamar função de vídeo | `VideoFunctionDto` |
| GET | `/media/generate-video/:type/allowed` | Verificar se vídeo é permitido | — |

### Service: `MediaService`
- **Arquivo:** `libraries/nestjs-libraries/src/database/prisma/media/media.service.ts`
- **Services injetados:** `MediaRepository`, `OpenaiService`, `SubscriptionService`, `VideoManager`
- **Métodos de carrossel:**
  - `saveCarousel(org, body: SaveMediaCarouselDto)` — Salva slides do carrossel como mídia individual, com metadados de projeto no campo `alt`

### DTO `SaveMediaCarouselDto`
- **Arquivo:** `libraries/nestjs-libraries/src/dtos/media/save.media.carousel.dto.ts`
- **Campos:**
  - `title` (string, 160 max)
  - `projectMetadata` (string opcional, 12000 max) — metadados do projeto de carrossel
  - `images[]` (array de `SaveMediaCarouselItemDto`, 1-10 itens)
    - `index` (int, 1-10)
    - `image` (string, base64 ou URL, 12MB max)
    - `mediaId` (opcional)
    - `alt` (opcional)

---

## 4. Posts — Endpoints (`/posts`)

### Controller
- **Arquivo:** `apps/backend/src/api/routes/posts.controller.ts`
- **Tag Swagger:** `Posts`
- **Services injetados:** `PostsService`, `AgentGraphService`, `ShortLinkService`

### Endpoints relevantes

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/posts/generator` | Geração de posts via Agent Graph (streaming) |
| POST | `/posts/generator/draft` | Geração de rascunho de posts |
| POST | `/posts` | Criar post |
| GET | `/posts/list` | Listar posts |
| GET | `/posts/:id` | Obter post |

---

## 5. Resumo de Conexões entre Domínios

```
[AI Generate Controller]
  ├── POST /ai-generate/images → AiGenerateService.generateImage()
  │     └── Persiste via MediaService.saveFile()
  ├── POST /ai-generate/carousel-plan → AiGenerateService.generateCarouselPlan()
  ├── POST /ai-generate/carousel-ideas → AiGenerateService.generateCarouselIdeas()
  ├── POST /ai-generate/carousel-caption → AiGenerateService.generateCarouselCaption()
  ├── POST /ai-generate/carousel-review/review/fix → OpenAI para revisão editorial
  ├── POST /ai-generate/carousel-image-jobs → Jobs em memória para batch de imagens
  └── GET/POST cost-* → Histórico de custos em memória

[Settings Controller — Company Profile]
  ├── GET /settings/company-profile → OrganizationService.getCompanyProfile()
  │     └── Lê Organization.description → JSON → parse
  ├── POST /settings/company-profile → OrganizationService.upsertCompanyProfile()
  │     └── Serializa → JSON → salva em Organization.description
  ├── POST /settings/company-profile/generate-summary → OpenAI + extração de site
  └── POST /settings/company-profiles/generate-visual-identity → Visão computacional

[Media Controller — Carrosséis]
  └── POST /media/carousel → MediaService.saveCarousel()
        └── Upload imagens (base64/URL) + salva metadados no alt

[Posts Controller]
  └── POST /posts/generator → Agent Graph (pode usar CompanyProfile + AI Generate)
```

## 6. Observações

1. **CompanyProfile NÃO tem tabela própria** — é armazenado como JSON no campo `description` da Organization via Prisma.
2. **Carrosséis também NÃO têm tabela própria** — os slides são salvos como mídia individual no `MediaRepository` com metadados no campo `alt` (prefixo `__CONTENTFLOW_CAROUSEL_PROJECT__:`).
3. **AI Generate mantém estado em memória** — jobs de imagem (`carouselImageJobs`) e histórico de custos (`costLedger`) são maps em memória, perdidos em reinicialização.
4. **Dois controllers fazem geração de imagem**: `AiGenerateController` (via `AiGenerateService.generateImage()`) e `MediaController` (via `MediaService.generateImage()` → `OpenaiService`).
5. **CompanyProfile tem dois formatos de serialização**: v1 (único) e v2 (coleção). Ambos convivem no mesmo campo `description`.
