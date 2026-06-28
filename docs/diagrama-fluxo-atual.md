# Diagrama do Fluxo Atual de Carrossel — ContentFlow

> Gerado em: 2026-06-28
> Baseado em: `docs/auditoria-arquitetura-atual.md` e `docs/auditoria-endpoints.md`

```mermaid
flowchart TD
    %% ===== ESTILOS =====
    classDef frontend fill:#e1f5fe,stroke:#0288d1,stroke-width:2px
    classDef backend fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef service fill:#f3e5f5,stroke:#7b1fa2,stroke-width:1px
    classDef persistence fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    classDef risk fill:#ffebee,stroke:#d32f2f,stroke-width:2px,stroke-dasharray:5 5
    classDef external fill:#fce4ec,stroke:#c2185b,stroke-width:1px
    classDef userAction fill:#fff8e1,stroke:#f9a825,stroke-width:2px

    %% ===== USUÁRIO =====
    User[\"👤 Usuário\"]:::userAction

    %% ===== FRONTEND =====
    subgraph FE [📱 Frontend — Next.js]
        direction TB
        CarouselStudio["/ai-generate-images\nAI Carousel Studio"]:::frontend
        BrandKit["/settings/company-profiles\nBrand Kit"]:::frontend
        MediaLibrary["/media\nBiblioteca de Mídia"]:::frontend
        Launches["/launches\nCalendário / Criar Post"]:::frontend

        subgraph ReactState [🧠 Estado React — Volátil]
            stateIdeas["📋 Ideias geradas"]
            statePlan["📄 Plano textual"]
            stateCaption["💬 Caption + Hashtags"]
            stateReview["🔍 Revisão editorial"]
        end
        style ReactState fill:#e3f2fd,stroke:#1565c0,stroke-dasharray:4 4
    end

    %% ===== BACKEND =====
    subgraph BE [⚙️ Backend — NestJS]
        direction TB

        %% AI Generate Controller
        subgraph AICtrl [🎮 AI Generate Controller /ai-generate/*]
            epIdeas["POST /carousel-ideas\n→ Gera ideias"]
            epPlan["POST /carousel-plan\n→ Gera plano"]
            epReview["POST /carousel-review\n→ Revisão editorial"]
            epCaption["POST /carousel-caption\n→ Caption + hashtags"]
            epImageJobs("POST /carousel-image-jobs\n→ Dispara jobs assíncronos")
            epImage["POST /images\n→ Gera imagem individual"]
            epCost["POST /cost-estimate\n→ Estima custos"]
            epCostHist["GET /cost-history\n→ Histórico de custos"]
        end
        style AICtrl fill:#fff3e0,stroke:#f57c00

        %% Settings Controller
        subgraph SettCtrl [🎮 Settings Controller /settings/*]
            epGetProfile["GET /company-profile\n→ Perfil selecionado"]
            epSaveProfile["POST /company-profiles\n→ Salva coleção"]
            epGenSummary["POST /company-profile/generate-summary\n→ Gera resumo via OpenAI"]
        end
        style SettCtrl fill:#fff3e0,stroke:#f57c00

        %% Media Controller
        subgraph MediaCtrl [🎮 Media Controller /media/*]
            epSaveCarousel["POST /carousel\n→ Salva carrossel em mídia"]
            epListMedia["GET /\n→ Lista mídia"]
        end
        style MediaCtrl fill:#fff3e0,stroke:#f57c00

        %% Posts Controller
        subgraph PostsCtrl [🎮 Posts Controller /posts/*]
            epCreatePost["POST /\n→ Cria post no calendário"]
            epGenPost["POST /generator\n→ Gera post via Agent Graph"]
        end
        style PostsCtrl fill:#fff3e0,stroke:#f57c00

        %% === SERVIÇOS ===
        subgraph Services [🔧 Services]
            AiGenSvc["AiGenerateService"]:::service
            OrgSvc["OrganizationService"]:::service
            MediaSvc["MediaService"]:::service
            PostsSvc["PostsService"]:::service

            subgraph InternalSvc [📦 Serviços Internos]
                ExtractSvc["ExtractContentService"]
                OpenAISvc["OpenAiService"]
            end
            style InternalSvc fill:#f3e5f5,stroke:#7b1fa2,stroke-dasharray:3 3
        end

        %% ===== PONTOS DE FALHA — RISCO =====
        subgraph RiskArea [⚠️ RISCO — Estado em Memória]
            direction TB
            inMemJobs["🗺️ carouselImageJobs\nMap<string, CarouselImageJob>\nJobs de imagem voláteis"]:::risk
            inMemCosts["🗺️ costLedger\nMap<string, CostEntry[]>\nHistórico de custos volátil"]:::risk
            jsonDescription["⚠️ CompanyProfile\nJSON em Organization.description\nSem índices, sem isolamento"]:::risk
        end
    end

    %% ===== PERSISTÊNCIA =====
    subgraph DB [💾 Persistência — Prisma + PostgreSQL]
        OrgTable["📁 Organization\n• description (JSON com CompanyProfile)
                    • name, slug, etc."]:::persistence
        MediaTable["📁 Media\n• Slides de carrossel como mídia
                    • Metadados no campo alt
                    • Prefixo __CONTENTFLOW_CAROUSEL_PROJECT__:"]:::persistence
        PostTable["📁 Post\n• Posts no calendário
                    • Referencia mídia"]:::persistence
    end

    %% ===== PROVIDERS EXTERNOS =====
    subgraph Ext [🌐 Providers Externos]
        OpenAI["🤖 OpenAI API\n• Ideias, plano, caption, revisão
                 • Geração de texto e imagem"]:::external
        IA_Gen["🎨 ia_generate (custom)\n• Geração de imagem
                 • Provider principal"]:::external
    end

    %% ===== FLUXO PRINCIPAL =====
    User -->|"1. Acessa"| CarouselStudio

    %% 1. Configuração
    CarouselStudio -->|"2. Define parâmetros\ntema, slides, tom, etc."| epIdeas

    %% 2-6. Geração de conteúdo (texto → OpenAI)
    epIdeas -->|"3. Gera ideias"| AiGenSvc
    AiGenSvc -->|"texto"| OpenAISvc
    OpenAISvc -->|"OpenAI"| OpenAI
    OpenAI -->|"ideias"| AiGenSvc
    AiGenSvc -->|"ideias"| epIdeas
    epIdeas -.->|"📋 Estado React"| stateIdeas

    stateIdeas -->|"4. Plano"| epPlan
    epPlan --> AiGenSvc --> OpenAISvc --> OpenAI
    OpenAI -->|"plano textual"| AiGenSvc --> epPlan
    epPlan -.->|"📋 Estado React"| statePlan

    statePlan -->|"5. Revisão"| epReview
    epReview --> AiGenSvc --> OpenAISvc --> OpenAI
    OpenAI -->|"revisão"| AiGenSvc --> epReview
    epReview -.->|"📋 Estado React"| stateReview

    stateReview -->|"6. Caption"| epCaption
    epCaption --> AiGenSvc --> OpenAISvc --> OpenAI
    OpenAI -->|"caption + hashtags"| AiGenSvc --> epCaption
    epCaption -.->|"📋 Estado React"| stateCaption

    %% 7. Jobs de imagem (RISCO)
    stateCaption -->|"7. Gerar imagens"| epImageJobs
    epImageJobs -->|"Cria job assíncrono"| AiGenSvc
    AiGenSvc -->|"🧠 Armazena em"| inMemJobs
    inMemJobs -.->|"⚠️ Volátil — perdido em restart"| inMemJobs

    %% 8. Geração de imagem por slide
    inMemJobs -->|"8. Para cada slide"| epImage
    epImage --> AiGenSvc
    AiGenSvc -->|"Gera imagem"| IA_Gen
    IA_Gen -->|"imagem"| AiGenSvc
    AiGenSvc -->|"Fallback"| OpenAISvc --> OpenAI
    AiGenSvc -->|"Persiste"| MediaSvc

    %% 9. Salvar carrossel
    AiGenSvc -->|"imagens salvas"| epImage
    epImage -->|"9. Usuário salva\ncarrossel completo"| epSaveCarousel
    epSaveCarousel --> MediaSvc
    MediaSvc -->|"Salva cada slide\ncomo mídia"| MediaTable
    MediaTable -.->|"📌 Metadados no alt
                      (string, sem relations)"| MediaTable

    %% 10. Criar post
    MediaTable -->|"10. Usa mídia salva"| MediaLibrary
    MediaLibrary --> Launches
    Launches --> epCreatePost
    epCreatePost --> PostsSvc --> PostTable

    %% ===== COMPANY PROFILE =====
    BrandKit -->|"Carrega perfil"| epGetProfile
    epGetProfile --> OrgSvc
    OrgSvc -->|"JSON.parse(description)"| OrgTable
    OrgTable -->|"description (JSON)"| OrgSvc
    OrgSvc -->|"parseCompanyProfiles()"| jsonDescription
    jsonDescription -.->|"⚠️ v1 (único) e v2 (coleção)\ncoexistindo no mesmo campo"| jsonDescription

    BrandKit -->|"Salva perfil"| epSaveProfile
    epSaveProfile --> OrgSvc
    OrgSvc -->|"serializeCompanyProfiles()\n→ JSON.stringify"| OrgTable

    %% ===== CUSTOS =====
    AiGenSvc -->|"Registra custo"| inMemCosts
    epCostHist -->|"Lê Map em memória"| inMemCosts
    inMemCosts -.->|"⚠️ Volátil — perdido em restart\nSem auditoria"| inMemCosts

    %% ===== LINKS DE CONSULTA =====
    epListMedia --> MediaSvc --> MediaTable

    %% ===== LEGENDA =====
    subgraph Legend [📖 Legenda]
        L1["📱 Frontend — Telas e estado React"]:::frontend
        L2["⚙️ Backend — Controllers e endpoints"]:::backend
        L3["🔧 Services — Lógica de negócio"]:::service
        L4["💾 Persistência — Prisma / PostgreSQL"]:::persistence
        L5["⚠️ RISCO — Pontos de falha conhecidos"]:::risk
        L6["🌐 Providers — APIs externas"]:::external
        L7["🟡 Ação do usuário"]:::userAction
    end
```

---

## Resumo do Fluxo em Etapas

| # | Etapa | Endpoint | Persiste? | Risco |
|---|-------|----------|-----------|-------|
| 1 | Usuário acessa `/ai-generate-images` | — | ❌ | — |
| 2 | Define parâmetros do carrossel | — | ❌ (estado React) | 🟡 Perdido ao recarregar |
| 3 | Gera ideias | `POST /ai-generate/carousel-ideas` → OpenAI | ❌ (estado React) | 🟡 Perdido ao recarregar |
| 4 | Gera plano textual | `POST /ai-generate/carousel-plan` → OpenAI | ❌ (estado React) | 🟡 Perdido ao recarregar |
| 5 | Revisão editorial | `POST /ai-generate/carousel-review` → OpenAI | ❌ (estado React) | 🟡 Perdido ao recarregar |
| 6 | Gera caption + hashtags | `POST /ai-generate/carousel-caption` → OpenAI | ❌ (estado React) | 🟡 Perdido ao recarregar |
| 7 | 🚨 Dispara jobs de imagem | `POST /ai-generate/carousel-image-jobs` | ❌ (Map em memória) | 🔴 **Volátil — perdido em restart** |
| 8 | Gera imagem por slide | `POST /ai-generate/images` | ✅ MediaService | 🟡 Fallback entre providers |
| 9 | Salva carrossel | `POST /media/carousel` | ✅ Media (slides como mídia) | 🟡 Metadados no campo `alt` (string) |
| 10 | Cria post no calendário | `POST /posts` | ✅ Post | — |

## Pontos de Falha em Destaque

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ⚠️ RISCOS CRÍTICOS                           │
├─────────────────────────────────────────────────────────────────────┤
│ 🔴 ALTA — Jobs de imagem em Map<String, CarouselImageJob>          │
│   • Perdido em restart/deploy sem aviso                             │
│   • Sem fila, sem retry, sem observabilidade                        │
│   • Sem limite por organização                                      │
├─────────────────────────────────────────────────────────────────────┤
│ 🔴 ALTA — CompanyProfile em JSON no Organization.description        │
│   • Sem índices, sem isolamento multi-brand                         │
│   • Dois formatos (v1/v2) coexistindo                               │
│   • parseCompanyProfiles() faz migração na leitura                  │
├─────────────────────────────────────────────────────────────────────┤
│ 🔴 ALTA — Histórico de custos em Map<String, CostEntry[]>          │
│   • Perdido em restart                                              │
│   • Sem auditoria passada                                           │
│   • Impossível implementar billing por plano                        │
├─────────────────────────────────────────────────────────────────────┤
│ 🟡 MÉDIA — Plano textual e ideias só no estado React               │
│   • Perdido ao recarregar a página                                  │
│   • Usuário precisa re-gerar                                        │
├─────────────────────────────────────────────────────────────────────┤
│ 🟡 MÉDIA — Carrossel sem tabela própria                             │
│   • Slides vinculados apenas por prefixo no alt                     │
│   • Sem vínculo com Brand DNA ou ContentIdea                        │
│   • Sem status editorial ou aprovação                               │
└─────────────────────────────────────────────────────────────────────┘
```
