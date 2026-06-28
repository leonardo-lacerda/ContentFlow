# Especificação de Métricas de Sucesso — ContentFlow

> **Versão:** 1.0  
> **Data:** 2026-06-28  
> **Baseado em:** `docs/plano-implementacao-tryholo-contentflow.md` (seção 6.1.2)  
> **Ferramentas:** PostHog (identify + capture), Plausible (eventos), hook `useFireEvents()`

---

## Índice

1. [Eventos de Produto](#1-eventos-de-produto)
2. [KPIs — Definição, Fórmula e Coleta](#2-kpis)
3. [Funil Principal](#3-funil-principal)
4. [Painéis Mínimos](#4-painéis-mínimos)
5. [Eventos de Custo](#5-eventos-de-custo)
6. [Referência: Nomes de Propriedades e Boas Práticas](#6-referência)

---

## 1. Eventos de Produto

Cada evento abaixo deve ser disparado via `useFireEvents(name, props)` (frontend) ou diretamente `posthog.capture()` + `plausible()` (backend).  
Todas as propriedades comuns (`organizationId`, `userId`) são incluídas automaticamente pelo hook via `useUser()`.

### 1.1 Onboarding e Marca

| # | Evento | Origem | Quando disparar | Propriedades obrigatórias |
|---|--------|--------|----------------|---------------------------|
| 1 | `brand_onboarding_started` | Frontend | Usuário inicia wizard de onboarding (informa nome da marca e site) | `brandName`, `website`, `source` (signup / manual / invite) |
| 2 | `brand_url_analysis_requested` | Frontend | Usuário clica "Analisar site" | `brandProfileId`, `website`, `sourceType` (onboarding / settings) |
| 3 | `brand_url_analysis_completed` | Backend | Job de extração textual finaliza com sucesso | `brandProfileId`, `jobId`, `durationMs`, `pagesExtracted`, `textLength`, `model`, `promptVersion` |
| 4 | `brand_url_analysis_failed` | Backend | Job de extração textual falha | `brandProfileId`, `jobId`, `errorType` (timeout / ssrf_blocked / parse_error / provider_error), `errorMessage` |
| 5 | `brand_dna_generated` | Backend | IA sintetiza Brand DNA completo | `brandProfileId`, `jobId`, `durationMs`, `model`, `promptVersion`, `confidenceScore` (média), `hasVisualInference` |
| 6 | `brand_dna_approved` | Frontend | Usuário aprova/revisa e confirma Brand DNA | `brandProfileId`, `snapshotVersion`, `editCount` (quantos campos o usuário alterou), `durationOnReview` (tempo na tela de revisão) |
| 7 | `brand_dna_rejected` | Frontend | Usuário rejeita ou pede reanálise do Brand DNA | `brandProfileId`, `reason` (inaccurate / incomplete / other) |
| 8 | `brand_profile_created_manual` | Frontend | Usuário cria marca manualmente (sem site) | `brandProfileId`, `industry`, `hasVisualIdentity` |
| 9 | `brand_profile_activated` | Backend | Marca muda para status `active` | `brandProfileId`, `source` (onboarding / manual / reanalysis) |
| 10 | `brand_switched` | Frontend | Usuário troca marca ativa no seletor | `brandProfileId`, `previousBrandProfileId` |

### 1.2 Content Swipe (Ideias)

| # | Evento | Origem | Quando disparar | Propriedades obrigatórias |
|---|--------|--------|----------------|---------------------------|
| 11 | `ideas_generation_requested` | Frontend | Usuário solicita geração de ideias | `brandProfileId`, `template`, `objective`, `channel`, `count` (qtde solicitada) |
| 12 | `ideas_generation_completed` | Backend | Job de geração de ideias finaliza | `brandProfileId`, `jobId`, `ideasCount`, `durationMs`, `model`, `promptVersion`, `totalCostEstimate` |
| 13 | `ideas_generation_failed` | Backend | Job de geração de ideias falha | `brandProfileId`, `jobId`, `errorType`, `errorMessage` |
| 14 | `idea_approved` | Frontend | Usuário aprova ideia no Content Swipe | `ideaId`, `brandProfileId`, `template`, `objective`, `channel`, `timeOnCard` (ms), `swipeDirection` (right / click) |
| 15 | `idea_rejected` | Frontend | Usuário descarta ideia | `ideaId`, `brandProfileId`, `reason` (not_relevant / already_done / bad_hook / other), `timeOnCard` (ms) |
| 16 | `idea_saved_for_later` | Frontend | Usuário salva ideia para revisar depois | `ideaId`, `brandProfileId` |
| 17 | `swipe_session_completed` | Frontend | Usuário sai da tela de swipe | `brandProfileId`, `ideasPresented`, `ideasApproved`, `ideasRejected`, `ideasSaved`, `sessionDurationMs` |

### 1.3 Geração de Carrossel

| # | Evento | Origem | Quando disparar | Propriedades obrigatórias |
|---|--------|--------|----------------|---------------------------|
| 18 | `carousel_creation_started` | Frontend | Usuário inicia criação a partir de ideia aprovada | `projectId`, `ideaId`, `brandProfileId`, `template`, `objective`, `channel`, `slideCount` |
| 19 | `carousel_plan_generated` | Backend | IA gera plano textual do carrossel | `projectId`, `durationMs`, `model`, `promptVersion`, `slideCount`, `totalCostEstimate` |
| 20 | `carousel_plan_approved` | Frontend | Usuário aprova o plano textual | `projectId`, `editsCount` (alterações que fez) |
| 21 | `carousel_plan_rejected` | Frontend | Usuário rejeita plano e pede regeneração | `projectId`, `reason` |
| 22 | `carousel_image_generation_started` | Backend | Job de imagens do carrossel é iniciado | `projectId`, `jobId`, `slideCount`, `provider`, `model`, `estimatedCost` |
| 23 | `carousel_slide_image_generated` | Backend | Imagem de um slide é gerada | `projectId`, `jobId`, `slideIndex`, `provider`, `model`, `cost`, `durationMs`, `success`, `attempts` |
| 24 | `carousel_image_generation_completed` | Backend | Todas as imagens do projeto foram geradas | `projectId`, `jobId`, `totalSlides`, `successfulSlides`, `failedSlides`, `totalDurationMs`, `totalCost`, `provider` |
| 25 | `carousel_image_generation_failed` | Backend | Job de imagens falha completamente | `projectId`, `jobId`, `errorType`, `errorMessage`, `failedSlides`, `retries` |
| 26 | `carousel_editor_opened` | Frontend | Usuário abre editor visual de carrossel | `projectId`, `slideCount`, `template` |
| 27 | `carousel_slide_edited` | Frontend | Usuário edita um slide (headline, corpo, CTA, imagem) | `projectId`, `slideIndex`, `editedField` (headline / body / cta / image / order), `hasRegeneratedImage` |
| 28 | `carousel_saved_to_media` | Frontend | Usuário salva carrossel na biblioteca de mídia | `projectId`, `brandProfileId`, `slideCount`, `editsCount`, `timeInEditorMs` |
| 29 | `carousel_post_scheduled` | Frontend | Usuário agenda post no calendário | `projectId`, `postId`, `channel`, `scheduledDate`, `timeInEditorMs`, `hasEdits` |
| 30 | `carousel_post_published` | Backend | Post é publicado (via Temporal ou job) | `projectId`, `postId`, `channel`, `publishedAt`, `provider` |

### 1.4 Edição e Revisão

| # | Evento | Origem | Quando disparar | Propriedades obrigatórias |
|---|--------|--------|----------------|---------------------------|
| 31 | `editorial_review_completed` | Backend | IA completa revisão editorial automática | `projectId`, `score`, `issuesCount`, `blockersCount`, `warningsCount`, `model` |
| 32 | `editorial_correction_applied` | Frontend | Usuário aplica correção automática | `projectId`, `issuesFixed`, `scoreBefore`, `scoreAfter` |
| 33 | `carousel_exported` | Frontend | Usuário exporta carrossel (PNG/PDF) | `projectId`, `format`, `slideCount` |

### 1.5 Geração Automática e Workflow

| # | Evento | Origem | Quando disparar | Propriedades obrigatórias |
|---|--------|--------|----------------|---------------------------|
| 34 | `auto_generation_plan_configured` | Frontend | Usuário configura plano editorial automático | `brandProfileId`, `frequency`, `channels`, `pillars`, `costLimit`, `startDate` |
| 35 | `auto_generation_batch_completed` | Backend | Worker Temporal gera lote automático | `brandProfileId`, `batchId`, `projectsCreated`, `totalDurationMs`, `totalCost` |
| 36 | `approval_workflow_started` | Backend | Carrossel enviado para aprovação de equipe | `projectId`, `approversCount`, `organizationId` |
| 37 | `approval_granted` | Frontend/Backend | Aprovador aprova carrossel | `projectId`, `approvedById`, `commentsCount` |
| 38 | `approval_rejected` | Frontend/Backend | Aprovador recusa carrossel | `projectId`, `rejectedById`, `reason` |

### 1.6 Performance e Analytics

| # | Evento | Origem | Quando disparar | Propriedades obrigatórias |
|---|--------|--------|----------------|---------------------------|
| 39 | `carousel_performance_collected` | Backend | Worker coleta métricas de post publicado | `postId`, `projectId`, `channel`, `impressions`, `reach`, `engagementRate`, `saves`, `shares`, `comments`, `clicks` |
| 40 | `carousel_performance_benchmarked` | Backend | Sistema compara performance vs baseline da marca | `projectId`, `template`, `channel`, `zScore` (desvio da média), `percentile` |

### 1.7 Técnico — Jobs e Custos

| # | Evento | Origem | Quando disparar | Propriedades obrigatórias |
|---|--------|--------|----------------|---------------------------|
| 41 | `generation_job_queued` | Backend | Job entra na fila Temporal | `jobId`, `jobType` (brand_dna / ideas / carousel_plan / image / caption), `organizationId`, `provider`, `estimatedCost` |
| 42 | `generation_job_started` | Backend | Job começa a executar | `jobId`, `jobType`, `provider`, `model` |
| 43 | `generation_job_completed` | Backend | Job finaliza com sucesso | `jobId`, `jobType`, `durationMs`, `cost`, `tokensUsed`, `model`, `provider`, `retryCount` |
| 44 | `generation_job_failed` | Backend | Job falha após todas as tentativas | `jobId`, `jobType`, `errorType`, `errorMessage`, `retryCount`, `willRetry`, `sentToDlq` |
| 45 | `generation_job_retried` | Backend | Job é retentado | `jobId`, `jobType`, `attemptNumber`, `reason`, `backoffMs` |
| 46 | `generation_job_dead_letter` | Backend | Job vai para dead-letter queue | `jobId`, `jobType`, `organizationId`, `errorType`, `attempts` |
| 47 | `provider_circuit_broken` | Backend | Circuit breaker abre para um provider | `provider`, `model`, `errorRate`, `windowDurationMs` |
| 48 | `provider_circuit_half_open` | Backend | Circuit breaker testa provider novamente | `provider`, `model` |
| 49 | `token_usage_recorded` | Backend | Uso de tokens é registrado (pode ser batch) | `jobId`, `organizationId`, `provider`, `model`, `promptTokens`, `completionTokens`, `totalTokens`, `cost`, `operationType` |

---

## 2. KPIs

### 2.1 Métricas de Ativação e Produto

| KPI | Fórmula | Fonte de dados | Frequência | Alvo sugerido |
|-----|---------|---------------|-----------|---------------|
| **Tempo até primeiro carrossel gerado** | Mediana (e P50/P95) do timestamp de `carousel_image_generation_completed` - `brand_onboarding_started` por usuário | Eventos 1 → 24 | Diária | < 10 min (P50), < 30 min (P95) |
| **% de usuários que completam Brand DNA** | `brand_dna_approved` / `brand_onboarding_started` por coorte (7d / 30d) | Eventos 1, 6 | Diária | > 60% |
| **Taxa de aprovação no swipe** | `idea_approved` / (`idea_approved` + `idea_rejected`) | Eventos 14, 15 | Diária | > 40% |
| **% de carrosséis gerados que chegam ao post** | `carousel_post_published` / `carousel_image_generation_completed` | Eventos 24, 30 | Diária | > 30% |
| **% de carrosséis gerados que são editados** | `carousel_slide_edited` (distinct projectId) / `carousel_image_generation_completed` | Eventos 27, 24 | Diária | — (métrica descritiva) |
| **% de carrosséis gerados que são salvos** | `carousel_saved_to_media` / `carousel_image_generation_completed` | Eventos 28, 24 | Diária | > 50% |
| **% de carrosséis gerados que são agendados** | `carousel_post_scheduled` / `carousel_image_generation_completed` | Eventos 29, 24 | Diária | > 25% |
| **Tempo médio do carrossel "ideia → agendamento"** | Média de `carousel_post_scheduled` - `idea_approved` por projectId | Eventos 14, 29 | Diária | < 2h |
| **Abandono por etapa do funil** | Queda percentual entre etapas consecutivas do funil (seção 3) | Eventos 1-30 | Semanal | < 20% por etapa |

### 2.2 Métricas de Custo

| KPI | Fórmula | Fonte de dados | Frequência | Alvo sugerido |
|-----|---------|---------------|-----------|---------------|
| **Custo médio por carrossel gerado** | Soma(`carousel_slide_image_generated.cost`) + custo texto / count(`carousel_image_generation_completed`) | Eventos 23, 43 (texto), Tabela `GenerationCost` | Diária | < $0.50/carrossel |
| **Custo por tipo de operação** | Soma(custo) por `operationType` (text_idea / text_plan / text_review / text_caption / image_generation) | Evento 49, Tabela `GenerationCost` | Diária | — |
| **Custo por modelo/provider** | Soma(custo) por `model` + `provider` | Evento 49 | Diária | — |
| **Custo por organização** | Soma(custo) por `organizationId` no período | Evento 49 | Diária | Por plano |
| **Custo incremental por slide extra** | (Custo carrossel com N slides - Custo carrossel com N-1 slides) | Eventos 18, 23 | Semanal | < $0.10/slide |
| **Custo projetado mensal** | Soma(custo últimas 24h) × 30 ou média móvel 7d × 30 | Evento 49 | Diária | — |

### 2.3 Métricas Técnicas

| KPI | Fórmula | Fonte de dados | Frequência | Alvo sugerido |
|-----|---------|---------------|-----------|---------------|
| **P95 de criação de plano textual** | P95 da duração de `carousel_plan_generated.durationMs` | Evento 19 | Por deploy / semanal | < 10s |
| **P95 de geração por slide (imagem)** | P95 de `carousel_slide_image_generated.durationMs` | Evento 23 | Por deploy / semanal | < 15s |
| **Taxa de erro por provider** | `generation_job_failed` / `generation_job_started` agrupado por `provider` | Eventos 42, 44 | Horária | < 5% |
| **Taxa de erro por modelo** | `generation_job_failed` / `generation_job_started` agrupado por `model` | Eventos 42, 44 | Horária | < 5% |
| **Taxa de reprocessamento por job** | `generation_job_retried` / `generation_job_started` | Eventos 45, 42 | Horária | < 10% |
| **P95 de retries por job** | P95 de `retryCount` em `generation_job_completed` | Evento 43 | Diária | < 3 |
| **Dead letters por hora** | Count(`generation_job_dead_letter`) / hora | Evento 46 | Horária | < 1/hora |
| **Tempo médio de job completo** | Média de `durationMs` em `generation_job_completed` por `jobType` | Evento 43 | Diária | — |
| **Tempo na fila (backlog)** | Média/mediana de `generation_job_started.ts` - `generation_job_queued.ts` | Eventos 41, 42 | Horária | < 30s |
| **Uso de tokens por operação** | Média e P95 de `totalTokens` por `operationType` | Evento 49 | Diária | — |
| **Concorrência ativa por organização** | Count(`generation_job_started` sem `generation_job_completed`) por org | Eventos 42, 43 | Minuto a minuto | Por plano |

### 2.4 Métricas de Performance de Template / Nicho / Canal

| KPI | Fórmula | Fonte de dados | Frequência | Alvo sugerido |
|-----|---------|---------------|-----------|---------------|
| **Engagement rate por template** | Média `engagementRate` por `template` em `carousel_performance_collected` | Evento 39 | Semanal | — |
| **Saves por template** | Média `saves` por `template` | Evento 39 | Semanal | — |
| **Engagement rate por canal** | Média `engagementRate` por `channel` | Evento 39 | Semanal | — |
| **Engagement rate por nicho** | Média `engagementRate` por indústria da marca | Evento 39 + BrandProfile | Semanal | — |
| **Taxa de aprovação por template** | `idea_approved` / `ideas_generation_completed.ideasCount` por `template` | Eventos 12, 14 | Semanal | — |
| **Melhor template por canal** | Template com maior `engagementRate` em cada `channel` | Evento 39 | Mensal | — |

---

## 3. Funil Principal

O funil abaixo representa o caminho crítico do usuário e onde medir abandono.

```
                   ┌─────────────────────────────┐
                   │   Visita / Signup            │  ← Evento: signup / pageview
                   └──────────┬──────────────────┘
                              │
                   ┌──────────▼──────────────────┐
                   │   Inicia onboarding brand    │  ← Evento 1: brand_onboarding_started
                   │   Informa site + nome        │     ★ TAXA: % que chega aqui de signup
                   └──────────┬──────────────────┘
                              │
                   ┌──────────▼──────────────────┐
                   │   URL analisada + DNA gerado │  ← Eventos 3, 5
                   │   IA extrai e sintetiza       │     ★ TAXA: % de URL analisadas que geram DNA
                   └──────────┬──────────────────┘
                              │
                   ┌──────────▼──────────────────┐
                   │   Brand DNA aprovado         │  ← Evento 6: brand_dna_approved
                   │   Usuário revisa e confirma   │     ★ TAXA: % que aprovam vs recebem
                   └──────────┬──────────────────┘
                              │
                   ┌──────────▼──────────────────┐
                   │   Ideia aprovada no swipe    │  ← Evento 14: idea_approved
                   │   Pelo menos 1 ideia          │     ★ TAXA: % que aprovam ≥1 ideia
                   └──────────┬──────────────────┘
                              │
                   ┌──────────▼──────────────────┐
                   │   Carrossel gerado           │  ← Evento 24: carousel_image_generation_completed
                   │   Imagens prontas            │     ★ TAXA: % de ideias que viram carrossel
                   └──────────┬──────────────────┘
                              │
                   ┌──────────▼──────────────────┐
                   │   Carrossel editado/salvo    │  ← Evento 28: carousel_saved_to_media
                   │   (pelo menos salvo)         │     ★ TAXA: % que salvam vs geram
                   └──────────┬──────────────────┘
                              │
                   ┌──────────▼──────────────────┐
                   │   Post agendado / publicado  │  ← Evento 29/30: carousel_post_scheduled
                   │   No calendário              │     ★ TAXA: % que agendam vs salvam
                   └──────────┬──────────────────┘
                              │
                   ┌──────────▼──────────────────┐
                   │   Performance coletada       │  ← Evento 39: carousel_performance_collected
                   │   Loop de melhoria           │     ★ TAXA: % com dados de performance
                   └─────────────────────────────┘
```

### Métricas de funil por coorte

| Etapa | De → Para | Indicador | Cálculo |
|-------|----------|-----------|---------|
| 1 → 2 | Signup → Inicia onboarding | Taxa de ativação de onboarding | `brand_onboarding_started` / signups (7d) |
| 2 → 3 | Onboarding → URL analisada | Taxa de conclusão de análise | `brand_url_analysis_completed` / `brand_onboarding_started` |
| 3 → 4 | URL analisada → DNA aprovado | Taxa de aprovação de DNA | `brand_dna_approved` / `brand_dna_generated` |
| 4 → 5 | DNA aprovado → Ideia aprovada | Taxa de ativação de swipe | `idea_approved` (≥1 por usuário) / `brand_dna_approved` |
| 5 → 6 | Ideia aprovada → Carrossel gerado | Taxa de conversão de ideia | `carousel_image_generation_completed` / `idea_approved` |
| 6 → 7 | Carrossel gerado → Salvo | Taxa de salvamento | `carousel_saved_to_media` / `carousel_image_generation_completed` |
| 7 → 8 | Carrossel salvo → Post agendado | Taxa de agendamento | `carousel_post_scheduled` / `carousel_saved_to_media` |
| 8 → 9 | Post agendado → Dados de performance | Taxa de feedback | `carousel_performance_collected` / `carousel_post_published` |

### Métricas de tempo entre etapas

| Transição | Métrica | Descrição |
|-----------|---------|-----------|
| 1 → 4 | Tempo até ativação (TT Activation) | P50/P95 entre signup e `brand_dna_approved` |
| 4 → 6 | Tempo até primeiro carrossel | P50/P95 entre `brand_dna_approved` e `carousel_image_generation_completed` |
| 6 → 8 | Tempo de edição → agendamento | P50/P95 entre carrossel gerado e post agendado |
| 1 → 8 | Tempo até primeiro post (TT First Post) | **KPI combinado** — P50/P95 entre signup e `carousel_post_scheduled` |

---

## 4. Painéis Mínimos

### 4.1 Painel do Operador (Suporte / Infra)

Foco: jobs, erros, custo, saúde dos providers.

| Card | Gráfico / Métrica | Fonte | Atualização |
|------|-------------------|-------|-------------|
| Jobs ativos agora | Número total de `generation_job_started` sem completion | Eventos 42, 43 | Tempo real |
| Jobs na fila | Backlog Temporal: jobs `queued` há mais de 1 min | Evento 41 | 1 min |
| Dead letters (última 1h) | Count(`generation_job_dead_letter`) | Evento 46 | 1 min |
| Taxa de erro por provider | Barras empilhadas: `generation_job_failed` / total por provider | Eventos 42, 44 | 5 min |
| P95 de duração por job type | Gráfico de linhas: P95 de durationMs por jobType | Eventos 43 | 5 min |
| Circuit breakers abertos | Lista de providers com circuit breaker aberto | Evento 47 | Tempo real |
| Custo por organização (hoje) | Barras: top 10 orgs por custo no dia | Evento 49, tabela GenerationCost | 1 hora |
| Tabela de retries | Lista de jobs com >3 retries nas últimas 24h | Evento 45 | 1 hora |

### 4.2 Painel de Produto (PM / Growth)

Foco: ativação, funil, qualidade, retenção.

| Card | Gráfico / Métrica | Fonte | Atualização |
|------|-------------------|-------|-------------|
| Funil principal (coorte 7d) | Barras horizontais: conversão etapa a etapa | Eventos 1-30 | Diária |
| Tempo até primeiro carrossel (P50/P95) | Gráfico de linhas por semana | Eventos 1, 24 | Semanal |
| Taxa de aprovação no swipe | % aprovação por dia/semana | Eventos 14, 15 | Diária |
| % DNA completo | % de signups que chegam ao `brand_dna_approved` | Eventos 1, 6 | Semanal |
| Custo médio por carrossel | Média móvel 7d | Evento 23, tabela GenerationCost | Diária |
| Carrosséis gerados por dia | Barras: total de `carousel_image_generation_completed` | Evento 24 | Diária |
| Carrosséis publicados por dia | Barras: total de `carousel_post_published` | Evento 30 | Diária |
| Top templates por engajamento | Tabela: template / avg engagementRate / saves / n amostras | Evento 39 | Semanal |
| Performance por canal | Barras: engagementRate por channel | Evento 39 | Semanal |
| Abandono por etapa do funil | % queda entre etapas consecutivas no funil | Eventos 1-30 | Semanal |

### 4.3 Painel de Custos (Financeiro / Billing)

Foco: gasto real vs plano, projeção, alertas.

| Card | Gráfico / Métrica | Fonte | Atualização |
|------|-------------------|-------|-------------|
| Custo total do mês (atual) | Soma acumulada do mês corrente | Evento 49 (tabela GenerationCost) | Diária |
| Custo por organização (top 10) | Barras: custo por org no mês | Evento 49 | Diária |
| Custo por tipo de operação | Pizza: texto vs imagem | Evento 49 | Diária |
| Custo por provider | Barras: OpenAI vs ia_generate vs outros | Evento 49 | Diária |
| Projeção mensal | (Média diária últimos 7d) × dias restantes | Evento 49 | Diária |
| Orgs com maior crescimento de custo | Tabela: % aumento vs mês anterior | Evento 49 | Semanal |
| Alerta de soft limit | Lista de orgs que excederam 80% do limite do plano | Evento 49 + Subscription | Diária |
| Alerta de hard limit | Lista de orgs que excederam o limite e foram bloqueadas | Evento 49 + Subscription | Tempo real |

---

## 5. Eventos de Custo

### 5.1 Modelo de Dados

Os eventos de custo devem ser persistidos em uma tabela `GenerationCost` no Prisma (não mais em Map volátil). Cada linha representa uma operação de IA atômica.

```prisma
model GenerationCost {
  id              String   @id @default(uuid())
  organizationId  String
  brandProfileId  String?
  generationJobId String?
  projectId       String?
  operationType   String   // text_idea | text_plan | text_review | text_caption | image_generation | brand_dna | editorial_review
  provider        String   // openai | ia_generate | anthropic | etc.
  model           String   // gpt-4.1-mini | gpt-image-2 | claude-3-haiku | etc.
  promptTokens    Int?
  completionTokens Int?
  totalTokens     Int?
  costUsd         Float
  currency        String   @default("USD")
  metadata        Json?    // { jobType, slideIndex, promptVersion, schemaVersion, durationMs, success, errorType }
  createdAt       DateTime @default(now())

  @@index([organizationId, createdAt])
  @@index([provider, model, createdAt])
  @@index([generationJobId])
  @@index([operationType, createdAt])
}
```

### 5.2 Evento de Custo (Backend)

Sempre que o backend completar uma chamada de IA (seja qual for o provider), deve disparar:

```typescript
// Exemplo de chamada no backend após receber resposta do provider
posthog.capture('token_usage_recorded', {
  distinctId: organizationId, // identificação em nível de org
  organizationId,
  brandProfileId,
  generationJobId,
  projectId,
  operationType,         // text_idea | text_plan | text_review | text_caption | image_generation | brand_dna | editorial_review
  provider,              // openai | ia_generate | anthropic
  model,                 // gpt-4.1-mini | gpt-image-2 | claude-3-haiku
  promptTokens,
  completionTokens,
  totalTokens,
  costUsd,
  currency: 'USD',
  durationMs,
  success: true,
  errorType: null,
});
```

E **também** persistir na tabela `GenerationCost` (que é a fonte de verdade).

### 5.3 Estimativa vs Custo Real

| Conceito | Quando | Como |
|----------|--------|------|
| **Estimativa** | Antes de iniciar o job | Calcular baseado em parâmetros (slideCount, model, provider) e mostrar ao usuário. Usar tabela de preços interna. |
| **Custo real** | Após resposta do provider | Extrair `usage` da resposta da API (quando disponível) ou usar preço fixo conhecido do modelo. |
| **Diferença** | Comparação periódica | Alertar se estimativa vs real divergir >20% para recalibrar tabela de preços. |

### 5.4 Custo por Carrossel — Breakdown Típico

| Operação | Modelo típico | Chamadas | Custo unitário (USD) | Custo total (USD) |
|----------|--------------|----------|---------------------|-------------------|
| Gerar ideias | gpt-4.1-mini | 1 | ~$0.002 | ~$0.002 |
| Gerar plano textual | gpt-4.1-mini | 1 | ~$0.010 | ~$0.010 |
| Revisão editorial | gpt-4.1-mini | 1 | ~$0.005 | ~$0.005 |
| Gerar caption | gpt-4.1-mini | 1 | ~$0.003 | ~$0.003 |
| **Subtotal texto** | — | **4** | — | **~$0.020** |
| Gerar imagem (5 slides) | gpt-image-2 | 5 | ~$0.04-0.10 | ~$0.20-0.50 |
| **Total por carrossel** | — | **9** | — | **~$0.22-0.52** |

### 5.5 Webhook de Custo (Opcional)

Para billing em tempo real, o backend pode disparar um evento webhook quando o custo acumulado de uma organização atingir thresholds configuráveis (ex: 50%, 80%, 100% do limite do plano).

| Threshold | Ação |
|-----------|------|
| 50% do limite | Disparar email/slack de alerta suave |
| 80% do limite | Notificação no dashboard + email |
| 100% do limite (soft) | Bloquear novas gerações, permitir edição de existentes |
| 120% do limite (hard, se configurado) | Bloquear completamente, exceção apenas via suporte |

---

## 6. Referência: Nomes de Propriedades e Boas Práticas

### 6.1 Propriedades Comuns (incluir em todo evento)

| Propriedade | Obrigatória? | Origem | Descrição |
|-------------|-------------|--------|-----------|
| `organizationId` | Sim | Contexto do usuário OR backend via token JWT | ID da organização |
| `userId` | Sim | `useUser()` (frontend) ou token JWT (backend) | ID do usuário autenticado |
| `brandProfileId` | Quando aplicável | Estado da aplicação OR body da requisição | ID da marca ativa |
| `timestamp` | Automático | PostHog/Plausible preenchem | Timestamp do evento |

### 6.2 Convenções de Nomenclatura

- **Formato:** `dominio_acao` em snake_case baixo
- **Domínios:** `brand_`, `idea_`, `carousel_`, `editorial_`, `generation_`, `provider_`, `token_`, `approval_`, `auto_generation_`
- **Ações comuns:** `_started`, `_completed`, `_failed`, `_approved`, `_rejected`, `_saved`, `_scheduled`, `_published`, `_edited`, `_opened`, `_exported`

### 6.3 Boas Práticas

1. **Nunca logar dados sensíveis**: tokens, prompts completos, senhas, chaves de API, dados pessoais → usar hashes ou IDs internos.
2. **Propriedades mínimas**: cada evento deve ter `organizationId` + identificador do objeto principal (`brandProfileId`, `projectId`, `jobId`).
3. **Eventos de falha são obrigatórios**: toda operação que pode falhar deve ter seu evento de falha correspondente.
4. **Custo sempre incluído**: toda operação de IA deve registrar custo no backend, mesmo que estimado.
5. **Não misturar métricas de frontend e backend**: usar PostHog no frontend para UX/ativação; persistir no banco para custo/performance/auditoria. Ambos disparam eventos de produto.
6. **Testar em staging**: cada evento novo deve ser verificado em staging antes de chegar em produção.
7. **Versionar eventos**: se a estrutura de um evento mudar significativamente, criar novo nome (ex: `carousel_plan_generated_v2`) ou documentar a mudança.

---

## Apêndice A — Mapeamento Rápido: Evento → KPI

| KPI | Evento(s) principal(is) |
|-----|------------------------|
| Tempo até primeiro carrossel | `brand_onboarding_started` + `carousel_image_generation_completed` |
| % Completa Brand DNA | `brand_dna_approved` / `brand_onboarding_started` |
| Taxa de aprovação swipe | `idea_approved` / (`idea_approved` + `idea_rejected`) |
| % Carrossel → Post | `carousel_post_published` / `carousel_image_generation_completed` |
| Custo médio por carrossel | `token_usage_recorded` (sum cost / count distinct projectId) |
| P95 plano textual | `carousel_plan_generated.durationMs` |
| P95 geração slide | `carousel_slide_image_generated.durationMs` |
| Taxa de erro por provider | `generation_job_failed` / `generation_job_started` por provider |
| Dead letters | `generation_job_dead_letter` |
| Engajamento por template | `carousel_performance_collected.engagementRate` por template |
