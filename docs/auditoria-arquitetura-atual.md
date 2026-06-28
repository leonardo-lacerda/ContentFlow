# Auditoria Técnica — Arquitetura Atual do Fluxo de Carrossel

> Gerado em: 2026-06-28
> Projeto: ContentFlow
> Foco: Mapeamento do fluxo ponta a ponta de geração de carrosséis

---

## 1. Fluxo Atual do AI Carousel Studio

### 1.1 Telas e Rotas

| Rota Frontend | Descrição |
|--------------|-----------|
| `/ai-generate-images` | AI Carousel Studio — tela principal de geração de carrosséis |
| `/settings/company-profiles` | Gerenciamento de perfil de marca/empresa |
| `/media` | Biblioteca de mídia |
| `/launches` | Calendário e criação de posts |

### 1.2 Fluxo Ponta a Ponta

```
1. Usuário acessa /ai-generate-images
   ↓
2. Define: tema, URL/texto fonte, objetivo, público, tom, plataforma,
   nº de slides, estilo visual, notas de marca, idioma
   ↓
3. Backend chama POST /ai-generate/carousel-ideas →
   AiGenerateService → OpenAI → retorna ideias
   ↓
4. BACKEND chama POST /ai-generate/carousel-plan →
   AiGenerateService → OpenAI → retorna plano textual
   ↓
5. BACKEND chama POST /ai-generate/carousel-review →
   AiGenerateService → OpenAI → revisão editorial
   ↓
6. BACKEND chama POST /ai-generate/carousel-caption →
   AiGenerateService → OpenAI → caption + hashtags
   ↓
7. BACKEND inicia POST /ai-generate/carousel-image-jobs →
   jobs assíncronos em memória (Map) para gerar imagens por slide
   ↓
8. BACKEND chama POST /ai-generate/images por slide →
   gera imagens via provider (ia_generate ou openai_official)
   ↓
9. Usuário salva carrossel via POST /media/carousel →
   salva slides como mídia individual com metadados
   ↓
10. Usuário cria post em /launches usando a mídia salva
```

### 1.3 Endpoints Envolvidos

| Sequência | Método | Rota | DTO | Persistência |
|-----------|--------|------|-----|-------------|
| 3 | POST | `/ai-generate/carousel-ideas` | `AiGenerateCarouselIdeasDto` | Nenhuma (estado React) |
| 4 | POST | `/ai-generate/carousel-plan` | `AiGenerateCarouselDto` | Nenhuma (estado React) |
| 5 | POST | `/ai-generate/carousel-review` | `AiGenerateCarouselDto` | Nenhuma (estado React) |
| 6 | POST | `/ai-generate/carousel-caption` | `AiGenerateCaptionDto` | Nenhuma (estado React) |
| 7 | POST | `/ai-generate/carousel-image-jobs` | Inline | **Map em memória** |
| 8 | POST | `/ai-generate/images` | `AiGenerateImageDto` | MediaService (salva imagem) |
| 9 | POST | `/media/carousel` | `SaveMediaCarouselDto` | MediaRepository (mídia+alt) |

**Conclusão:** Todo o plano textual, ideias e revisões vivem apenas no estado do React. Jobs de imagem e custos vivem em Mapas em memória no backend. **Nada é persistido em banco até o usuário salvar voluntariamente.**

---

## 2. CompanyProfile — Estado Atual

### 2.1 Armazenamento

**⚠️ CompanyProfile NÃO tem tabela própria.**

Os dados de perfil de marca/empresa são armazenados como **JSON serializado no campo `description` da tabela `Organization`** do Prisma.

### 2.2 Formatos

Dois formatos coexistem no mesmo campo:

| Formato | Tipo | Descrição |
|---------|------|-----------|
| **v1** (legado) | `__type: "company_profile_v1"` | Perfil único |
| **v2** (atual) | `__type: "company_profiles_v2"` | Coleção de múltiplos perfis com `selectedCompanyId` |

A migração entre formatos é feita em `parseCompanyProfiles()` no service.

### 2.3 Endpoints

| Método | Rota | Ação |
|--------|------|------|
| GET | `/settings/company-profile` | Retorna perfil selecionado |
| GET | `/settings/company-profiles` | Retorna coleção |
| POST | `/settings/company-profile` | Cria/atualiza perfil único (Admin) |
| POST | `/settings/company-profiles` | Cria/atualiza coleção (Admin) |
| DELETE | `/settings/company-profiles/:id` | Remove perfil da coleção (Admin) |
| POST | `/settings/company-profile/generate-summary` | Gera resumo via OpenAI + extração de site |
| POST | `/settings/company-profiles/generate-visual-identity` | Gera identidade visual via modelo de visão |

### 2.4 Fluxo de dados

```
Controller → OrganizationService → OrganizationRepository → Prisma
                                 ↓
                    parseCompanyProfiles() — JSON.parse(description)
                                 ↓
                    serializeCompanyProfiles() — JSON.stringify → update
```

### 2.5 Campos do CompanyProfileDto

| Categoria | Campos |
|-----------|--------|
| **Identificação** | `id`, `companyName`, `website`, `industry` |
| **Negócio** | `targetAudience`, `productsOrServices`, `differentials` |
| **Voz** | `toneOfVoice`, `summary`, `defaultCta`, `forbiddenTerms` |
| **Visual** | `visualIdentitySummary`, `brandColors`, `brandFonts` |
| **Assets** | `visualIdentityAssets[]`, `brandPalettes[]`, `brandFontPresets[]`, `brandLogos[]` |
| **Regras** | `styleRules[]` |
| **Referências** | `inspirationLibrary[]`, `ideasLibrary[]` |
| **Preferências** | `contentPreferences` |

---

## 3. Salvamento de Carrossel em Media

### 3.1 Como funciona hoje

Carrosséis são salvos via `POST /media/carousel` com o DTO `SaveMediaCarouselDto`:

- Cada slide vira um registro de mídia individual
- Metadados do projeto são armazenados no campo `alt` da mídia com prefixo `__CONTENTFLOW_CAROUSEL_PROJECT__:`
- Imagens podem ser enviadas como base64 ou URL

### 3.2 Limitações

- Não há uma entidade `CarouselProject` no banco
- O vínculo entre slides é puramente textual (prefixo no `alt`)
- Não há relação com Brand DNA ou ContentIdea
- Não há status editorial ou de aprovação

---

## 4. Jobs e Estado em Memória — Riscos

### 4.1 Jobs de Imagem

Estão em `AiGenerateService.carouselImageJobs` como `Map<string, CarouselImageJob>`.

| Problema | Impacto |
|----------|---------|
| **Volátil** | Perdido em restart/deploy sem aviso |
| **Sem fila** | Concorrência não gerenciada |
| **Sem retry** | Falha de provider = falha total |
| **Sem observabilidade** | Operador não vê jobs em andamento |
| **Sem limite por org** | Uma org pode consumir todos os recursos |

### 4.2 Histórico de Custos

Está em `AiGenerateService.costLedger` como `Map<string, CostEntry[]>`.

| Problema | Impacto |
|----------|---------|
| **Volátil** | Perdido em restart |
| **Sem auditoria** | Não é possível auditar custos passados |
| **Sem billing** | Impossível implementar limites de plano |

---

## 5. Providers de IA

| Provider | Uso | Endpoints |
|----------|-----|-----------|
| `ia_generate` (custom) | Geração de imagem principal | `/ai-generate/images` |
| `openai_official` (OpenAI) | Geração de imagem alternativa + texto | Vários endpoints |

- Todas as chamadas de texto (ideias, plano, caption, review) usam OpenAI
- Geração de imagem tem fallback entre os dois providers
- Não há abstração de provider para fácil adição de novos

---

## 6. Riscos Identificados

| # | Risco | Severidade | Impacto |
|---|-------|------------|---------|
| 1 | CompanyProfile em JSON no `Organization.description` | **ALTA** | Sem índices, sem isolamento multi-brand, sem versionamento |
| 2 | Jobs de imagem em memória | **ALTA** | Perdidos em restart, sem retry, sem observabilidade |
| 3 | Custos em memória | **ALTA** | Sem auditoria, sem billing por plano |
| 4 | Plano textual só no estado React | **MÉDIA** | Perdido ao recarregar página |
| 5 | Sem tabela de CarouselProject | **MÉDIA** | Sem vínculo entre slides, sem status editorial |
| 6 | Sem vínculo entre Brand DNA e carrossel gerado | **MÉDIA** | Carrossel não sabe qual marca gerou |
| 7 | Dois controllers fazem geração de imagem | **BAIXA** | Duplicação de lógica |
| 8 | Sem versionamento de prompts/schemas de IA | **MÉDIA** | Impossível comparar versões de prompt |

---

## 7. Diagrama do Fluxo Atual

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│  ┌─────────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │ /ai-generate-   │  │ /settings/   │  │    /media           │  │
│  │   images        │  │ company-     │  │    (Biblioteca)     │  │
│  │ (Carousel       │  │ profiles     │  │                     │  │
│  │  Studio)        │  │ (Brand Kit)  │  │ ┌───────────────┐   │  │
│  │                 │  │              │  │ │Carrosséis     │   │  │
│  │ Estado React:   │  └──────┬───────┘  │ │salvos como    │   │  │
│  │ - ideias        │         │          │ │mídia + alt    │   │  │
│  │ - plano textual │         │          │ └───────────────┘   │  │
│  │ - caption       │         │          └─────────────────────┘  │
│  └────────┬────────┘         │                                    │
│           │                  │                                    │
└───────────┼──────────────────┼────────────────────────────────────┘
            │                  │
            ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (NestJS)                          │
│                                                                  │
│  ┌─────────────────────────────────┐  ┌──────────────────────┐  │
│  │   AI Generate Controller         │  │  Settings Controller  │  │
│  │   (/ai-generate/*)               │  │  (/settings/*)        │  │
│  │                                  │  │                       │  │
│  │  AiGenerateService               │  │  OrganizationService  │  │
│  │  ┌────────────────────────────┐ │  │                       │  │
│  │  │ carouselImageJobs (Map)    │ │  │  ↓                     │  │
│  │  │ costLedger (Map)           │ │  │  OrgRepository         │  │
│  │  └────────────────────────────┘ │  │  ↓                     │  │
│  │         ↓                       │  │  Prisma: Organization  │  │
│  │  ExtractContentService          │  │  .description (JSON)   │  │
│  │  OpenAiService                  │  └──────────────────────┘  │
│  └─────────────────────────────────┘                             │
│                                                                  │
│  ┌─────────────────────────────────┐                             │
│  │   Media Controller               │                             │
│  │   (/media/*)                     │                             │
│  │                                  │                             │
│  │  MediaService                    │                             │
│  │  ↓                               │                             │
│  │  MediaRepository                 │                             │
│  │  ↓                               │                             │
│  │  Prisma: Media (slides)          │                             │
│  └─────────────────────────────────┘                             │
│                                                                  │
│  ┌─────────────────────────────────┐                             │
│  │   Posts Controller               │                             │
│  │   (/posts/*)                     │                             │
│  └─────────────────────────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```
