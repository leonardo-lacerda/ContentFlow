# Auditoria do Schema Prisma e Estrutura de Dados — ContentFlow

> **Data:** 28/06/2026
> **Schema:** `libraries/nestjs-libraries/src/database/prisma/schema.prisma`
> **Banco:** PostgreSQL

---

## 1. Visão Geral do Schema Prisma

### Total de Modelos: **30 modelos + 10 enums**

### Modelos de Negócio (20)
| # | Modelo | Descrição |
|---|--------|-----------|
| 1 | **Organization** | Organização/workspace — entidade central |
| 2 | **User** | Usuário do sistema |
| 3 | **UserOrganization** | Relação N:N User ↔ Organization |
| 4 | **Post** | Post agendado/publicado |
| 5 | **Integration** | Conexão com rede social (Instagram, LinkedIn, etc.) |
| 6 | **Media** | Arquivos de mídia (imagens, thumbnails) |
| 7 | **Tags** | Tags para posts |
| 8 | **TagsPosts** | Relação N:N Tags ↔ Post |
| 9 | **Comments** | Comentários em posts |
| 10 | **Subscription** | Assinatura/plano da organização |
| 11 | **Credits** | Créditos de AI por organização |
| 12 | **Customer** | Cliente vinculado a uma organização |
| 13 | **Orders** | Pedidos de post patrocinado |
| 14 | **OrderItems** | Itens de um pedido |
| 15 | **MessagesGroup** | Grupo de mensagens (comprador/vendedor) |
| 16 | **Messages** | Mensagens individuais |
| 17 | **PayoutProblems** | Problemas de pagamento |
| 18 | **Plugs** | Plugins/funções extras por integração |
| 19 | **ExisingPlugData** | Dados de plugins existentes |
| 20 | **AutoPost** | Configuração de auto-posting |

### Modelos de Suporte (10)
| # | Modelo | Descrição |
|---|--------|-----------|
| 21 | **Signatures** | Assinaturas de email |
| 22 | **Notifications** | Notificações |
| 23 | **Errors** | Log de erros de post |
| 24 | **Webhooks** | Webhooks configurados |
| 25 | **IntegrationsWebhooks** | Relação N:N Integration ↔ Webhook |
| 26 | **Sets** | Conjuntos de conteúdo |
| 27 | **ThirdParty** | Integrações de terceiros |
| 28 | **GitHub** | Conexão GitHub |
| 29 | **Trending** | Trending topics |
| 30 | **TrendingLog** | Log de trending |
| 31 | **PopularPosts** | Posts populares |
| 32 | **Mentions** | Menções em redes sociais |
| 33 | **ItemUser** | Itens de usuário (chave/valor) |
| 34 | **Star** | Estatísticas de estrelas GitHub |
| 35 | **SocialMediaAgency** | Agência de mídia social |
| 36 | **SocialMediaAgencyNiche** | Nicho de agência |
| 37 | **OAuthApp** | Aplicação OAuth |
| 38 | **OAuthAuthorization** | Autorização OAuth |
| 39 | **Announcement** | Anúncios do sistema |

### Modelos Mastra (6 — ignorados pelo Prisma Client)
| # | Modelo | Descrição |
|---|--------|-----------|
| 40 | `mastra_ai_spans` | Spans de tracing AI |
| 41 | `mastra_evals` | Avaliações de AI |
| 42 | `mastra_messages` | Mensagens de threads AI |
| 43 | `mastra_resources` | Recursos AI |
| 44 | `mastra_scorers` | Scorers de AI |
| 45 | `mastra_threads` | Threads de AI |
| 46 | `mastra_traces` | Traces de AI |
| 47 | `mastra_workflow_snapshot` | Snapshots de workflow AI |

### Enums (10)
| Enum | Valores |
|------|---------|
| `State` | QUEUE, PUBLISHED, ERROR, DRAFT |
| `SubscriptionTier` | STANDARD, PRO, TEAM, ULTIMATE |
| `Period` | MONTHLY, YEARLY |
| `Provider` | LOCAL, GITHUB, GOOGLE, FARCASTER, WALLET, GENERIC |
| `Role` | SUPERADMIN, ADMIN, USER |
| `OrderStatus` | PENDING, ACCEPTED, CANCELED, COMPLETED |
| `From` | BUYER, SELLER |
| `APPROVED_SUBMIT_FOR_ORDER` | NO, WAITING_CONFIRMATION, YES |
| `ShortLinkPreference` | ASK, YES, NO |
| `AnnouncementColor` | INFO, WARNING, ERROR |

---

## 2. Modelo Organization (Detalhado)

**Arquivo:** `schema.prisma` linhas 11-50

### Campos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (UUID) | PK |
| `name` | String | Nome da organização |
| `description` | String? | **JSON armazenado como string** — contém CompanyProfile |
| `apiKey` | String? | Chave de API |
| `paymentId` | String? | ID de pagamento (Stripe) |
| `streakSince` | DateTime? | Início da streak |
| `createdAt` | DateTime | default now() |
| `updatedAt` | DateTime | @updatedAt |
| `allowTrial` | Boolean | default false |
| `isTrailing` | Boolean | default false |
| `shortlink` | ShortLinkPreference | ASK, YES, NO |

### Relacionamentos (20+)
Organization tem relacionamentos com praticamente todos os modelos do sistema:
- `autoPost`, `Comments`, `credits`, `customers`, `errors`, `github`
- `Integration`, `media`, `notifications`, `plugs`, `post` (2x: como dono e como submissão)
- `sets`, `signatures`, `subscription`, `tags`, `thirdParty`, `usedCodes`
- `users` (via UserOrganization), `webhooks`, `oauthApp`, `oauthAuthorizations`

### Índices
- `apiKey`, `streakSince`, `paymentId`

---

## 3. CompanyProfile — Estrutura (NÃO é modelo Prisma)

**⚠️ CompanyProfile NÃO existe como tabela no banco de dados.**

É um **JSON armazenado no campo `Organization.description`** (String?).

### Como funciona:
1. O campo `description` da Organization contém um JSON serializado
2. Dois formatos possíveis:
   - **Legado** (`__type: "company_profile_v1"`): perfil único
   - **Atual** (`__type: "company_profiles_v2"`): múltiplos perfis com `selectedCompanyId`

### Estrutura do JSON (CompanyProfilePayload)
```typescript
type CompanyProfile = {
  id: string;
  companyName: string;
  website: string;
  industry: string;
  targetAudience: string;
  productsOrServices: string;
  differentials: string;
  toneOfVoice: string;
  summary: string;
  visualIdentitySummary: string;
  brandColors: string;
  brandFonts: string;
  defaultCta: string;
  forbiddenTerms: string;
  contentPreferences: string;
  visualIdentityAssets: VisualIdentityAsset[];
  brandPalettes: BrandPalette[];
  brandFontPresets: BrandFontPreset[];
  brandLogos: BrandLogoAsset[];
  styleRules: StyleRule[];
  inspirationLibrary: CompanyInspiration[];
  ideasLibrary: CompanyIdea[];
  updatedAt: string;
};
```

### Sub-tipos do CompanyProfile
| Tipo | Campos |
|------|--------|
| `VisualIdentityAsset` | id, name, type, dataUrl, description |
| `BrandPalette` | id, name, colors[], usage |
| `BrandFontPreset` | id, name, headline, body, usage |
| `BrandLogoAsset` | id, name, dataUrl, usage, description |
| `StyleRule` | id, type ('do'\|'dont'), text |
| `CompanyInspiration` | id, name, src, source, category, favorite, approved, description |
| `CompanyIdea` | id, title, hook, goal, angle, createdAt |

### Serviços relacionados
- **`OrganizationService`** (`organization.service.ts`): parse, serialize, CRUD de CompanyProfile
- **`OrganizationRepository`** (`organization.repository.ts`): `getCompanyProfile()` e `updateCompanyProfile()` — operam no campo `description` da Organization

### Endpoints (Settings Controller)
| Método | Rota | Função |
|--------|------|--------|
| GET | `/settings/company-profile` | Obter perfil ativo |
| GET | `/settings/company-profiles` | Listar todos os perfis |
| POST | `/settings/company-profile` | Criar/atualizar perfil |
| DELETE | `/settings/company-profile/:id` | Deletar perfil |
| POST | `/settings/company-profile/generate-summary` | Gerar resumo via AI |
| POST | `/settings/company-profile/generate-visual-identity` | Gerar identidade visual via AI |

---

## 4. AI Generation — Estrutura Completa

### 4.1 Serviço Principal
**Arquivo:** `libraries/nestjs-libraries/src/ai-generate/ai-generate.service.ts` (1699 linhas)

### 4.2 DTOs de AI Generation

| DTO | Arquivo | Campos Principais |
|-----|---------|-------------------|
| `AiGenerateCarouselDto` | `ai-generate-carousel.dto.ts` | topic, sourceUrl, sourceText, goal, audience, tone, platform, slideCount (2-10), visualStyle, brandNotes, language, textModel, reviewPayload |
| `AiGenerateCarouselIdeasDto` | `ai-generate-carousel-ideas.dto.ts` | topicHint, companyContext, language, textModel, existingTitles[] |
| `AiGenerateCaptionDto` | `ai-generate-caption.dto.ts` | title, slides[], platform, tone, language, companyContext, forbiddenTerms, defaultCta, textModel |
| `AiGenerateImageDto` | `ai-generate-image.dto.ts` | provider ('ia_generate'\|'openai_official'), prompt, model, n, size, quality, style, response_format, reference_images[], reference_mode ('brand'\|'balanced'\|'inspiration'), persist |

### 4.3 Endpoints de AI Generation

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/ai-generate/images` | Gerar imagem (provider: ia_generate ou openai_official) |
| POST | `/ai-generate/carousel-plan` | Gerar plano completo de carrossel (slides + copy) |
| POST | `/ai-generate/carousel-ideas` | Gerar ideias de carrossel |
| POST | `/ai-generate/carousel-caption` | Gerar legenda + hashtags |
| POST | `/ai-generate/carousel-review` | Revisão editorial do carrossel |
| POST | `/ai-generate/carousel-fix` | Corrigir carrossel com base na revisão |
| POST | `/ai-generate/cost-estimate` | Estimar custo de geração |
| GET | `/ai-generate/cost-history` | Histórico de custos |
| POST | `/ai-generate/carousel-image-jobs` | Iniciar job de imagens do carrossel |
| GET | `/ai-generate/carousel-image-jobs/:id` | Status do job |

### 4.4 Tipos Internos (ai-generate.service.ts)

| Tipo | Descrição |
|------|-----------|
| `CarouselSlide` | index, headline, body, cta, imagePrompt, altText |
| `CarouselPlan` | title, platform, language, caption, hashtags[], imageStyleGuide, slides[] |
| `CarouselImageJob` | id, orgId, status, total, completed, failed, slides[] |
| `CarouselImageJobSlide` | slideIndex, status, request, result, error |
| `AiGenerateCostLedgerEntry` | id, orgId, type, label, cost |
| `CostEstimate` | usd, brl, rates, tokens |
| `NormalizedUsage` | textInputTokens, imageInputTokens, etc. |

### 4.5 OpenAI Service (Legado)
**Arquivo:** `libraries/nestjs-libraries/src/openai/openai.service.ts`

Funções:
- `generateImage()` — DALL-E 3
- `generatePromptForPicture()` — Gera prompt para imagem
- `generateVoiceFromText()` — Converte texto em voz natural
- `generatePosts()` — Gera posts para Twitter
- `extractWebsiteText()` — Extrai texto de site
- `separatePosts()` — Divide post em thread
- `generateSlidesFromText()` — Gera slides de vídeo a partir de texto

### 4.6 Extract Content Service
**Arquivo:** `libraries/nestjs-libraries/src/openai/extract.content.service.ts`

- `extractContent(url)` — Extrai conteúdo textual de uma URL usando JSDOM

---

## 5. Modelo Post (Detalhado)

**Arquivo:** `schema.prisma` linhas 393-444

### Campos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (cuid) | PK |
| `state` | State (enum) | QUEUE, PUBLISHED, ERROR, DRAFT |
| `publishDate` | DateTime | Data de publicação |
| `organizationId` | String | FK → Organization |
| `integrationId` | String | FK → Integration |
| `content` | String | Conteúdo do post |
| `delay` | Int | Atraso em minutos |
| `group` | String | Grupo de postagem |
| `title` | String? | Título |
| `description` | String? | Descrição |
| `parentPostId` | String? | Auto-relacionamento (posts filhos) |
| `releaseId` | String? | ID de release |
| `releaseURL` | String? | URL de release |
| `settings` | String? | Configurações (JSON) |
| `image` | String? | URL da imagem |
| `submittedForOrderId` | String? | FK → Orders |
| `submittedForOrganizationId` | String? | FK → Organization (submissão) |
| `approvedSubmitForOrder` | APPROVED_SUBMIT_FOR_ORDER | NO, WAITING_CONFIRMATION, YES |
| `lastMessageId` | String? | FK → Messages |
| `intervalInDays` | Int? | Intervalo para recorrência |
| `error` | String? | Mensagem de erro |

### Relacionamentos
- `integration` → Integration
- `organization` → Organization (2x: dono e submissão)
- `parentPost` → Post (auto-relacionamento)
- `childrenPost` → Post[]
- `submittedForOrder` → Orders
- `comments` → Comments[]
- `errors` → Errors[]
- `payoutProblems` → PayoutProblems[]
- `lastMessage` → Messages
- `tags` → TagsPosts[]

### Índices (14)
group, deletedAt, publishDate, state, organizationId, parentPostId, submittedForOrderId, intervalInDays, approvedSubmitForOrder, lastMessageId, createdAt, updatedAt, releaseURL, integrationId

---

## 6. Modelo Media (Detalhado)

**Arquivo:** `schema.prisma` linhas 209-231

### Campos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (UUID) | PK |
| `name` | String | Nome do arquivo |
| `originalName` | String? | Nome original |
| `path` | String | Caminho/URL |
| `organizationId` | String | FK → Organization |
| `fileSize` | Int | Tamanho em bytes |
| `type` | String | "image" (default) |
| `thumbnail` | String? | URL do thumbnail |
| `alt` | String? | Texto alternativo |
| `thumbnailTimestamp` | Int? | Timestamp do thumbnail |

### Relacionamentos
- `organization` → Organization
- `agencies` → SocialMediaAgency[] (logo)
- `userPicture` → User[] (foto de perfil)
- `oauthApps` → OAuthApp[] (logo do app)

---

## 7. Modelo Integration (Detalhado)

**Arquivo:** `schema.prisma` linhas 314-356

### Campos Relevantes
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (cuid) | PK |
| `internalId` | String | ID interno da rede social |
| `organizationId` | String | FK → Organization |
| `name` | String | Nome da integração |
| `type` | String | Tipo (instagram, linkedin, etc.) |
| `token` | String | Token de acesso |
| `disabled` | Boolean | Se está desabilitada |
| `postingTimes` | String | JSON com horários de postagem |
| `additionalSettings` | String? | Configurações adicionais (JSON) |

---

## 8. Fluxo de Dados: CompanyProfile → AI Generation → Carrossel → Post

```
Organization.description (JSON)
        │
        ▼
OrganizationService.parseCompanyProfiles()
        │
        ▼
CompanyProfile[] (em memória)
        │
        ▼
AiGenerateService.generateCarouselIdeas()
  → OpenAI API → ideias de carrossel
        │
        ▼
AiGenerateService.generateCarouselPlan()
  → OpenAI API → CarouselPlan (slides + copy)
        │
        ▼
AiGenerateService.reviewCarousel() / fixCarouselWithEditorialReview()
  → OpenAI API → revisão/correção
        │
        ▼
AiGenerateService.startCarouselImageJob()
  → generateImage() para cada slide
  → persistGeneratedImage() → Media model
        │
        ▼
Post (agendado via Integration)
```

---

## 9. Resumo de Campos por Modelo Principal

| Modelo | Total de Campos | Campos Obrigatórios | Relacionamentos |
|--------|----------------|---------------------|-----------------|
| Organization | 11 | 4 (id, name, createdAt, updatedAt) | 20+ |
| User | 22 | 8 (id, email, providerName, timezone, etc.) | 10 |
| Post | 21 | 8 (id, state, publishDate, orgId, integrationId, content, delay, group) | 10 |
| Media | 10 | 5 (id, name, path, orgId, fileSize) | 4 |
| Integration | 22 | 9 (id, internalId, orgId, name, providerIdentifier, type, token, postingTimes) | 6 |
| CompanyProfile | ~22 campos | 1 (companyName) | N/A (JSON embutido) |

---

## 10. Observações e Achados

1. **CompanyProfile não é tabela** — é JSON armazenado em `Organization.description`. Isso significa que consultas SQL não podem filtrar por campos do perfil da empresa.

2. **Duas versões de CompanyProfile**: `company_profile_v1` (legado, perfil único) e `company_profiles_v2` (atual, múltiplos perfis com seleção).

3. **AI Generation é in-memory para jobs**: `carouselImageJobs` e `costLedger` são Maps em memória — jobs e custos são perdidos se o servidor reiniciar.

4. **Dois provedores de imagem**: `ia_generate` (proxy próprio) e `openai_official` (OpenAI direto).

5. **Três modos de referência visual**: `brand` (marca domina), `balanced` (equilíbrio), `inspiration` (inspirações dominam).

6. **Cache de brief visual**: `referenceBriefCache` evita re-descrever as mesmas imagens de referência dentro de 10 minutos.

7. **Mastra AI**: O schema inclui tabelas do Mastra (framework de AI agents) mas estão marcadas com `@@ignore` — não são gerenciadas pelo Prisma Client.

8. **AutoPost**: Modelo que permite agendamento automático com geração de conteúdo via AI (`generateContent: Boolean`).

---

## 11. Arquivos Analisados

| Arquivo | Linhas | Relevância |
|---------|--------|------------|
| `schema.prisma` | 959 | Schema completo do banco |
| `organization.service.ts` | 820 | Lógica de CompanyProfile + AI generation |
| `organization.repository.ts` | 456 | Acesso a dados da Organization |
| `ai-generate.service.ts` | 1699 | Serviço principal de AI generation |
| `openai.service.ts` | 271 | Serviço OpenAI legado |
| `extract.content.service.ts` | 92 | Extração de conteúdo de URLs |
| `company-profile.dto.ts` | 149 | DTO de CompanyProfile |
| `company-profile-summary.dto.ts` | 138 | DTO de CompanyProfile (resumo) |
| `ai-generate-carousel.dto.ts` | 82 | DTO de geração de carrossel |
| `ai-generate-carousel-ideas.dto.ts` | 40 | DTO de ideias de carrossel |
| `ai-generate-caption.dto.ts` | 48 | DTO de legenda |
| `ai-generate-image.dto.ts` | 116 | DTO de geração de imagem |
| `ai-generate.controller.ts` | 103 | Endpoints de AI generation |
| `settings.controller.ts` | (referenciado) | Endpoints de CompanyProfile |
